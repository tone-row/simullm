import type {
  ActionWithInternalState,
  NodeWithInternalState,
  SimulationConfigWithInternalState,
  SimulationResultWithInternalState,
  SimulationStateWithInternalState,
} from "./types-with-internal-state.ts";

/**
 * Creates a new simulation state with internal states
 */
export const createSimulationStateWithInternalState = <TState, TInternalState>(
  config: SimulationConfigWithInternalState<TState, TInternalState>
): SimulationStateWithInternalState<TState, TInternalState> => ({
  nodes: config.nodes,
  state: config.initialState,
  turn: 0,
});

/**
 * Executes a single turn with internal states
 */
export const executeTurnWithInternalState = async <TState, TInternalState>(
  simulationState: SimulationStateWithInternalState<TState, TInternalState>
): Promise<SimulationStateWithInternalState<TState, TInternalState>> => {
  let currentState = simulationState.state;
  const updatedNodes: NodeWithInternalState<TState, TInternalState>[] = [];

  // Execute each node's action in sequence
  for (const node of simulationState.nodes) {
    const result = await node.action(currentState, node.internalState);
    currentState = result.globalState;

    updatedNodes.push({
      ...node,
      internalState: result.internalState,
    });
  }

  return {
    ...simulationState,
    nodes: updatedNodes,
    state: currentState,
    turn: simulationState.turn + 1,
  };
};

/**
 * Runs a complete simulation with internal states
 */
export const runSimulationWithInternalState = async <TState, TInternalState>(
  config: SimulationConfigWithInternalState<TState, TInternalState>
): Promise<SimulationResultWithInternalState<TState, TInternalState>> => {
  let currentState = createSimulationStateWithInternalState(config);
  const turnHistory: TState[] = [currentState.state];

  const maxTurns = config.maxTurns ?? 100;

  while (currentState.turn < maxTurns) {
    currentState = await executeTurnWithInternalState(currentState);
    turnHistory.push(currentState.state);
  }

  return {
    finalState: currentState.state,
    finalNodeStates: currentState.nodes.map((node) => node.internalState),
    turnHistory,
    totalTurns: currentState.turn,
  };
};

/**
 * Utility to create a node with internal state
 */
export const createNodeWithInternalState = <TState, TInternalState>(
  id: string,
  action: ActionWithInternalState<TState, TInternalState>,
  initialInternalState: TInternalState
): NodeWithInternalState<TState, TInternalState> => ({
  id,
  action,
  internalState: initialInternalState,
});

/**
 * Utility to create an action with internal state (works with both sync and async functions)
 */
export const createActionWithInternalState = <TState, TInternalState>(
  action: (
    globalState: TState,
    internalState: TInternalState
  ) => { globalState: TState; internalState: TInternalState } | Promise<{ globalState: TState; internalState: TInternalState }>
): ActionWithInternalState<TState, TInternalState> => action;
