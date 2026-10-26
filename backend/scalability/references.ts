import { hash, object, requireContract, text, typedHash } from "./values";

export type GenerationReference = Readonly<{ namespace: "learningEvidence" | "learningEvidenceIdentityEvents" | "generation-artifact";
  id: string; contentHash: string }>;
export function parseGenerationReference(value: unknown): GenerationReference {
  const data = object(value, ["namespace", "id", "contentHash"]);
  requireContract(typeof data.namespace === "string" && ["learningEvidence", "learningEvidenceIdentityEvents", "generation-artifact"].includes(data.namespace));
  text(data.id); requireContract(!(data.id as string).includes("/")); hash(data.contentHash);
  return data as unknown as GenerationReference;
}
export function referenceIdentity(value: GenerationReference): string {
  const reference = parseGenerationReference(value);
  return typedHash("generation-reference-v1", { namespace: reference.namespace, id: reference.id });
}
