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
