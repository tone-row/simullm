import { runSimulation, createNode, createAction } from "../../lib/simulation.ts";

// Example: Simple counter simulation
interface CounterState {
  value: number;
  history: number[];
}

// Create some simple actions
const incrementAction = createAction<CounterState>(({ globalState }) => ({
  globalState: {
    ...globalState,
    value: globalState.value + 1,
    history: [...globalState.history, globalState.value + 1],
  }
}));

const doubleAction = createAction<CounterState>(({ globalState }) => ({
  globalState: {
    ...globalState,
    value: globalState.value * 2,
    history: [...globalState.history, globalState.value * 2],
  }
}));

const resetAction = createAction<CounterState>(({ globalState }) => ({
  globalState: {
    ...globalState,
    value: 0,
    history: [...globalState.history, 0],
  }
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
