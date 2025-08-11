import { createEventSimulation, createAgent } from "../../lib/simulation.ts";

// Example: Event-driven predator-prey ecosystem
interface EcosystemState {
  rabbits: number;
  foxes: number;
  grass: number;
  turn: number;
  history: {
    rabbits: number[];
    foxes: number[];
    grass: number[];
  };
}

// Define ecosystem actions
type EcosystemAction = 
  | { type: "START" }
  | { type: "TURN_START"; turn: number }
  | { type: "POPULATION_CHANGE"; species: "rabbits" | "foxes"; newCount: number }
  | { type: "RESOURCE_CONSUMED"; resource: "grass"; amount: number }
  | { type: "RESOURCE_GROWN"; resource: "grass"; newAmount: number }
  | { type: "TURN_END"; turn: number };

interface EcosystemFacilitatorState {
  currentTurn: number;
  maxTurns: number;
}

// Ecosystem facilitator manages turns
const ecosystemFacilitator = createAgent<EcosystemState, EcosystemAction, EcosystemFacilitatorState>(
  "facilitator",
  (action, context) => {
    if (action.type === "START") {
      context.updateInternalState(state => ({
        ...state,
        currentTurn: 1
      }));
      context.dispatch({ type: "TURN_START", turn: 1 });
    }
    
    if (action.type === "TURN_END") {
      const currentTurn = context.internalState.currentTurn;
      const nextTurn = currentTurn + 1;
      
      context.updateInternalState(state => ({
        ...state,
        currentTurn: nextTurn
      }));
      
      context.updateGlobalState(state => ({
        ...state,
        turn: nextTurn
      }));
      
      if (nextTurn <= context.internalState.maxTurns) {
        context.dispatch({ type: "TURN_START", turn: nextTurn });
      }
    }
  },
  {
    currentTurn: 0,
    maxTurns: 20,
  }
);

// Rabbit agent: reproduces and eats grass
const rabbitAgent = createAgent<EcosystemState, EcosystemAction>(
  "rabbits",
  (action, context) => {
    if (action.type === "TURN_START") {
      const state = context.globalState;
      const newRabbits = Math.floor(state.rabbits * 1.2); // 20% growth rate
      const grassEaten = Math.min(newRabbits * 0.5, state.grass); // Each rabbit eats 0.5 grass
      
      // Update rabbit population
      context.dispatch({ type: "POPULATION_CHANGE", species: "rabbits", newCount: newRabbits });
      
      // Consume grass
      context.dispatch({ type: "RESOURCE_CONSUMED", resource: "grass", amount: grassEaten });
    }
    
    if (action.type === "POPULATION_CHANGE" && action.species === "rabbits") {
      context.updateGlobalState(state => ({
        ...state,
        rabbits: action.newCount,
        history: {
          ...state.history,
          rabbits: [...state.history.rabbits, action.newCount],
        }
      }));
    }
  }
);

// Fox agent: hunts rabbits and reproduces
const foxAgent = createAgent<EcosystemState, EcosystemAction>(
  "foxes",
  (action, context) => {
    if (action.type === "POPULATION_CHANGE" && action.species === "rabbits") {
      // Foxes react to rabbit population changes
      const state = context.globalState;
      const rabbitsCaught = Math.min(Math.floor(state.foxes * 0.8), action.newCount);
      const newRabbits = Math.max(0, action.newCount - rabbitsCaught);
      const newFoxes = Math.floor(state.foxes * (1 + rabbitsCaught * 0.1));
      
      // Update rabbit population after predation
      context.updateGlobalState(s => ({
        ...s,
        rabbits: newRabbits,
        history: {
          ...s.history,
          rabbits: [...s.history.rabbits.slice(0, -1), newRabbits], // Replace last rabbit count
        }
      }));
      
      // Update fox population
      context.dispatch({ type: "POPULATION_CHANGE", species: "foxes", newCount: newFoxes });
    }
    
    if (action.type === "POPULATION_CHANGE" && action.species === "foxes") {
      context.updateGlobalState(state => ({
        ...state,
        foxes: action.newCount,
        history: {
          ...state.history,
          foxes: [...state.history.foxes, action.newCount],
        }
      }));
    }
  }
);

// Grass agent: gets consumed and regrows
const grassAgent = createAgent<EcosystemState, EcosystemAction>(
  "grass",
  (action, context) => {
    if (action.type === "RESOURCE_CONSUMED" && action.resource === "grass") {
      const newGrass = Math.max(0, context.globalState.grass - action.amount);
      context.dispatch({ type: "RESOURCE_GROWN", resource: "grass", newAmount: newGrass });
    }
    
    if (action.type === "RESOURCE_GROWN" && action.resource === "grass") {
      // Apply natural grass growth
      const grownGrass = Math.min(100, action.newAmount * 1.1); // 10% growth, max 100
      
      context.updateGlobalState(state => ({
        ...state,
        grass: grownGrass,
        history: {
          ...state.history,
          grass: [...state.history.grass, grownGrass],
        }
      }));
      
      // Signal turn end after grass has grown
      context.dispatch({ type: "TURN_END", turn: context.globalState.turn });
    }
  }
);

// Run the ecosystem simulation
export const runEcosystemExample = async () => {
  const simulation = createEventSimulation<EcosystemState, EcosystemAction>({
    initialGlobalState: {
      rabbits: 10,
      foxes: 5,
      grass: 50,
      turn: 0,
      history: {
        rabbits: [10],
        foxes: [5],
        grass: [50],
      },
    },
    agents: [ecosystemFacilitator, rabbitAgent, foxAgent, grassAgent],
  });

  // Start the simulation
  await simulation.dispatch({ type: "START" });
  
  // Wait for async processing to complete
  await new Promise(resolve => setTimeout(resolve, 100));

  const finalState = simulation.getGlobalState();
  const facilitatorState = simulation.getAgentInternalState("facilitator");

  console.log("\nEcosystem Simulation Result:");
  console.log("Final state:");
  console.log(`  Rabbits: ${finalState.rabbits}`);
  console.log(`  Foxes: ${finalState.foxes}`);
  console.log(`  Grass: ${finalState.grass}`);
  console.log(`  Total turns: ${facilitatorState.currentTurn}`);

  // Show some history
  console.log("\nPopulation history (first 5 turns):");
  for (let i = 0; i < Math.min(5, facilitatorState.currentTurn); i++) {
    console.log(
      `  Turn ${i}: Rabbits=${finalState.history.rabbits[i]}, Foxes=${finalState.history.foxes[i]}, Grass=${finalState.history.grass[i]}`
    );
  }

  return {
    finalState,
    facilitatorState,
    totalTurns: facilitatorState.currentTurn,
  };
};

// Run if this file is executed directly
if (import.meta.main) {
  runEcosystemExample().catch(console.error);
}
