import {
  describe,
  expect,
  it
} from "vitest";

import {
  methodRegistry
} from "../methodRegistry";
import {
  TRAINING_METHOD_IDS
} from "../type";

describe("methodRegistry", () => {
  it("contains exactly one complete definition for every TrainingMethodId", () => {
    const registryIds = Object.keys(
      methodRegistry
    );

    expect(registryIds).toEqual([
      ...TRAINING_METHOD_IDS
    ]);
    expect(new Set(registryIds).size).toBe(
      registryIds.length
    );

    TRAINING_METHOD_IDS.forEach((id) => {
      const definition = methodRegistry[id];

      expect(definition.id).toBe(id);
      expect(definition.name.trim()).not.toBe("");
      expect(definition.category).toBeTruthy();
      expect(definition.introduction).toBeTruthy();
      expect(
        definition.introduction.name.trim()
      ).not.toBe("");
      expect(
        definition.introduction.description.trim()
      ).not.toBe("");
      expect(
        definition.introduction.howTo.length
      ).toBeGreaterThan(0);
      expect(definition.renderLab).toEqual(
        expect.any(Function)
      );
      expect(definition.renderMatch).toEqual(
        expect.any(Function)
      );
    });
  });
});
