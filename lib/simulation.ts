import type {
  Action,
  Node,
  SimulationConfig,
  SimulationResult,
  SimulationState,
} from "./types.ts";

/**
 * Creates a new simulation state
 */
export const createSimulationState = <TState>(
  config: SimulationConfig<TState>
): SimulationState<TState> => ({
  nodes: config.nodes,
  state: config.initialState,
  turn: 0,
});

/**
 * Executes a single turn of the simulation
 */
export const executeTurn = async <TState>(
  simulationState: SimulationState<TState>
): Promise<SimulationState<TState>> => {
  let currentState = simulationState.state;

  // Execute each node's action in sequence
  for (const node of simulationState.nodes) {
    const result = await node.action(currentState);
    currentState = result;
  }

  return {
    ...simulationState,
    state: currentState,
    turn: simulationState.turn + 1,
  };
};

/**
 * Runs a complete simulation
 */
export const runSimulation = async <TState>(
  config: SimulationConfig<TState>
): Promise<SimulationResult<TState>> => {
  let currentState = createSimulationState(config);
  const turnHistory: TState[] = [currentState.state];

  const maxTurns = config.maxTurns ?? 100; // Default to 100 turns

  while (currentState.turn < maxTurns) {
    currentState = await executeTurn(currentState);
    turnHistory.push(currentState.state);
  }

  return {
    finalState: currentState.state,
    turnHistory,
    totalTurns: currentState.turn,
  };
};

/**
 * Utility to create a simple node
 */
export const createNode = <TState>(
  id: string,
  action: Action<TState>
): Node<TState> => ({
  id,
  action,
});

/**
 * Utility to create a synchronous action
 */
export const createSyncAction = <TState>(
  action: (state: TState) => TState
): Action<TState> => action;

/**
 * Utility to create an asynchronous action
 */
export const createAsyncAction = <TState>(
  action: (state: TState) => Promise<TState>
): Action<TState> => action;
