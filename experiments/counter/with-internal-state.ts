import { runSimulation, createNode, createAction } from "../../lib/simulation.ts";

// Example: Agents with memory/learning capabilities using unified API
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
const learningAgentAction = createAction<GlobalState, AgentInternalState>(
  ({ globalState, internalState }) => {
    if (!internalState) throw new Error("Learning agent needs internal state");
    
    // Agent remembers its history and adjusts behavior
    const memorySize = internalState.memory.length;
    const contribution = memorySize > 3 ? internalState.learningRate * 2 : internalState.learningRate;
    
    return {
      globalState: {
        totalValue: globalState.totalValue + contribution,
        history: [...globalState.history, globalState.totalValue + contribution],
      },
      internalState: {
        memory: [...internalState.memory, contribution].slice(-5), // Keep last 5 memories
        learningRate: internalState.learningRate * 1.1, // Learn faster over time
        lastAction: "learned",
      },
    };
  }
);

// Agent that gets tired over time
const tiredAgentAction = createAction<GlobalState, AgentInternalState>(
  ({ globalState, internalState }) => {
    if (!internalState) throw new Error("Tired agent needs internal state");
    
    const energyLevel = Math.max(0.1, 1 - internalState.memory.length * 0.1);
    const contribution = internalState.learningRate * energyLevel;
    
    return {
      globalState: {
        totalValue: globalState.totalValue + contribution,
        history: [...globalState.history, globalState.totalValue + contribution],
      },
      internalState: {
        memory: [...internalState.memory, contribution],
        learningRate: internalState.learningRate * 0.95, // Get tired over time
        lastAction: "worked",
      },
    };
  }
);

// Run the simulation with agents that have internal state
export const runInternalStateExample = async () => {
  const config = {
    initialState: { totalValue: 0, history: [0] },
    nodes: [
      createNode("learner", learningAgentAction, {
        memory: [],
        learningRate: 1,
        lastAction: "none",
      }),
      createNode("tired", tiredAgentAction, {
        memory: [],
        learningRate: 2,
        lastAction: "none",
      }),
    ],
    maxTurns: 5,
  };

  const result = await runSimulation(config);

  console.log("Internal State Simulation Result:");
  console.log("Final value:", result.finalState.totalValue);
  console.log("History:", result.finalState.history);
  console.log("Final node states:", result.finalNodeStates);
  console.log("Total turns:", result.totalTurns);

  return result;
};