import type {
  Action,
  ActionParams,
  Node,
  SimulationConfig,
  SimulationResult,
  SimulationState,
} from "./types.ts";

/**
 * Creates a new simulation state
 */
export const createSimulationState = <TGlobalState>(
  config: SimulationConfig<TGlobalState>
): SimulationState<TGlobalState> => ({
  nodes: config.nodes,
  state: config.initialState,
  turn: 0,
});

/**
 * Executes a single turn of the simulation
 */
export const executeTurn = async <TGlobalState>(
  simulationState: SimulationState<TGlobalState>
): Promise<SimulationState<TGlobalState>> => {
  let currentGlobalState = simulationState.state;
  const updatedNodes = [...simulationState.nodes];

  // Execute each node's action in sequence
  for (let i = 0; i < updatedNodes.length; i++) {
    const node = updatedNodes[i];
    
    // Prepare action parameters
    const params: ActionParams<TGlobalState, any> = {
      globalState: currentGlobalState,
      internalState: node.internalState,
    };

    // Execute the action
    const result = await node.action(params);
    
    // Result is always { globalState, internalState? }
    currentGlobalState = result.globalState;
    
    // Update internal state if provided
    if (result.internalState !== undefined) {
      updatedNodes[i] = {
        ...node,
        internalState: result.internalState,
      };
    }
  }

  return {
    ...simulationState,
    nodes: updatedNodes,
    state: currentGlobalState,
    turn: simulationState.turn + 1,
  };
};

/**
 * Runs a complete simulation
 */
export const runSimulation = async <TGlobalState>(
  config: SimulationConfig<TGlobalState>
): Promise<SimulationResult<TGlobalState>> => {
  let currentState = createSimulationState(config);
  const turnHistory: TGlobalState[] = [currentState.state];

  const maxTurns = config.maxTurns ?? 100; // Default to 100 turns

  while (currentState.turn < maxTurns) {
    currentState = await executeTurn(currentState);
    turnHistory.push(currentState.state);
  }

  // Extract final internal states
  const finalNodeStates: { [nodeId: string]: any } = {};
  for (const node of currentState.nodes) {
    if (node.internalState !== undefined) {
      finalNodeStates[node.id] = node.internalState;
    }
  }

  return {
    finalState: currentState.state,
    finalNodeStates: Object.keys(finalNodeStates).length > 0 ? finalNodeStates : undefined,
    turnHistory,
    totalTurns: currentState.turn,
  };
};

/**
 * Utility to create a node
 */
export const createNode = <TGlobalState, TInternalState = never>(
  id: string,
  action: Action<TGlobalState, TInternalState>,
  initialInternalState?: TInternalState
): Node<TGlobalState, TInternalState> => ({
  id,
  action,
  internalState: initialInternalState,
});

/**
 * Unified utility to create an action (works with both simple and internal state)
 */
export const createAction = <TGlobalState, TInternalState = never>(
  action: Action<TGlobalState, TInternalState>
): Action<TGlobalState, TInternalState> => action;