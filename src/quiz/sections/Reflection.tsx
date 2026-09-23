import {
  useMemo,
  useState
} from "react";

import {
  getMethodName
} from "../methodRegistry";

import type {
  MethodId,
  MethodLabResult,
  MethodMatchResult,
  ReflectionPriority,
  ReflectionResult
} from "../type";

type Props = {
  methodLab: MethodLabResult;

  methodMatch: MethodMatchResult;

  onComplete: (
    result: ReflectionResult
  ) => void;
};

function Reflection({
  methodLab,
  methodMatch,
  onComplete
}: Props) {

  const [
    preferredMethod,
    setPreferredMethod
  ] =
    useState<MethodId | null>(
      null
    );

  const [
    choseNeither,
    setChoseNeither
  ] =
    useState(false);

  const [
    priority,
    setPriority
  ] =
    useState<
      ReflectionPriority | null
    >(null);

  const [
    surprisedByResults,
    setSurprisedByResults
  ] =
    useState<boolean | null>(
      null
    );

  const [
    reflectionText,
    setReflectionText
  ] =
    useState("");

  /*
    Section 5 focuses on methods
    verified in Section 4.
  */

  const verifiedMethods =
    useMemo(
      () =>
        methodMatch.methods.map(
          (result) =>
            result.method
        ),
      [methodMatch]
    );

  function chooseMethod(
    method: MethodId
  ) {

    setPreferredMethod(method);

    setChoseNeither(false);
  }

  function chooseNeither() {

    setPreferredMethod(null);

    setChoseNeither(true);
  }

  function finishReflection() {

    if (
      !preferredMethod &&
      !choseNeither
    ) {
      return;
    }

    if (
      priority === null ||
      surprisedByResults === null
    ) {
      return;
    }

    const result:
      ReflectionResult = {

      preferredMethod:
        choseNeither
          ? null
          : preferredMethod,

      priority,

      surprisedByResults,

      reflectionText:
        reflectionText.trim()
    };

    console.log(
      "SECTION 5 REFLECTION:",
      result
    );

    console.log(
      "METHOD LAB:",
      methodLab
    );

    console.log(
      "METHOD MATCH:",
      methodMatch
    );

    onComplete(result);
  }

  return (
    <section className="reflection">

      <p>
        SECTION 5 OF 6
      </p>

      <h1>
        Your Reflection
      </h1>

      <p>
        You've now tried several
        learning methods and tested
        your strongest ones again.
      </p>

      <p>
        Before we build your learning
        profile, tell us what the
        experience felt like from
        your side.
      </p>

      {/* ======================= */}
      {/* PREFERRED METHOD */}
      {/* ======================= */}

      <div className="reflection-question">

        <h2>
          Which method would you
          personally be most likely
          to use again?
        </h2>

        <p>
          Don't worry about which one
          you think scored highest.
          Choose based on your own
          experience.
        </p>

        <div className="option-grid">

          {
            verifiedMethods.map(
              (method) => (

                <button
                  type="button"
                  key={method}
                  className={
                    preferredMethod ===
                    method &&
                    !choseNeither
                      ? "assessment-option selected"
                      : "assessment-option"
                  }
                  onClick={() =>
                    chooseMethod(method)
                  }
                >
                  {
                    getMethodName(
                      method
                    )
                  }
                </button>

              )
            )
          }

          <button
            type="button"
            className={
              choseNeither
                ? "assessment-option selected"
                : "assessment-option"
            }
            onClick={
              chooseNeither
            }
          >
            Neither of these
          </button>

        </div>

      </div>

      {/* ======================= */}
      {/* PRIORITY */}
      {/* ======================= */}

      <div className="reflection-question">

        <h2>
          What matters most when you
          choose a study method?
        </h2>

        <div className="option-grid">

          <button
            type="button"
            className={
              priority ===
              "performance"
                ? "assessment-option selected"
                : "assessment-option"
            }
            onClick={() =>
              setPriority(
                "performance"
              )
            }
          >
            It helps me perform better
          </button>

          <button
            type="button"
            className={
              priority ===
              "ease"
                ? "assessment-option selected"
                : "assessment-option"
            }
            onClick={() =>
              setPriority(
                "ease"
              )
            }
          >
            It feels easy to use
          </button>

          <button
            type="button"
            className={
              priority ===
              "confidence"
                ? "assessment-option selected"
                : "assessment-option"
            }
            onClick={() =>
              setPriority(
                "confidence"
              )
            }
          >
            It makes me feel confident
            that I learned properly
          </button>

          <button
            type="button"
            className={
              priority ===
              "realistic-use"
                ? "assessment-option selected"
                : "assessment-option"
            }
            onClick={() =>
              setPriority(
                "realistic-use"
              )
            }
          >
            I can realistically use it
            in everyday studying
          </button>

        </div>

      </div>

      {/* ======================= */}
      {/* SURPRISE */}
      {/* ======================= */}

      <div className="reflection-question">

        <h2>
          Did anything about the methods
          surprise you?
        </h2>

        <div className="option-grid">

          <button
            type="button"
            className={
              surprisedByResults === true
                ? "assessment-option selected"
                : "assessment-option"
            }
            onClick={() =>
              setSurprisedByResults(true)
            }
          >
            Yes
          </button>

          <button
            type="button"
            className={
              surprisedByResults === false
                ? "assessment-option selected"
                : "assessment-option"
            }
            onClick={() =>
              setSurprisedByResults(false)
            }
          >
            No
          </button>

        </div>

      </div>

      {/* ======================= */}
      {/* OPTIONAL COMMENT */}
      {/* ======================= */}

      <div className="reflection-question">

        <h2>
          Anything else you noticed?
        </h2>

        <p>
          Optional
        </p>

        <textarea
          value={
            reflectionText
          }
          onChange={(event) =>
            setReflectionText(
              event.target.value
            )
          }
          placeholder="For example: I remembered more with one method, but another felt easier to use..."
        />

      </div>

      <button
        type="button"
        disabled={
          (
            preferredMethod === null &&
            !choseNeither
          ) ||
          priority === null ||
          surprisedByResults === null
        }
        onClick={
          finishReflection
        }
      >
        Continue
      </button>

    </section>
  );
}

export default Reflection;
