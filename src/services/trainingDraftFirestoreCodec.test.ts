import {
  deleteApp,
  initializeApp
} from "firebase/app";
import {
  doc,
  getFirestore,
  writeBatch
} from "firebase/firestore";
import {
  describe,
  expect,
  it
} from "vitest";

import {
  decodeFirestoreTrainingDraft,
  encodeFirestoreTrainingDraft
} from "./trainingDraftFirestoreCodec";

function hasDirectNestedArray(value: unknown): boolean {
  if (Array.isArray(value)) {
    return (
      value.some(Array.isArray) ||
      value.some(hasDirectNestedArray)
    );
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    return Object.values(value).some(
      hasDirectNestedArray
    );
  }

  return false;
}

const roundTripCases: readonly [string, unknown][] = [
  ["controller slots", [0, [], ["id"]]],
  ["deeply nested arrays", [[["deep"]]]],
  [
    "arrays beneath maps",
    [{ questions: [["a", "b"]] }]
  ],
  ["ordinary flat arrays", [0, "one", true, null]],
  ["objects containing arrays", {
    valuesByQuestion: {
      question1: ["a", "b", "c"]
    }
  }],
  ["empty arrays", { empty: [] }],
  ["mixed controller state", {
    slots: [0, [], ["active-recall-lab-1"]],
    named: {
      "answer-option-orders": {
        ar1: ["one", "two", "three"]
      }
    }
  }],
  ["representative Lab state", {
    internalState: {
      "lab-controller": {
        slots: [
          0,
          [],
          ["active-recall-lab-1"]
        ],
        named: {}
      }
    }
  }],
  ["representative Match state", {
    internalState: {
      "match-controller": {
        slots: [
          0,
          [],
          ["active-recall-match-1"]
        ],
        named: {}
      }
    }
  }],
  ["answer permutations", {
    named: {
      "answer-option-orders": {
        q1: ["third", "first", "second"],
        q2: ["no", "yes"]
      }
    }
  }]
];

describe("Firestore training-draft array encoding", () => {
  it.each(roundTripCases)(
    "round-trips %s without direct nested arrays",
    (_label, value) => {
      const encoded =
        encodeFirestoreTrainingDraft(value);

      expect(hasDirectNestedArray(encoded)).toBe(false);
      expect(
        decodeFirestoreTrainingDraft(encoded)
      ).toEqual(value);
    }
  );

  it("uses the exact namespaced marker and leaves near-collisions alone", () => {
    expect(
      encodeFirestoreTrainingDraft([0, []])
    ).toEqual([
      0,
      {
        __edulienceTrainingArrayEncoding: 1,
        values: []
      }
    ]);

    const nearCollisions = [
      { values: ["keep"] },
      {
        __edulienceTrainingArrayEncoding: 2,
        values: ["keep"]
      },
      {
        __edulienceTrainingArrayEncoding: 1,
        values: ["keep"],
        applicationField: true
      }
    ];

    for (const value of nearCollisions) {
      expect(
        decodeFirestoreTrainingDraft(value)
      ).toEqual(value);
    }
  });

  it("does not mutate the application value", () => {
    const value = {
      internalState: {
        "lab-controller": {
          slots: [
            0,
            [],
            ["active-recall-lab-1"]
          ],
          named: {}
        }
      }
    };
    const original = structuredClone(value);

    encodeFirestoreTrainingDraft(value);

    expect(value).toEqual(original);
    expect(value.internalState["lab-controller"].slots[1])
      .toEqual([]);
  });

  it("is accepted by the Firebase SDK serializer for the confirmed Lab shape", async () => {
    const app = initializeApp(
      { projectId: "edulience-codec-test" },
      `training-codec-${crypto.randomUUID()}`
    );

    try {
      const database = getFirestore(app);
      const reference = doc(
        database,
        "codecTests",
        "confirmed-lab-shape"
      );
      const encoded = encodeFirestoreTrainingDraft({
        internalState: {
          "lab-controller": {
            slots: [
              0,
              [],
              ["active-recall-lab-1"]
            ],
            named: {}
          }
        }
      }) as Record<string, unknown>;

      expect(() => {
        writeBatch(database).set(reference, encoded);
      }).not.toThrow();
    } finally {
      await deleteApp(app);
    }
  });
});
