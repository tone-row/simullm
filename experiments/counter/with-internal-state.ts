import {
  runSimulationWithInternalState,
  createNodeWithInternalState,
  createActionWithInternalState,
} from "../../lib/simulation-with-internal-state.ts";

// Example: Agents with memory/learning capabilities
interface GlobalState {
  totalValue: number;
  history: number[];
}

interface AgentInternalState {
  memory: number[];
  learningRate: number;
  lastAction: string;
}

// Agent that remembers previous actions and learns
const learningAgentAction = createActionWithInternalState<
  GlobalState,
  AgentInternalState
>((globalState, internalState) => {
  // Agent remembers its history and adjusts behavior
  const memorySize = internalState.memory.length;
  const learningBonus = Math.min(memorySize * internalState.learningRate, 5);

  const newValue = globalState.totalValue + 1 + learningBonus;
  const newMemory = [...internalState.memory, newValue].slice(-10); // Keep last 10 values

  return {
    globalState: {
      ...globalState,
      totalValue: newValue,
      history: [...globalState.history, newValue],
    },
    internalState: {
      ...internalState,
      memory: newMemory,
      learningRate: internalState.learningRate * 1.01, // Gradually improve learning
      lastAction: `added ${1 + learningBonus}`,
    },
  };
});

// Agent that gets tired over time
const tiredAgentAction = createActionWithInternalState<
  GlobalState,
  AgentInternalState
>((globalState, internalState) => {
  const fatigue = Math.min(internalState.memory.length * 0.1, 2);
  const contribution = Math.max(0, 2 - fatigue);

  const newValue = globalState.totalValue + contribution;
  const newMemory = [...internalState.memory, contribution].slice(-5);

  return {
    globalState: {
      ...globalState,
      totalValue: newValue,
      history: [...globalState.history, newValue],
    },
    internalState: {
      ...internalState,
      memory: newMemory,
      learningRate: internalState.learningRate * 0.99, // Get tired
      lastAction: `contributed ${contribution}`,
    },
  };
});

// Create nodes with internal state
const learningAgent = createNodeWithInternalState(
  "learning-agent",
  learningAgentAction,
  {
    memory: [],
    learningRate: 0.1,
    lastAction: "none",
  }
);

const tiredAgent = createNodeWithInternalState(
  "tired-agent",
  tiredAgentAction,
  {
    memory: [],
    learningRate: 0.05,
    lastAction: "none",
  }
);

// Run the simulation with internal states
export const runInternalStateExample = async () => {
  const config = {
    initialState: { totalValue: 0, history: [0] },
    nodes: [learningAgent, tiredAgent],
    maxTurns: 10,
  };

  const result = await runSimulationWithInternalState(config);

  console.log("\nInternal State Simulation Result:");
  console.log("Final global state:", result.finalState);
  console.log("Final agent states:");
  result.finalNodeStates.forEach((state, index) => {
    console.log(`  Agent ${index}:`, state);
  });
  console.log("Total turns:", result.totalTurns);

  return result;
};
