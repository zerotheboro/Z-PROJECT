import { expect, it } from "vitest";
import { buildExposureIndex, createExposureMetrics } from "../learningEvidenceExposure";
import type { CompletedSessionEvidence } from "../learningEvidence";
import { completedSession } from "./learningEvidenceFixtures";
import { buildReferenceExposureIndex } from "../../../test-support/referenceExposure.stage4i";
import type { MethodId } from "../type";

function representative(seed: number, size = 24): CompletedSessionEvidence[] {
  let random = seed;
  const next = (n: number) => { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return random % n; };
  const methods: MethodId[] = ["active-recall", "feynman", "cornell", "interleaving"];
  return Array.from({ length: size }, (_, i) => {
    const time = new Date(Date.UTC(2026, 9, 10 + next(5))).toISOString();
    const original = completedSession({ id: `indexed-${seed}-${i}`, mode: i % 4 < 2 ? "auto" : "manual",
      methods: methods.slice(0, [3, 4, 1, 3][i % 4]), date: time, correct: 1 + next(4) });
    return { ...original, completedAt: next(3) === 0 ? null : time,
      observations: original.observations.map(o => ({ ...o, completedAt: next(3) === 0 ? null : time,
        context: { ...o.context, contentSetId: next(4) === 0 ? null : `shared-${next(3)}`,
          contentVersion: next(5) === 0 ? null : "1", subject: next(2) ? "Biology" : "Mathematics" },
        protocol: { ...o.protocol, questions: next(4) === 0 ? null : o.protocol.questions }
      })) };
  });
}

it.each([1, 2, 7, 19, 42, 99, 256, 1024, 12345, 98765])("matches every reference field and insertion order for mixed history seed %i", seed => {
  const data = representative(seed);
  for (const records of [data, [...data].reverse(), [...data.slice(7), ...data.slice(0, 7)]]) {
    const actual = buildExposureIndex(records), expected = buildReferenceExposureIndex(records);
    expect(actual).toEqual(expected);
    expect([...actual.byObservation]).toEqual([...expected.byObservation]);
    expect([...actual.reusedContentObservationIds]).toEqual([...expected.reusedContentObservationIds]);
    expect([...actual.reusedQuestionObservationIds]).toEqual([...expected.reusedQuestionObservationIds]);
  }
});

it("preserves empty history and duplicate-ID self exclusion without a pairwise fallback", () => {
  expect(buildExposureIndex([])).toEqual(buildReferenceExposureIndex([]));
  const original = representative(14, 8), duplicate = { ...original[0],
    observations: original[0].observations.map((o, i) => ({ ...o, observationId: original[1].observations[i % original[1].observations.length].observationId })) };
  const data = [...original, original[0], duplicate];
  expect(buildExposureIndex(data)).toEqual(buildReferenceExposureIndex(data));
});

it("keeps Lab-before-Match reliable while preserving tied, overlapping and unknown chronological bounds", () => {
  const records = representative(301, 16);
  const time = "2026-10-20T10:00:00.000Z";
  const tied = records.map((r, i) => ({ ...r, completedAt: i % 3 ? time : null,
    observations: r.observations.map(o => ({ ...o,
      completedAt: i % 4 ? time : null,
      context: { ...o.context, contentSetId: "same-owner-wide-content", contentVersion: "1" } })) }));
  expect(buildExposureIndex(tied)).toEqual(buildReferenceExposureIndex(tied));
});

it("indexes 100/500/1000 sessions with bounded membership and logarithmic query growth", () => {
  const measurements = [100, 500, 1000].map(size => {
    const data = representative(42, size), metrics = createExposureMetrics();
    const result = buildExposureIndex(data, metrics);
    expect(result.byObservation.size).toBe(data.reduce((sum, s) => sum + s.observations.length, 0));
    const work = metrics.indexedMemberships + metrics.sortComparisons + metrics.binarySearchSteps + metrics.relationQueries;
    expect(work).toBeLessThan(metrics.observations * 800);
    return { work, observations: metrics.observations };
  });
  expect(measurements[2].work / measurements[0].work).toBeLessThan(15);
});
