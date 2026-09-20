import type {
  MethodExperimentResult,
  MethodId
} from "./type";

export function selectMethodsForVerification(
  experiments: MethodExperimentResult[]
): MethodId[] {

  const ranked = [...experiments]
    .map((experiment) => {

      /*
        Internal ranking only.

        Performance matters most.
        Ease / confidence / willingness
        are secondary.
      */

      const performance =
        experiment.score ?? 0;

      const confidence =
        experiment.confidence / 5;

      const ease =
        experiment.ease / 5;

      const willingness =
        experiment.willingnessToUse / 5;

      const internalScore =
        performance * 0.65 +
        confidence * 0.15 +
        ease * 0.10 +
        willingness * 0.10;

      return {
        method: experiment.method,
        internalScore
      };

    })
    .sort(
      (a, b) =>
        b.internalScore -
        a.internalScore
    );

  return ranked
    .slice(0, 2)
    .map(
      (item) => item.method
    );
}