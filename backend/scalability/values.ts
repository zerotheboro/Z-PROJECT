import { createHash } from "node:crypto";

/** Offline wire values only. No Firebase, environment, clock or network access. */
export type JSONValue = null | boolean | number | string | readonly JSONValue[] | { readonly [key: string]: JSONValue };
export const CONTRACT_LIMITS = Object.freeze({ depth: 20, nodes: 50_000, recordBytes: 128 * 1024,
  pageRecords: 50, pageBytes: 256 * 1024, descriptors: 128, manifestBytes: 192 * 1024 });
export class ScalabilityContractError extends Error {
  constructor(public readonly code: string) { super(code); this.name = "ScalabilityContractError"; }
}
export function requireContract(condition: unknown, code = "invalid_contract"): asserts condition {
  if (!condition) throw new ScalabilityContractError(code);
}
/** Reject, never repair, text that cannot round-trip through Firestore UTF-8. */
export function wellFormedText(value: string): void {
  requireContract(typeof value === "string", "invalid_text");
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++index);
      requireContract(next >= 0xdc00 && next <= 0xdfff, "invalid_unicode");
    } else requireContract(unit < 0xdc00 || unit > 0xdfff, "invalid_unicode");
  }
}
export const utf8Bytes = (value: string): number => { wellFormedText(value); return Buffer.byteLength(value, "utf8"); };

/** Copy before freezing. Reject accessors, custom prototypes, sparse arrays,
 * non-JSON values and cycles rather than invoking toJSON or losing properties. */
export function copyJSON(value: unknown): JSONValue {
  let nodes = 0, rawBytes = 0;
  const ancestors = new Set<object>();
  function budget(value: string) {
    rawBytes += utf8Bytes(value); requireContract(rawBytes <= CONTRACT_LIMITS.pageBytes, "byte_limit");
  }
  function visit(item: unknown, depth: number): JSONValue {
    requireContract(++nodes <= CONTRACT_LIMITS.nodes && depth <= CONTRACT_LIMITS.depth, "structure_limit");
    if (typeof item === "string") { budget(item); return item; }
    if (item === null || typeof item === "boolean") return item;
    if (typeof item === "number") { requireContract(Number.isFinite(item), "invalid_number"); return item; }
    requireContract(typeof item === "object" && !ancestors.has(item), "non_json_value");
    ancestors.add(item);
    let result: JSONValue;
    if (Array.isArray(item)) {
      requireContract(item.length <= CONTRACT_LIMITS.nodes && Reflect.ownKeys(item).length === item.length + 1, "invalid_array");
      result = Object.freeze(Array.from({ length: item.length }, (_, index) => {
        const descriptor = Object.getOwnPropertyDescriptor(item, String(index));
        requireContract(descriptor && "value" in descriptor && descriptor.enumerable, "invalid_array");
        return visit(descriptor.value, depth + 1);
      }));
    } else {
      requireContract(Object.getPrototypeOf(item) === Object.prototype || Object.getPrototypeOf(item) === null, "non_json_value");
      result = Object.freeze(Object.fromEntries(Reflect.ownKeys(item).map(key => {
        requireContract(typeof key === "string", "non_json_key");
        budget(key);
        const descriptor = Object.getOwnPropertyDescriptor(item, key)!;
        requireContract("value" in descriptor && descriptor.enumerable, "non_json_property");
        return [key, visit(descriptor.value, depth + 1)];
      })));
    }
    ancestors.delete(item);
    return result;
  }
  return visit(value, 0);
}
export function object(value: unknown, keys: readonly string[]): Record<string, JSONValue> {
  const copied = copyJSON(value);
  requireContract(copied !== null && typeof copied === "object" && !Array.isArray(copied));
  const result = copied as Record<string, JSONValue>;
  requireContract(Object.keys(result).length === keys.length && keys.every(key => Object.hasOwn(result, key)), "invalid_fields");
  return result;
}
export function text(value: unknown, maxBytes = 256): asserts value is string {
  requireContract(typeof value === "string" && value.trim().length > 0 && utf8Bytes(value) <= maxBytes, "invalid_text");
}
export function integer(value: unknown, minimum = 0): asserts value is number {
  requireContract(typeof value === "number" && Number.isSafeInteger(value) && !Object.is(value, -0) && value >= minimum, "invalid_integer");
}
export function hash(value: unknown): asserts value is string {
  requireContract(typeof value === "string" && /^[a-f0-9]{64}$/.test(value), "invalid_hash");
}
export function timestamp(value: unknown): asserts value is string {
  // Protocol timestamps are canonical UTC milliseconds. Historical unknowns must
  // be explicit null, not coerced from an ambiguous string or ingestion time.
  requireContract(typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value, "invalid_timestamp");
}
export function canonicalJSON(value: unknown): string {
  function encode(item: JSONValue): string {
    if (Array.isArray(item)) return `[${item.map(encode).join(",")}]`;
    if (item !== null && typeof item === "object") return `{${Object.keys(item).sort().map(key =>
      `${JSON.stringify(key)}:${encode((item as Record<string, JSONValue>)[key])}`).join(",")}}`;
    return JSON.stringify(item);
  }
  return encode(copyJSON(value));
}
export const jsonBytes = (value: unknown): number => utf8Bytes(canonicalJSON(value));
/** Domain-separated and container/scalar-tagged. An ordinary map cannot
 * impersonate a type tag. Missing, undefined and null are never conflated. */
export function typedHashInput(domain: string, value: unknown): string {
  text(domain, 128);
  function tag(item: JSONValue): JSONValue {
    if (item === null) return ["null"];
    if (Array.isArray(item)) return ["array", item.map(tag)];
    if (typeof item === "object") return ["map", Object.keys(item).sort().map(key =>
      [key, tag((item as Record<string, JSONValue>)[key])])];
    return [typeof item, typeof item === "number" && Object.is(item, -0) ? "-0" : item];
  }
  // Encoding the tagged representation directly avoids applying the input depth
  // limit a second time to the deeper, internal representation.
  return JSON.stringify(["edulience-scalability", 1, domain, tag(copyJSON(value))]);
}
export const typedHash = (domain: string, value: unknown): string =>
  createHash("sha256").update(typedHashInput(domain, value), "utf8").digest("hex");
export function bounded<T>(value: T, maximum: number): T {
  requireContract(jsonBytes(value) <= maximum, "byte_limit"); return value;
}
export function compareRevisions(left: number, right: number): -1 | 0 | 1 {
  integer(left); integer(right); return left < right ? -1 : left > right ? 1 : 0;
}
export function nextRevision(value: number): number {
  integer(value); requireContract(value < Number.MAX_SAFE_INTEGER, "revision_exhausted"); return value + 1;
}
