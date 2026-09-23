// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PrimeQuestionExperiment from "../experiments/PrimeQuestionExperiment";
import DoodleEffectExperiment from "../experiments/DoodleEffectExperiment";
import EightyTwentyExperiment from "../experiments/EightyTwentyExperiment";
import DivideStepsExperiment from "../experiments/DivideStepsExperiment";
import DeriveBasicsExperiment from "../experiments/DeriveBasicsExperiment";
import { primeQuestionExperiment, doodleEffectExperiment, eightyTwentyExperiment, divideStepsExperiment, deriveBasicsExperiment } from "../methodLabData";
import { primeQuestionMatchData, doodleEffectMatchData, eightyTwentyMatchData, divideStepsMatchData, deriveBasicsMatchData } from "../methodMatchData";

afterEach(cleanup);

describe("newest method workflows", () => {
  it("primes attention before revealing study material", () => {
    render(<PrimeQuestionExperiment method="prime-question" category="understanding" name="Prime question" data={primeQuestionExperiment} onComplete={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "Start experiment" }));
    expect(screen.queryByText(primeQuestionExperiment.material)).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Write one guiding question..."), { target: { value: "How do the roots protect a coast?" } });
    fireEvent.click(screen.getByRole("button", { name: "Study with this question" }));
    expect(screen.getByText(primeQuestionExperiment.material)).toBeTruthy();
  });

  it("requires a doodle description before reconstruction", () => {
    render(<DoodleEffectExperiment method="doodle-effect" category="understanding" name="the Doodle effect" data={doodleEffectExperiment} onComplete={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "Start experiment" }));
    fireEvent.click(screen.getByRole("button", { name: "Create a doodle" }));
    const button = screen.getByRole("button", { name: "Use my doodle" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Describe your doodle and connections..."), { target: { value: "Arrows connect the grass, consumers, and decomposers." } });
    fireEvent.click(button);
    expect(screen.getByPlaceholderText("Reconstruct the material...")).toBeTruthy();
  });

  it("identifies high-value concepts before prioritizing them", () => {
    render(<EightyTwentyExperiment method="eighty-twenty-rule" category="organization" name="80/20 rule" data={eightyTwentyExperiment} onComplete={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "Start experiment" }));
    fireEvent.click(screen.getByRole("button", { name: "Identify high-value concepts" }));
    fireEvent.change(screen.getByPlaceholderText("Identify the high-value concepts..."), { target: { value: "Accepted materials, clear bins, guidance, and collection." } });
    fireEvent.click(screen.getByRole("button", { name: "Prioritize them" }));
    expect(screen.getByPlaceholderText("Rank the concepts and explain your order...")).toBeTruthy();
  });

  it("divides a process before organizing its sequence", () => {
    render(<DivideStepsExperiment method="divide-steps" category="organization" name="divide steps" data={divideStepsExperiment} onComplete={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "Start experiment" }));
    fireEvent.click(screen.getByRole("button", { name: "Divide the process" }));
    fireEvent.change(screen.getByPlaceholderText("List the smaller steps..."), { target: { value: "Introduce, review, debate, reconcile, and approve the bill." } });
    fireEvent.click(screen.getByRole("button", { name: "Organize the sequence" }));
    expect(screen.getByPlaceholderText("Organize the steps in order...")).toBeTruthy();
  });

  it("identifies basics before deriving the higher-level idea", () => {
    render(<DeriveBasicsExperiment method="derive-basics" category="understanding" name="derive basics" data={deriveBasicsExperiment} onComplete={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "Start experiment" }));
    fireEvent.click(screen.getByRole("button", { name: "Identify the basics" }));
    fireEvent.change(screen.getByPlaceholderText("Identify the basic principles..."), { target: { value: "Density, displaced water, weight, and buoyant force are the basics." } });
    fireEvent.click(screen.getByRole("button", { name: "Derive the idea" }));
    expect(screen.getByPlaceholderText("Derive the higher-level idea...")).toBeTruthy();
  });

  it("uses unseen verification topics for all five methods", () => {
    expect(primeQuestionMatchData.topic).not.toBe(primeQuestionExperiment.topic);
    expect(doodleEffectMatchData.topic).not.toBe(doodleEffectExperiment.topic);
    expect(eightyTwentyMatchData.topic).not.toBe(eightyTwentyExperiment.topic);
    expect(divideStepsMatchData.topic).not.toBe(divideStepsExperiment.topic);
    expect(deriveBasicsMatchData.topic).not.toBe(deriveBasicsExperiment.topic);
  });
});
