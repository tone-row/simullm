import { runSimulation, createNode, createAction } from "../../lib/simulation.ts";

// Example: Simple predator-prey ecosystem
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

// Rabbit behavior: reproduce and eat grass
const rabbitAction = createAction<EcosystemState>(({ globalState }) => {
  const newRabbits = Math.floor(globalState.rabbits * 1.2); // 20% growth rate
  const grassEaten = Math.min(newRabbits * 0.5, globalState.grass); // Each rabbit eats 0.5 grass
  const newGrass = Math.max(0, globalState.grass - grassEaten);

  return {
    globalState: {
      ...globalState,
      rabbits: newRabbits,
      grass: newGrass,
      history: {
        rabbits: [...globalState.history.rabbits, newRabbits],
        foxes: [...globalState.history.foxes, globalState.foxes],
        grass: [...globalState.history.grass, newGrass],
      },
    }
  };
});

// Fox behavior: hunt rabbits and reproduce
const foxAction = createAction<EcosystemState>(({ globalState }) => {
  const rabbitsCaught = Math.min(Math.floor(globalState.foxes * 0.8), globalState.rabbits); // Each fox catches 0.8 rabbits
  const newRabbits = Math.max(0, globalState.rabbits - rabbitsCaught);
  const newFoxes = Math.floor(globalState.foxes * (1 + rabbitsCaught * 0.1)); // Foxes grow based on food

  return {
    globalState: {
      ...globalState,
      rabbits: newRabbits,
      foxes: newFoxes,
      history: {
        rabbits: [...globalState.history.rabbits, newRabbits],
        foxes: [...globalState.history.foxes, newFoxes],
        grass: [...globalState.history.grass, globalState.grass],
      },
    }
  };
});

// Grass behavior: regrow
const grassAction = createAction<EcosystemState>(({ globalState }) => {
  const newGrass = Math.min(100, globalState.grass * 1.1); // 10% growth, max 100

  return {
    globalState: {
      ...globalState,
      grass: newGrass,
      history: {
        rabbits: [...globalState.history.rabbits, globalState.rabbits],
        foxes: [...globalState.history.foxes, globalState.foxes],
        grass: [...globalState.history.grass, newGrass],
      },
    }
  };
});

// Create nodes
const rabbitNode = createNode("rabbits", rabbitAction);
const foxNode = createNode("foxes", foxAction);
const grassNode = createNode("grass", grassAction);

// Run the ecosystem simulation
export const runEcosystemExample = async () => {
  const config = {
    initialState: {
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
    nodes: [rabbitNode, foxNode, grassNode],
    maxTurns: 20,
  };

  const result = await runSimulation(config);

  console.log("\nEcosystem Simulation Result:");
  console.log("Final globalState:");
  console.log(`  Rabbits: ${result.finalState.rabbits}`);
  console.log(`  Foxes: ${result.finalState.foxes}`);
  console.log(`  Grass: ${result.finalState.grass}`);
  console.log(`  Total turns: ${result.totalTurns}`);

  // Show some history
  console.log("\nPopulation history (first 5 turns):");
  for (let i = 0; i < Math.min(5, result.totalTurns); i++) {
    console.log(
      `  Turn ${i}: Rabbits=${result.finalState.history.rabbits[i]}, Foxes=${result.finalState.history.foxes[i]}, Grass=${result.finalState.history.grass[i]}`
    );
  }

  return result;
};
