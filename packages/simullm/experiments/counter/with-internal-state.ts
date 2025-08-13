import { createSimulation, createAgent } from "../../lib/simulation.ts";

// Example: Event-driven agents with memory/learning capabilities
interface GlobalState {
  totalValue: number;
  history: number[];
}

interface AgentInternalState {
  memory: number[];
  learningRate: number;
  lastAction: string;
}

// Define action types
type WorkAction = 
  | { type: "START" }
  | { type: "TURN_START"; agentId: string }
  | { type: "WORK_COMPLETE"; agentId: string; contribution: number }
  | { type: "TURN_END" };

interface WorkFacilitatorState {
  currentTurn: number;
  maxTurns: number;
  agentOrder: string[];
  waitingFor: string[];
}

// Work facilitator manages turn-based work cycles
const workFacilitator = createAgent<GlobalState, WorkAction, WorkFacilitatorState>(
  "facilitator",
  (action, context) => {
    if (action.type === "START") {
      context.updateInternalState(state => ({ ...state, currentTurn: 1 }));
      context.dispatch({ type: "TURN_START", agentId: "learner" }); // Start with first agent
    }
    
    if (action.type === "TURN_START") {
      // Reset waiting list for this turn - expecting both agents to work
      context.updateInternalState(state => ({
        ...state,
        waitingFor: [...state.agentOrder]
      }));
    }
    
    if (action.type === "WORK_COMPLETE") {
      // Update global state with work contribution
      context.updateGlobalState(state => ({
        totalValue: state.totalValue + action.contribution,
        history: [...state.history, state.totalValue + action.contribution]
      }));
      
      // Remove agent from waiting list
      context.updateInternalState(state => ({
        ...state,
        waitingFor: state.waitingFor.filter((id: string) => id !== action.agentId)
      }));
      
      // If all agents have worked, end the turn
      if (context.internalState.waitingFor.length === 1) { // Only the one we just removed
        const nextTurn = context.internalState.currentTurn + 1;
        context.updateInternalState(state => ({ ...state, currentTurn: nextTurn }));
        
        if (nextTurn <= context.internalState.maxTurns) {
          context.dispatch({ type: "TURN_START", agentId: "learner" });
        }
      }
    }
  },
  {
    currentTurn: 0,
    maxTurns: 5,
    agentOrder: ["learner", "tired"],
    waitingFor: []
  }
);

// Learning agent that remembers previous actions and learns
const learningAgent = createAgent<GlobalState, WorkAction, AgentInternalState>(
  "learner",
  (action, context) => {
    if (action.type === "TURN_START" && action.agentId === "learner") {
      const state = context.internalState;
      
      // Agent remembers its history and adjusts behavior
      const memorySize = state.memory.length;
      const contribution = memorySize > 3 ? state.learningRate * 2 : state.learningRate;
      
      // Update internal state
      context.updateInternalState((s: AgentInternalState) => ({
        memory: [...s.memory, contribution].slice(-5), // Keep last 5 memories
        learningRate: s.learningRate * 1.1, // Learn faster over time
        lastAction: "learned",
      }));
      
      // Report work completion
      context.dispatch({ type: "WORK_COMPLETE", agentId: "learner", contribution });
    }
  },
  {
    memory: [],
    learningRate: 1,
    lastAction: "none",
  }
);

// Tired agent that gets tired over time
const tiredAgent = createAgent<GlobalState, WorkAction, AgentInternalState>(
  "tired",
  (action, context) => {
    if (action.type === "TURN_START") {
      const state = context.internalState;
      
      const energyLevel = Math.max(0.1, 1 - state.memory.length * 0.1);
      const contribution = state.learningRate * energyLevel;
      
      // Update internal state
      context.updateInternalState((s: AgentInternalState) => ({
        memory: [...s.memory, contribution],
        learningRate: s.learningRate * 0.95, // Get tired over time
        lastAction: "worked",
      }));
      
      // Report work completion
      context.dispatch({ type: "WORK_COMPLETE", agentId: "tired", contribution });
    }
  },
  {
    memory: [],
    learningRate: 2,
    lastAction: "none",
  }
);

// Run the simulation with agents that have internal state
export const runInternalStateExample = async () => {
  const simulation = createSimulation<GlobalState, WorkAction>({
    initialGlobalState: { totalValue: 0, history: [0] },
    agents: [workFacilitator, learningAgent, tiredAgent],
    shouldExit: ({ agentStates }) => {
      const facilitatorState = agentStates["facilitator"];
      return facilitatorState && facilitatorState.currentTurn > facilitatorState.maxTurns;
    },
  });

  // Start the simulation
  await simulation.dispatch({ type: "START" });

  // Wait for processing to complete
  await new Promise(resolve => setTimeout(resolve, 100));

  const finalState = simulation.getGlobalState();
  const facilitatorState = simulation.getAgentInternalState("facilitator");
  const learnerState = simulation.getAgentInternalState("learner") as AgentInternalState;
  const tiredState = simulation.getAgentInternalState("tired") as AgentInternalState;

  console.log("Internal State Simulation Result:");
  console.log("Final value:", finalState.totalValue);
  console.log("History:", finalState.history);
  console.log("Final node states:", {
    learner: learnerState,
    tired: tiredState,
  });
  console.log("Total turns:", facilitatorState.maxTurns);

  return {
    finalState,
    facilitatorState,
    totalTurns: facilitatorState.maxTurns,
  };
};

// Run if this file is executed directly
if (import.meta.main) {
  runInternalStateExample().catch(console.error);
}