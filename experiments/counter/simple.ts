import { runSimulation, createNode, createSyncAction } from "../../lib/simulation.ts";

// Example: Simple counter simulation
interface CounterState {
  value: number;
  history: number[];
}

// Create some simple actions
const incrementAction = createSyncAction<CounterState>((state) => ({
  ...state,
  value: state.value + 1,
  history: [...state.history, state.value + 1],
}));

const doubleAction = createSyncAction<CounterState>((state) => ({
  ...state,
  value: state.value * 2,
  history: [...state.history, state.value * 2],
}));

const resetAction = createSyncAction<CounterState>((state) => ({
  ...state,
  value: 0,
  history: [...state.history, 0],
}));

// Create nodes
const incrementNode = createNode("increment", incrementAction);
const doubleNode = createNode("double", doubleAction);
const resetNode = createNode("reset", resetAction);

// Run the simulation
export const runCounterExample = async () => {
  const config = {
    initialState: { value: 1, history: [1] },
    nodes: [incrementNode, doubleNode, resetNode],
    maxTurns: 5,
  };

  const result = await runSimulation(config);

  console.log("Counter Simulation Result:");
  console.log("Final value:", result.finalState.value);
  console.log("History:", result.finalState.history);
  console.log("Total turns:", result.totalTurns);

  return result;
};
