import { createSimulation, createAgent } from "simullm";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";

// Action types for ecosystem events
type EcosystemAction =
  | { type: "START_SIMULATION" }
  | { type: "DAILY_CYCLE" }
  | { type: "PREDATOR_HUNT"; predatorId: string }
  | { type: "PREY_FORAGE"; preyId: string }
  | { type: "REPRODUCTION_PHASE" }
  | { type: "ENVIRONMENTAL_EVENT" }
  | { type: "ECOSYSTEM_UPDATE" }
  | { type: "END_SIMULATION" };

// Global ecosystem state
interface EcosystemState {
  // Control flow
  day: number;
  phase:
    | "dawn"
    | "hunting"
    | "foraging"
    | "reproduction"
    | "night"
    | "complete";

  // Environment
  foodAvailability: number; // 0-100
  weatherCondition: "sunny" | "rainy" | "stormy" | "drought";
  temperature: number;

  // Population tracking
  predatorCount: number;
  preyCount: number;
  totalBirths: number;
  totalDeaths: number;

  // Events log
  dailyEvents: string[];
  populationHistory: Array<{ day: number; predators: number; prey: number }>;
}

// Predator internal state
interface PredatorMemory {
  species: string;
  energy: number; // 0-100
  huntingSuccess: number; // 0-1
  age: number;
  territory: { x: number; y: number; radius: number };
  lastHuntResult: "success" | "failure" | "none";
  preyPreference: string[];
}

// Prey internal state
interface PreyMemory {
  species: string;
  energy: number; // 0-100
  alertness: number; // 0-1
  age: number;
  position: { x: number; y: number };
  flockSize: number;
  lastEscapeResult: "escaped" | "caught" | "none";
}

// Environment manager state
interface EnvironmentMemory {
  seasonalCycle: number; // 0-365 days
  carryingCapacity: { predators: number; prey: number };
  disasterProbability: number;
}

// LLM response schemas
const predatorDecisionSchema = z.object({
  reasoning: z.string().describe("Predator's assessment of hunting conditions"),
  action: z
    .enum(["hunt_actively", "ambush", "rest", "patrol_territory", "seek_mate"])
    .describe("Chosen behavior"),
  targetPreyType: z.string().describe("Preferred prey to hunt"),
  energyExpenditure: z
    .number()
    .min(0)
    .max(50)
    .describe("Energy to spend on this action"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence in hunting success"),
});

const preyDecisionSchema = z.object({
  reasoning: z.string().describe("Prey's assessment of danger and needs"),
  action: z
    .enum(["forage", "hide", "flee", "group_up", "reproduce"])
    .describe("Survival strategy"),
  riskTolerance: z
    .number()
    .min(0)
    .max(1)
    .describe("Willingness to take risks for food"),
  groupBehavior: z
    .enum(["stay_with_group", "leave_group", "form_new_group"])
    .describe("Social behavior"),
  confidence: z.number().min(0).max(1).describe("Confidence in survival"),
});

const environmentEventSchema = z.object({
  reasoning: z.string().describe("Environmental factors analysis"),
  eventType: z
    .enum([
      "weather_change",
      "food_abundance",
      "food_scarcity",
      "natural_disaster",
      "seasonal_shift",
    ])
    .describe("Type of environmental event"),
  severity: z.number().min(0).max(1).describe("Impact severity"),
  affectedSpecies: z
    .enum(["predators", "prey", "both"])
    .describe("Who is affected"),
  duration: z.number().min(1).max(7).describe("Event duration in days"),
});

// LLM helper function
async function callLLM<TSchema extends z.ZodTypeAny>(
  prompt: string,
  schema: TSchema
) {
  try {
    const { object } = await generateObject({
      model: openrouter("openai/gpt-4o-mini"),
      prompt,
      schema,
      output: "object",
    });
    return object;
  } catch (error) {
    console.error("LLM call failed:", error);
    throw error;
  }
}

// Example predator-prey ecosystem simulation
// This serves as a reference for testing the prompt generation system