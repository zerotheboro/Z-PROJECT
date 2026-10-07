const TRAINING_ARRAY_ENCODING_KEY =
  "__edulienceTrainingArrayEncoding";
const TRAINING_ARRAY_ENCODING_VERSION = 1;
const TRAINING_ARRAY_VALUES_KEY = "values";

type PlainRecord = Record<string, unknown>;

function isPlainRecord(
  value: unknown
): value is PlainRecord {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function encodeValue(
  value: unknown,
  isArrayElement: boolean
): unknown {
  if (Array.isArray(value)) {
    const values = value.map(item =>
      encodeValue(item, true)
    );

    if (isArrayElement) {
      return {
        [TRAINING_ARRAY_ENCODING_KEY]:
          TRAINING_ARRAY_ENCODING_VERSION,
        [TRAINING_ARRAY_VALUES_KEY]: values
      };
    }

    return values;
  }

  if (isPlainRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        encodeValue(item, false)
      ])
    );
  }

  return value;
}

function isEncodedArray(
  value: unknown
): value is PlainRecord & { values: unknown[] } {
  if (!isPlainRecord(value)) {
    return false;
  }

  const keys = Object.keys(value);
  return (
    keys.length === 2 &&
    Object.hasOwn(
      value,
      TRAINING_ARRAY_ENCODING_KEY
    ) &&
    Object.hasOwn(value, TRAINING_ARRAY_VALUES_KEY) &&
    value[TRAINING_ARRAY_ENCODING_KEY] ===
      TRAINING_ARRAY_ENCODING_VERSION &&
    Array.isArray(value[TRAINING_ARRAY_VALUES_KEY])
  );
}

function decodeValue(value: unknown): unknown {
  if (isEncodedArray(value)) {
    return value.values.map(decodeValue);
  }

  if (Array.isArray(value)) {
    return value.map(decodeValue);
  }

  if (isPlainRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        decodeValue(item)
      ])
    );
  }

  return value;
}

export function encodeFirestoreTrainingDraft(
  value: unknown
): unknown {
  return encodeValue(value, false);
}

export function decodeFirestoreTrainingDraft(
  value: unknown
): unknown {
  return decodeValue(value);
}
