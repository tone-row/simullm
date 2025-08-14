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

// Helper function to calculate distance between positions
function calculateDistance(
  pos1: { x: number; y: number },
  pos2: { x: number; y: number }
): number {
  return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
}

// Predator agent
const createPredator = (id: string, species: string) =>
  createAgent<EcosystemState, EcosystemAction, PredatorMemory>(
    id,
    async (action, context) => {
      const memory = context.internalState as PredatorMemory;

      if (action.type === "PREDATOR_HUNT" && action.predatorId === id) {
        const nearbyPrey = context.allAgents
          .filter((agent) => agent.id.startsWith("prey"))
          .map((agent) => ({
            id: agent.id,
            state: agent.internalState as PreyMemory,
          }))
          .filter(
            (prey) =>
              calculateDistance(
                { x: memory.territory.x, y: memory.territory.y },
                prey.state.position
              ) <= memory.territory.radius
          );

        const prompt = `You are a ${
          memory.species
        } predator in a natural ecosystem.

Current Status:
- Energy: ${memory.energy}/100
- Hunting Success Rate: ${(memory.huntingSuccess * 100).toFixed(1)}%
- Age: ${memory.age} days
- Last Hunt: ${memory.lastHuntResult}
- Territory: Center (${memory.territory.x}, ${memory.territory.y}), Radius: ${
          memory.territory.radius
        }

Environment:
- Day: ${context.globalState.day}
- Weather: ${context.globalState.weatherCondition}
- Food Availability: ${context.globalState.foodAvailability}/100
- Temperature: ${context.globalState.temperature}°C

Nearby Prey: ${nearbyPrey.length} animals detected
${nearbyPrey
  .map(
    (p) =>
      `- ${p.state.species} (Energy: ${p.state.energy}, Alertness: ${p.state.alertness})`
  )
  .join("\n")}

Population Status:
- Predators: ${context.globalState.predatorCount}
- Prey: ${context.globalState.preyCount}

Based on your instincts and current conditions, what is your hunting strategy?`;

        const decision = await callLLM(prompt, predatorDecisionSchema);

        // Process hunting attempt
        let huntSuccess = false;
        let energyGain = 0;

        if (nearbyPrey.length > 0 && decision.action === "hunt_actively") {
          const targetPrey =
            nearbyPrey.find(
              (p) => p.state.species === decision.targetPreyType
            ) || nearbyPrey[0];
          const successChance = Math.max(
            0.1,
            memory.huntingSuccess *
              (1 - targetPrey.state.alertness) *
              decision.confidence
          );

          huntSuccess = Math.random() < successChance;

          if (huntSuccess) {
            energyGain = Math.min(50, targetPrey.state.energy * 0.8);

            // Remove prey from simulation (simplified - in reality would need more complex population management)
            context.updateGlobalState((state) => ({
              ...state,
              preyCount: Math.max(0, state.preyCount - 1),
              totalDeaths: state.totalDeaths + 1,
              dailyEvents: [
                ...state.dailyEvents,
                `${memory.species} ${id} successfully hunted ${targetPrey.state.species}`,
              ],
            }));
          }
        }

        // Update predator state
        const energyChange = huntSuccess
          ? energyGain - decision.energyExpenditure
          : -decision.energyExpenditure;
        const newEnergy = Math.max(
          0,
          Math.min(100, memory.energy + energyChange)
        );

        context.updateInternalState((state: PredatorMemory) => ({
          ...state,
          energy: newEnergy,
          lastHuntResult: huntSuccess ? "success" : "failure",
          huntingSuccess: huntSuccess
            ? Math.min(1, state.huntingSuccess + 0.1)
            : Math.max(0.1, state.huntingSuccess - 0.05),
          age: state.age + 1,
        }));

        console.log(`🦁 ${memory.species} ${id}: ${decision.reasoning}`);
        console.log(
          `   Action: ${decision.action}, Success: ${huntSuccess}, Energy: ${memory.energy} → ${newEnergy}`
        );
      }
    },
    {
      species,
      energy: 80,
      huntingSuccess: 0.3,
      age: 0,
      territory: {
        x: Math.random() * 100,
        y: Math.random() * 100,
        radius: 15,
      },
      lastHuntResult: "none",
      preyPreference: ["rabbit", "deer", "bird"],
    }
  );

// Prey agent
const createPrey = (id: string, species: string) =>
  createAgent<EcosystemState, EcosystemAction, PreyMemory>(
    id,
    async (action, context) => {
      const memory = context.internalState as PreyMemory;

      if (action.type === "PREY_FORAGE" && action.preyId === id) {
        const nearbyPredators = context.allAgents
          .filter((agent) => agent.id.startsWith("predator"))
          .map((agent) => ({
            id: agent.id,
            state: agent.internalState as PredatorMemory,
          }))
          .filter(
            (predator) =>
              calculateDistance(memory.position, {
                x: predator.state.territory.x,
                y: predator.state.territory.y,
              }) <=
              predator.state.territory.radius + 10
          );

        const otherPrey = context.allAgents
          .filter((agent) => agent.id.startsWith("prey") && agent.id !== id)
          .map((agent) => ({
            id: agent.id,
            state: agent.internalState as PreyMemory,
          }))
          .filter(
            (prey) =>
              calculateDistance(memory.position, prey.state.position) <= 20
          );

        const prompt = `You are a ${
          memory.species
        } in a predator-prey ecosystem.

Current Status:
- Energy: ${memory.energy}/100
- Alertness: ${(memory.alertness * 100).toFixed(1)}%
- Age: ${memory.age} days
- Position: (${memory.position.x.toFixed(1)}, ${memory.position.y.toFixed(1)})
- Flock Size: ${memory.flockSize}
- Last Escape: ${memory.lastEscapeResult}

Environment:
- Day: ${context.globalState.day}
- Weather: ${context.globalState.weatherCondition}
- Food Availability: ${context.globalState.foodAvailability}/100
- Temperature: ${context.globalState.temperature}°C

Threats Detected: ${nearbyPredators.length} predators nearby
${nearbyPredators
  .map(
    (p) =>
      `- ${p.state.species} (Energy: ${p.state.energy}, Success Rate: ${(
        p.state.huntingSuccess * 100
      ).toFixed(1)}%)`
  )
  .join("\n")}

Nearby Allies: ${otherPrey.length} other ${memory.species}
${otherPrey
  .slice(0, 3)
  .map(
    (p) =>
      `- Energy: ${p.state.energy}, Alertness: ${(
        p.state.alertness * 100
      ).toFixed(1)}%`
  )
  .join("\n")}

Population Status:
- Your Species: ${context.globalState.preyCount}
- Predators: ${context.globalState.predatorCount}

What is your survival strategy for this moment?`;

        const decision = await callLLM(prompt, preyDecisionSchema);

        // Process foraging/survival actions
        let energyChange = 0;
        let alertnessChange = 0;
        let survived = true;

        switch (decision.action) {
          case "forage":
            energyChange = Math.min(
              30,
              context.globalState.foodAvailability *
                decision.riskTolerance *
                0.4
            );
            alertnessChange = -0.1; // Less alert while focused on eating
            break;
          case "hide":
            energyChange = -5; // Small energy cost for hiding
            alertnessChange = 0.2; // More alert while hiding
            break;
          case "flee":
            energyChange = -15; // High energy cost for fleeing
            alertnessChange = 0.3; // Very alert while fleeing
            break;
          case "group_up":
            energyChange = -2; // Small cost for social coordination
            alertnessChange = 0.1; // Slightly more alert in group
            break;
        }

        // Check if caught by predators (simplified)
        if (
          nearbyPredators.length > 0 &&
          decision.action === "forage" &&
          decision.riskTolerance > 0.7
        ) {
          const catchProbability =
            nearbyPredators.reduce(
              (acc, pred) => acc + pred.state.huntingSuccess * 0.3,
              0
            ) / nearbyPredators.length;

          if (Math.random() < catchProbability) {
            survived = false;
          }
        }

        if (survived) {
          // Update prey state
          const newEnergy = Math.max(
            0,
            Math.min(100, memory.energy + energyChange)
          );
          const newAlertness = Math.max(
            0,
            Math.min(1, memory.alertness + alertnessChange)
          );

          context.updateInternalState((state: PreyMemory) => ({
            ...state,
            energy: newEnergy,
            alertness: newAlertness,
            lastEscapeResult: nearbyPredators.length > 0 ? "escaped" : "none",
            age: state.age + 1,
            flockSize:
              decision.groupBehavior === "stay_with_group"
                ? Math.min(10, state.flockSize + 1)
                : decision.groupBehavior === "leave_group"
                ? Math.max(1, state.flockSize - 1)
                : state.flockSize,
          }));

          console.log(`🐰 ${memory.species} ${id}: ${decision.reasoning}`);
          console.log(
            `   Action: ${decision.action}, Energy: ${
              memory.energy
            } → ${newEnergy}, Alertness: ${(newAlertness * 100).toFixed(1)}%`
          );
        } else {
          context.updateGlobalState((state) => ({
            ...state,
            preyCount: Math.max(0, state.preyCount - 1),
            totalDeaths: state.totalDeaths + 1,
            dailyEvents: [
              ...state.dailyEvents,
              `${memory.species} ${id} was caught by a predator`,
            ],
          }));

          console.log(
            `💀 ${memory.species} ${id} was caught and did not survive`
          );
        }
      }
    },
    {
      species,
      energy: 70,
      alertness: 0.6,
      age: 0,
      position: { x: Math.random() * 100, y: Math.random() * 100 },
      flockSize: Math.floor(Math.random() * 5) + 2,
      lastEscapeResult: "none",
    }
  );

// Environment manager agent
const environmentManager = createAgent<
  EcosystemState,
  EcosystemAction,
  EnvironmentMemory
>(
  "environment",
  async (action, context) => {
    const memory = context.internalState as EnvironmentMemory;

    if (action.type === "ENVIRONMENTAL_EVENT") {
      const prompt = `You are managing a natural ecosystem environment.

Current Conditions:
- Day: ${context.globalState.day}
- Current Weather: ${context.globalState.weatherCondition}
- Food Availability: ${context.globalState.foodAvailability}/100
- Temperature: ${context.globalState.temperature}°C
- Seasonal Day: ${memory.seasonalCycle}/365

Population Status:
- Predators: ${context.globalState.predatorCount}/${
        memory.carryingCapacity.predators
      }
- Prey: ${context.globalState.preyCount}/${memory.carryingCapacity.prey}

Recent Events: ${context.globalState.dailyEvents.slice(-3).join("; ")}

Based on natural patterns, seasonal cycles, and population dynamics, what environmental event should occur?`;

      const event = await callLLM(prompt, environmentEventSchema);

      // Apply environmental effects
      let foodChange = 0;
      let weatherChange = context.globalState.weatherCondition;
      let tempChange = 0;

      switch (event.eventType) {
        case "weather_change":
          const weathers = ["sunny", "rainy", "stormy", "drought"] as const;
          weatherChange = weathers[Math.floor(Math.random() * weathers.length)];
          break;
        case "food_abundance":
          foodChange = event.severity * 30;
          break;
        case "food_scarcity":
          foodChange = -event.severity * 40;
          break;
        case "natural_disaster":
          foodChange = -event.severity * 50;
          // Disasters can affect populations directly
          if (event.severity > 0.7) {
            context.updateGlobalState((state) => ({
              ...state,
              predatorCount: Math.max(
                1,
                Math.floor(state.predatorCount * (1 - event.severity * 0.3))
              ),
              preyCount: Math.max(
                2,
                Math.floor(state.preyCount * (1 - event.severity * 0.2))
              ),
            }));
          }
          break;
        case "seasonal_shift":
          tempChange = (Math.random() - 0.5) * 10;
          foodChange =
            Math.sin((memory.seasonalCycle / 365) * 2 * Math.PI) * 20;
          break;
      }

      context.updateGlobalState((state) => ({
        ...state,
        foodAvailability: Math.max(
          0,
          Math.min(100, state.foodAvailability + foodChange)
        ),
        weatherCondition: weatherChange,
        temperature: Math.max(
          -10,
          Math.min(40, state.temperature + tempChange)
        ),
        dailyEvents: [
          ...state.dailyEvents,
          `Environmental event: ${event.eventType} (severity: ${(
            event.severity * 100
          ).toFixed(0)}%)`,
        ],
      }));

      context.updateInternalState((state: EnvironmentMemory) => ({
        ...state,
        seasonalCycle: (state.seasonalCycle + 1) % 365,
        disasterProbability: Math.max(
          0.01,
          Math.min(
            0.1,
            state.disasterProbability + (Math.random() - 0.5) * 0.01
          )
        ),
      }));

      console.log(`🌍 Environment: ${event.reasoning}`);
      console.log(
        `   Event: ${event.eventType}, Severity: ${(
          event.severity * 100
        ).toFixed(0)}%, Food: ${context.globalState.foodAvailability}`
      );
    }
  },
  {
    seasonalCycle: 0,
    carryingCapacity: { predators: 8, prey: 25 },
    disasterProbability: 0.05,
  }
);

// Ecosystem facilitator for control flow
const ecosystemFacilitator = createAgent<
  EcosystemState,
  EcosystemAction,
  { currentPhase: string }
>(
  "facilitator",
  async (action, context) => {
    if (action.type === "START_SIMULATION") {
      console.log("🌅 Starting ecosystem simulation...");
      context.updateGlobalState((state) => ({
        ...state,
        phase: "dawn",
      }));

      setTimeout(() => {
        context.dispatch({ type: "DAILY_CYCLE" });
      }, 1000);
    }

    if (action.type === "DAILY_CYCLE") {
      context.updateGlobalState((state) => ({
        ...state,
        day: state.day + 1,
        phase: "hunting",
        dailyEvents: [],
        populationHistory: [
          ...state.populationHistory,
          {
            day: state.day,
            predators: state.predatorCount,
            prey: state.preyCount,
          },
        ],
      }));

      console.log(
        `\n📅 Day ${context.globalState.day} begins - Population: ${context.globalState.predatorCount} predators, ${context.globalState.preyCount} prey`
      );

      // Start hunting phase
      setTimeout(() => {
        const predators = context.allAgents.filter((a) =>
          a.id.startsWith("predator")
        );
        predators.forEach((predator, index) => {
          setTimeout(() => {
            context.dispatch({
              type: "PREDATOR_HUNT",
              predatorId: predator.id,
            });
          }, index * 500);
        });
      }, 1000);

      // Start foraging phase
      setTimeout(() => {
        context.updateGlobalState((state) => ({ ...state, phase: "foraging" }));
        const prey = context.allAgents.filter((a) => a.id.startsWith("prey"));
        prey.forEach((preyAnimal, index) => {
          setTimeout(() => {
            context.dispatch({ type: "PREY_FORAGE", preyId: preyAnimal.id });
          }, index * 300);
        });
      }, 3000);

      // Environmental events
      setTimeout(() => {
        context.dispatch({ type: "ENVIRONMENTAL_EVENT" });
      }, 5000);

      // Reproduction phase
      setTimeout(() => {
        context.updateGlobalState((state) => ({
          ...state,
          phase: "reproduction",
        }));
        context.dispatch({ type: "REPRODUCTION_PHASE" });
      }, 7000);

      // End of day
      setTimeout(() => {
        context.updateGlobalState((state) => ({ ...state, phase: "night" }));
        context.dispatch({ type: "ECOSYSTEM_UPDATE" });
      }, 9000);
    }

    if (action.type === "REPRODUCTION_PHASE") {
      // Simple reproduction logic
      const predatorReproduction =
        context.globalState.predatorCount < 8 && Math.random() < 0.3;
      const preyReproduction =
        context.globalState.preyCount < 20 && Math.random() < 0.6;

      let newPredators = 0;
      let newPrey = 0;

      if (predatorReproduction) {
        newPredators = Math.floor(Math.random() * 2) + 1;
      }

      if (preyReproduction) {
        newPrey = Math.floor(Math.random() * 4) + 1;
      }

      context.updateGlobalState((state) => ({
        ...state,
        predatorCount: state.predatorCount + newPredators,
        preyCount: state.preyCount + newPrey,
        totalBirths: state.totalBirths + newPredators + newPrey,
        dailyEvents: [
          ...state.dailyEvents,
          ...(newPredators > 0 ? [`${newPredators} new predators born`] : []),
          ...(newPrey > 0 ? [`${newPrey} new prey born`] : []),
        ],
      }));

      if (newPredators > 0 || newPrey > 0) {
        console.log(
          `🐣 Reproduction: +${newPredators} predators, +${newPrey} prey`
        );
      }
    }

    if (action.type === "ECOSYSTEM_UPDATE") {
      // Daily summary
      const events = context.globalState.dailyEvents;
      console.log(`🌙 Day ${context.globalState.day} Summary:`);
      console.log(
        `   Population: ${context.globalState.predatorCount} predators, ${context.globalState.preyCount} prey`
      );
      console.log(
        `   Environment: ${context.globalState.weatherCondition}, Food: ${context.globalState.foodAvailability}/100`
      );
      console.log(
        `   Events: ${events.length > 0 ? events.join("; ") : "Peaceful day"}`
      );

      // Continue simulation or end
      setTimeout(() => {
        if (
          context.globalState.day >= 30 ||
          context.globalState.predatorCount === 0 ||
          context.globalState.preyCount === 0
        ) {
          context.dispatch({ type: "END_SIMULATION" });
        } else {
          context.dispatch({ type: "DAILY_CYCLE" });
        }
      }, 2000);
    }

    if (action.type === "END_SIMULATION") {
      context.updateGlobalState((state) => ({ ...state, phase: "complete" }));

      console.log("\n🏁 Ecosystem Simulation Complete!");
      console.log(
        `Final Population: ${context.globalState.predatorCount} predators, ${context.globalState.preyCount} prey`
      );
      console.log(
        `Total Births: ${context.globalState.totalBirths}, Total Deaths: ${context.globalState.totalDeaths}`
      );
      console.log(`Simulation ran for ${context.globalState.day} days`);
    }
  },
  { currentPhase: "waiting" }
);

// Create simulation with initial ecosystem
const simulation = createSimulation<EcosystemState, EcosystemAction>({
  initialGlobalState: {
    day: 0,
    phase: "dawn",
    foodAvailability: 75,
    weatherCondition: "sunny",
    temperature: 20,
    predatorCount: 3,
    preyCount: 12,
    totalBirths: 0,
    totalDeaths: 0,
    dailyEvents: [],
    populationHistory: [],
  },
  agents: [
    // Predators
    createPredator("predator-1", "wolf"),
    createPredator("predator-2", "hawk"),
    createPredator("predator-3", "fox"),

    // Prey
    createPrey("prey-1", "rabbit"),
    createPrey("prey-2", "rabbit"),
    createPrey("prey-3", "rabbit"),
    createPrey("prey-4", "rabbit"),
    createPrey("prey-5", "deer"),
    createPrey("prey-6", "deer"),
    createPrey("prey-7", "bird"),
    createPrey("prey-8", "bird"),
    createPrey("prey-9", "bird"),
    createPrey("prey-10", "mouse"),
    createPrey("prey-11", "mouse"),
    createPrey("prey-12", "mouse"),

    // System agents
    environmentManager,
    ecosystemFacilitator,
  ],
  shouldExit: (context) => {
    return (
      context.lastAction.type === "END_SIMULATION" ||
      context.globalState.day >= 50 ||
      context.globalState.predatorCount === 0 ||
      context.globalState.preyCount === 0 ||
      context.actionCount >= 1000
    );
  },
});

// Start the ecosystem simulation
console.log("🌿 Initializing predator-prey ecosystem simulation...");
simulation.dispatch({ type: "START_SIMULATION" });
await simulation.exit();
