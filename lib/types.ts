// Unified types for the Agent-Based Modeling framework

/**
 * Parameters passed to an action
 */
export type ActionParams<TGlobalState, TInternalState = never> = {
  globalState: TGlobalState;
  internalState?: TInternalState;
};

/**
 * Result returned by an action - always an object with globalState and optional internalState
 */
export type ActionResult<TGlobalState, TInternalState = never> = 
  | { globalState: TGlobalState; internalState?: TInternalState }
  | Promise<{ globalState: TGlobalState; internalState?: TInternalState }>;

/**
 * Represents a unified action that can handle both simple and internal state scenarios
 */
export type Action<TGlobalState, TInternalState = never> = (
  params: ActionParams<TGlobalState, TInternalState>
) => ActionResult<TGlobalState, TInternalState>;

/**
 * Represents a node/agent in the simulation
 */
export interface Node<TGlobalState, TInternalState = never> {
  id: string;
  action: Action<TGlobalState, TInternalState>;
  internalState?: TInternalState; // Only present for nodes that use internal state
}

/**
 * Represents the simulation state
 */
export interface SimulationState<TGlobalState> {
  nodes: Node<TGlobalState, any>[]; // Mixed nodes - some with internal state, some without
  state: TGlobalState;
  turn: number;
}

/**
 * Configuration for running a simulation
 */
export interface SimulationConfig<TGlobalState> {
  maxTurns?: number;
  initialState: TGlobalState;
  nodes: Node<TGlobalState, any>[];
}

/**
 * Result of running a simulation
 */
export interface SimulationResult<TGlobalState> {
  finalState: TGlobalState;
  finalNodeStates?: { [nodeId: string]: any }; // Internal states of nodes (if any)
  turnHistory: TGlobalState[];
  totalTurns: number;
}

