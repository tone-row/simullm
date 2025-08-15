import { startFramework, createGoal } from "@tonerow/agent-framework";
import { z } from "zod";

export const generateCodeGoal = createGoal({
  name: "Generate Code",
  description:
    "Generate reasonably good simullm code from a simulation description",
  input: z.object({
    simulationDescription: z.string(),
  }),
  output: z.object({
    code: z.string(),
    duration: z.number(),
  }),
});

generateCodeGoal.test("predator-prey", {
  simulationDescription: "Create a predator-prey ecosystem simulation",
});

generateCodeGoal.test("market-trading", {
  simulationDescription:
    "Build a market trading simulation with buyers and sellers",
});

generateCodeGoal.test("counter-simulation", {
  simulationDescription:
    "Make a simple counter simulation with multiple agents",
});

generateCodeGoal.test("tiny", {
  simulationDescription:
    "Create the smallest possible simulation to show me how the framework works",
});

generateCodeGoal.test("dnd-game", {
  simulationDescription:
    "Create the most minimal D&D game with a party of adventurers and a game master, that runs for no more than 3 rounds. Where the game master describes a situation, and then each adventurer describes what they'd like to do one at a time (round-robin style) and then the game master describes the result of the adventurers actions. and that repeats for 3 rounds.",
});
