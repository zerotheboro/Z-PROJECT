import {
  useMemo,
  useState
} from "react";

import NAV from "../HEADER/header";

import { auth } from "../firebase";

import {
  saveAssessment
} from "../services/assessment";

import LearningSituation
  from "./sections/LearningSituation";

import BaselineChallenge 
  from "./sections/BaselineChallenge";

import MethodIntroduction
  from "./sections/MethodIntroduction";

import {
  selectMethods
} from "./methodSelector";

import MethodLab
  from "./sections/MethodLab";

import MethodMatchChallenge
  from "./sections/MethodMatchChallenge";

import Reflection
  from "./sections/Reflection";

import {
  buildLearningProfile
} from "./profileBuilder";

import Results
  from "./sections/Results";

import type {
  LearningSituation as LearningSituationData,
  BaselineResult,
  MethodIntroductionResult,
  MethodLabResult,
  MethodMatchResult,
  ReflectionResult,
  LearningProfile
} from "./type";

  




function Assessment() {

  const [section, setSection] =
    useState(1);

  const [baseline, setBaseline] =
    useState<BaselineResult | null>(null);

  const [
    learningSituation,
    setLearningSituation
  ] =
    useState<LearningSituationData | null>(null);

  const [
  methodIntroduction,
  setMethodIntroduction
  ] =
  useState<
    MethodIntroductionResult | null
  >(null);

  
  const [
  methodLab,
  setMethodLab
  ] =
  useState<
    MethodLabResult | null
  >(null);

  const [
  methodMatch,
  setMethodMatch
  ] =
  useState<
    MethodMatchResult | null
  >(null);

  const [
  reflection,
  setReflection
] =
  useState<
    ReflectionResult | null
  >(null);

  const [
  learningProfile,
  setLearningProfile
] =
  useState<LearningProfile | null>(
    null
  );


  const selectedMethods =
  useMemo(() => {

    if (
      !learningSituation ||
      !baseline
    ) {
      return [];
    }

    return selectMethods(
      learningSituation,
      baseline
    );

  }, [
    learningSituation,
    baseline
  ]);


  function handleLearningSituationComplete(
    result: LearningSituationData
  ) {

    console.log(
      "Learning situation:",
      result
    );

    setLearningSituation(result);

    setSection(2);
  }

  return (
    <main className="assessment assessment-v2">
      
      <NAV/>

      {section === 1 && (
        <LearningSituation
          onComplete={
            handleLearningSituationComplete
          }
        />
      )}

      {section === 2 && (
        <BaselineChallenge
          onComplete={(result) => {

            console.log(
              "Baseline:",
              result
            );

            setBaseline(result);

            setSection(3);
          }}
        />
      )}


      {section === 3 &&
    learningSituation &&
    baseline && (

    <MethodIntroduction
      methods={
        selectedMethods
      }

      learningSituation={
        learningSituation
      }

      baseline={
        baseline
      }

      onComplete={(result) => {

        console.log(
          "METHOD INTRODUCTION:",
          result
        );

        setMethodIntroduction(
          result
        );

        setSection(4);
      }}
    />

    )}
      
      {section === 4 &&
  selectedMethods.length > 0 && (

    <MethodLab
      methods={
        selectedMethods
      }

      onComplete={(result) => {

        setMethodLab(result);

        console.log(
          "METHOD LAB COMPLETE:",
          result
        );

        setSection(5);
      }}
    />

)}

      {section === 5 &&
  methodLab && (

  <MethodMatchChallenge
    methodLab={
      methodLab
    }

    onComplete={(result) => {

      console.log(
        "METHOD MATCH:",
        result
      );

      setMethodMatch(result);

      setSection(6);
    }}
  />

  )}

{section === 6 &&
  methodLab &&
  methodMatch && (

    <Reflection
      methodLab={methodLab}
      methodMatch={methodMatch}

      onComplete={async (result) => {

      setReflection(result);

      if (
        !learningSituation ||
        !baseline ||
        !methodIntroduction
      ) {
        return;
      }

      const profile =
        buildLearningProfile({
          baseline,
          methodIntroduction,
          methodLab,
          methodMatch,
          reflection: result
        });

      setLearningProfile(profile);

      const user =
        auth.currentUser;

      if (user) {

        try {

          const assessmentId =
            await saveAssessment({
              userId: user.uid,

              learningSituation,

              baseline,

              methodIntroduction,

              methodLab,

              methodMatch,

              reflection: result,

              learningProfile:
                profile
            });

          console.log(
            "ASSESSMENT SAVED:",
            assessmentId
          );

        } catch (error) {

          console.error(
            "FAILED TO SAVE ASSESSMENT:",
            error
          );

        }
      }

      setSection(7);
    }}
    />
  )}

  {section === 7 &&
  learningProfile && (

    <section className="learning-profile">

      <p>
        ASSESSMENT COMPLETE
      </p>

      <h1>
        Your Learning Profile
      </h1>

      <pre>
        {JSON.stringify(
          learningProfile,
          null,
          2
        )}
      </pre>

    </section>
  )}



    </main>
  );
}

export default Assessment;