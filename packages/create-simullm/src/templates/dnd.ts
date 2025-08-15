import { createSimulation, createAgent } from "simullm";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";

// Action types for the D&D game
type GameAction =
  | { type: "START_GAME" }
  | { type: "GM_DESCRIBE_SITUATION" }
  | { type: "ADVENTURER_TURN"; adventurerId: string }
  | { type: "GM_RESOLVE_ACTIONS" }
  | { type: "ROUND_COMPLETE" }
  | { type: "GAME_END" };

// Global game state
interface GameState {
  round: number;
  phase:
    | "waiting"
    | "gm_describing"
    | "adventurer_turns"
    | "gm_resolving"
    | "complete";
  currentAdventurerIndex: number;
  situation: string;
  adventurerActions: Array<{ adventurer: string; action: string }>;
  gameLog: string[];
  maxRounds: number;
}

// Adventurer memory
interface AdventurerMemory {
  name: string;
  class: string;
  personality: string;
  equipment: string[];
  currentHP: number;
}

// Game Master memory
interface GMMemory {
  currentScenario: string;
  difficulty: string;
  npcs: string[];
}

// LLM response schemas
const gmDescriptionSchema = z.object({
  reasoning: z.string().describe("GM's reasoning for the situation"),
  situation: z.string().describe("Vivid description of the current situation"),
  tone: z.string().describe("The mood/atmosphere of the scene"),
});

const adventurerActionSchema = z.object({
  reasoning: z.string().describe("Character's thought process"),
  action: z.string().describe("What the adventurer wants to do"),
  roleplay: z.string().describe("How they express this in character"),
});

const gmResolutionSchema = z.object({
  reasoning: z.string().describe("GM's reasoning for outcomes"),
  resolution: z.string().describe("Results of all adventurer actions"),
  newSituation: z.string().describe("How the situation has changed"),
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

// Game Master agent
const gameMaster = createAgent<GameState, GameAction, GMMemory>(
  "gm",
  async (action, context) => {
    const gmMemory = context.internalState as GMMemory;

    if (action.type === "GM_DESCRIBE_SITUATION") {
      const isFirstRound = context.globalState.round === 1;

      const prompt = isFirstRound
        ? `You are a D&D Game Master starting a new adventure. Create an engaging opening scenario for a party of adventurers.
        
Current scenario context: ${gmMemory.currentScenario}
Party composition: ${context.allAgents
            .filter((a) => a.id !== "gm" && a.id !== "facilitator")
            .map((a) => `${a.internalState.name} the ${a.internalState.class}`)
            .join(", ")}

Describe the initial situation that will hook the players and give them clear options for action. Keep it concise but vivid.`
        : `You are a D&D Game Master continuing an adventure. 
        
Previous situation: ${context.globalState.situation}
Recent actions taken: ${context.globalState.adventurerActions
            .map((a) => `${a.adventurer}: ${a.action}`)
            .join("; ")}
Current scenario: ${gmMemory.currentScenario}

Describe the current situation after the previous round's events. What do the adventurers see/hear/feel now?`;

      const response = await callLLM(prompt, gmDescriptionSchema);

      console.log(`\n=== ROUND ${context.globalState.round} ===`);
      console.log(`GM: ${response.situation}`);

      context.updateGlobalState((state) => ({
        ...state,
        situation: response.situation,
        gameLog: [
          ...state.gameLog,
          `Round ${state.round} - GM: ${response.situation}`,
        ],
        phase: "adventurer_turns" as const,
        currentAdventurerIndex: 0,
        adventurerActions: [],
      }));
    }

    if (action.type === "GM_RESOLVE_ACTIONS") {
      const actions = context.globalState.adventurerActions;

      const prompt = `You are a D&D Game Master resolving player actions.

Current situation: ${context.globalState.situation}
Adventurer actions this round:
${actions.map((a) => `- ${a.adventurer}: ${a.action}`).join("\n")}

Scenario context: ${gmMemory.currentScenario}
Difficulty: ${gmMemory.difficulty}

Resolve these actions with appropriate consequences. Be fair but add some challenge or interesting twists. Describe the results dramatically.`;

      const response = await callLLM(prompt, gmResolutionSchema);

      console.log(`\nGM resolves: ${response.resolution}`);

      context.updateGlobalState((state) => ({
        ...state,
        situation: response.newSituation,
        gameLog: [...state.gameLog, `GM Resolution: ${response.resolution}`],
        phase: "gm_resolving" as const,
      }));

      context.updateInternalState((state: GMMemory) => ({
        ...state,
        currentScenario: response.newSituation,
      }));
    }
  },
  {
    currentScenario:
      "The adventurers approach a mysterious ancient temple in a dark forest",
    difficulty: "moderate",
    npcs: ["Temple Guardian", "Forest Spirits"],
  }
);

// Create adventurer agents
const createAdventurer = (
  name: string,
  characterClass: string,
  personality: string
) => {
  return createAgent<GameState, GameAction, AdventurerMemory>(
    name.toLowerCase().replace(" ", "-"),
    async (action, context) => {
      if (
        action.type === "ADVENTURER_TURN" &&
        action.adventurerId === name.toLowerCase().replace(" ", "-")
      ) {
        const memory = context.internalState as AdventurerMemory;

        const prompt = `You are ${memory.name}, a ${
          memory.class
        } with this personality: ${memory.personality}

Current situation: ${context.globalState.situation}

Equipment: ${memory.equipment.join(", ")}
Current HP: ${memory.currentHP}

Previous actions this round: ${context.globalState.adventurerActions
          .map((a) => `${a.adventurer}: ${a.action}`)
          .join("; ")}

What do you want to do in this situation? Be creative and stay in character. Consider your class abilities and equipment.`;

        const response = await callLLM(prompt, adventurerActionSchema);

        console.log(`${memory.name}: "${response.roleplay}"`);
        console.log(`Action: ${response.action}`);

        context.updateGlobalState((state) => ({
          ...state,
          adventurerActions: [
            ...state.adventurerActions,
            {
              adventurer: memory.name,
              action: response.action,
            },
          ],
          gameLog: [...state.gameLog, `${memory.name}: ${response.action}`],
        }));

        context.updateInternalState((state: AdventurerMemory) => ({
          ...state,
          // Could update HP, equipment, etc. based on actions
        }));
      }
    },
    {
      name,
      class: characterClass,
      personality,
      equipment:
        characterClass === "Fighter"
          ? ["Sword", "Shield", "Armor"]
          : characterClass === "Wizard"
          ? ["Spellbook", "Staff", "Robes"]
          : characterClass === "Rogue"
          ? ["Daggers", "Lockpicks", "Cloak"]
          : ["Bow", "Arrows", "Leather Armor"],
      currentHP: 20,
    }
  );
};

// Create the adventuring party
const fighter = createAdventurer(
  "Thorin",
  "Fighter",
  "brave and protective, always ready to charge into danger"
);
const wizard = createAdventurer(
  "Elara",
  "Wizard",
  "curious and analytical, prefers magical solutions"
);
const rogue = createAdventurer(
  "Shade",
  "Rogue",
  "sneaky and clever, looks for unconventional approaches"
);

// Facilitator agent for game flow control
const facilitator = createAgent<GameState, GameAction, { phase: string }>(
  "facilitator",
  async (action, context) => {
    if (action.type === "START_GAME") {
      context.updateGlobalState((state) => ({
        ...state,
        round: 1,
        phase: "gm_describing" as const,
      }));

      setTimeout(() => {
        context.dispatch({ type: "GM_DESCRIBE_SITUATION" });
      }, 1000);
    }

    if (action.type === "GM_DESCRIBE_SITUATION") {
      // After GM describes, start adventurer turns
      setTimeout(() => {
        context.dispatch({ type: "ADVENTURER_TURN", adventurerId: "thorin" });
      }, 2000);
    }

    if (action.type === "ADVENTURER_TURN") {
      const adventurers = ["thorin", "elara", "shade"];
      const currentIndex = adventurers.indexOf(action.adventurerId);
      const nextIndex = currentIndex + 1;

      setTimeout(() => {
        if (nextIndex >= adventurers.length) {
          // All adventurers have acted, GM resolves
          context.dispatch({ type: "GM_RESOLVE_ACTIONS" });
        } else {
          // Next adventurer's turn
          context.dispatch({
            type: "ADVENTURER_TURN",
            adventurerId: adventurers[nextIndex],
          });
        }
      }, 3000);
    }

    if (action.type === "GM_RESOLVE_ACTIONS") {
      setTimeout(() => {
        context.dispatch({ type: "ROUND_COMPLETE" });
      }, 2000);
    }

    if (action.type === "ROUND_COMPLETE") {
      const currentRound = context.globalState.round;

      setTimeout(() => {
        if (currentRound >= context.globalState.maxRounds) {
          context.dispatch({ type: "GAME_END" });
        } else {
          // Start next round
          context.updateGlobalState((state) => ({
            ...state,
            round: state.round + 1,
            phase: "gm_describing" as const,
            currentAdventurerIndex: 0,
          }));
          context.dispatch({ type: "GM_DESCRIBE_SITUATION" });
        }
      }, 1000);
    }

    if (action.type === "GAME_END") {
      console.log("\n=== GAME COMPLETE ===");
      console.log("Thanks for playing this mini D&D adventure!");

      context.updateGlobalState((state) => ({
        ...state,
        phase: "complete" as const,
      }));
    }
  },
  { phase: "waiting" }
);

// Create and run the D&D simulation
const simulation = createSimulation<GameState, GameAction>({
  initialGlobalState: {
    round: 0,
    phase: "waiting" as const,
    currentAdventurerIndex: 0,
    situation: "",
    adventurerActions: [],
    gameLog: [],
    maxRounds: 3,
  },
  agents: [gameMaster, fighter, wizard, rogue, facilitator],
  shouldExit: (context) => {
    return (
      context.lastAction.type === "GAME_END" ||
      context.globalState.round > 3 ||
      context.globalState.phase === "complete" ||
      context.actionCount >= 50
    );
  },
});

// Start the D&D game
console.log("🎲 Starting Minimal D&D Adventure! 🎲");
console.log("Party: Thorin (Fighter), Elara (Wizard), Shade (Rogue)");
console.log("Game Master: Ready to guide the adventure");
console.log("Max Rounds: 3\n");

simulation.dispatch({ type: "START_GAME" });
await simulation.exit();
