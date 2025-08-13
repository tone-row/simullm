import { createSimulation, createAgent } from "../../lib/simulation.ts";

// Example: Event-driven counter simulation
interface CounterState {
  value: number;
  history: number[];
}

// Define action types
type CounterAction = 
  | { type: "START" }
  | { type: "TURN_START"; agentId: string }
  | { type: "TURN_COMPLETE"; agentId: string }
  | { type: "INCREMENT" }
  | { type: "DOUBLE" }
  | { type: "RESET" };

interface FacilitatorState {
  turnOrder: string[];
  currentTurnIndex: number;
  maxTurns: number;
  completedTurns: number;
}

// Turn-based facilitator agent
const facilitator = createAgent<CounterState, CounterAction, FacilitatorState>(
  "facilitator",
  (action, context) => {
    const state = context.internalState;
    
    if (action.type === "START") {
      // Start the first turn
      context.dispatch({ type: "TURN_START", agentId: state.turnOrder[0] });
    }
    
    if (action.type === "TURN_COMPLETE") {
      const nextIndex = (state.currentTurnIndex + 1) % state.turnOrder.length;
      const isNewRound = nextIndex === 0;
      
      context.updateInternalState((s: FacilitatorState) => ({
        ...s,
        currentTurnIndex: nextIndex,
        completedTurns: isNewRound ? s.completedTurns + 1 : s.completedTurns,
      }));

      // Check if we should continue
      if (context.internalState.completedTurns < context.internalState.maxTurns) {
        const nextAgent = state.turnOrder[nextIndex];
        context.dispatch({ type: "TURN_START", agentId: nextAgent });
      }
    }
  },
  {
    turnOrder: ["increment", "double", "reset"],
    currentTurnIndex: 0,
    maxTurns: 5,
    completedTurns: 0,
  }
);

// Increment agent
const incrementAgent = createAgent<CounterState, CounterAction>(
  "increment",
  (action, context) => {
    if (action.type === "TURN_START" && action.agentId === "increment") {
      context.dispatch({ type: "INCREMENT" });
      context.dispatch({ type: "TURN_COMPLETE", agentId: "increment" });
    }
    
    if (action.type === "INCREMENT") {
      context.updateGlobalState(state => ({
        ...state,
        value: state.value + 1,
        history: [...state.history, state.value + 1],
      }));
    }
  }
);

// Double agent
const doubleAgent = createAgent<CounterState, CounterAction>(
  "double",
  (action, context) => {
    if (action.type === "TURN_START" && action.agentId === "double") {
      context.dispatch({ type: "DOUBLE" });
      context.dispatch({ type: "TURN_COMPLETE", agentId: "double" });
    }
    
    if (action.type === "DOUBLE") {
      context.updateGlobalState(state => ({
        ...state,
        value: state.value * 2,
        history: [...state.history, state.value * 2],
      }));
    }
  }
);

// Reset agent
const resetAgent = createAgent<CounterState, CounterAction>(
  "reset",
  (action, context) => {
    if (action.type === "TURN_START" && action.agentId === "reset") {
      context.dispatch({ type: "RESET" });
      context.dispatch({ type: "TURN_COMPLETE", agentId: "reset" });
    }
    
    if (action.type === "RESET") {
      context.updateGlobalState(state => ({
        ...state,
        value: 0,
        history: [...state.history, 0],
      }));
    }
  }
);

// Run the simulation
export const runCounterExample = async () => {
  const simulation = createSimulation<CounterState, CounterAction>({
    initialGlobalState: { value: 1, history: [1] },
    agents: [facilitator, incrementAgent, doubleAgent, resetAgent],
    shouldExit: ({ agentStates }) => {
      const facilitatorState = agentStates["facilitator"];
      return facilitatorState && facilitatorState.completedTurns >= facilitatorState.maxTurns;
    },
  });

  // Start the simulation
  await simulation.dispatch({ type: "START" });

  const finalState = simulation.getGlobalState();
  const facilitatorState = simulation.getAgentInternalState("facilitator") as FacilitatorState;

  console.log("Counter Simulation Result:");
  console.log("Final value:", finalState.value);
  console.log("History:", finalState.history);
  console.log("Total turns:", facilitatorState.completedTurns);

  return {
    finalState,
    facilitatorState,
    totalTurns: facilitatorState.completedTurns,
  };
};

// Run if this file is executed directly
if (import.meta.main) {
  runCounterExample().catch(console.error);
}
