// Example extension to support internal state for nodes

/**
 * Action that can access both global and internal state
 */
export type ActionWithInternalState<TState = any, TInternalState = any> = (
  globalState: TState,
  internalState: TInternalState
) =>
  | Promise<{ globalState: TState; internalState: TInternalState }>
  | { globalState: TState; internalState: TInternalState };

/**
 * Node with internal state
 */
export interface NodeWithInternalState<TState = any, TInternalState = any> {
  id: string;
  action: ActionWithInternalState<TState, TInternalState>;
  internalState: TInternalState;
}

/**
 * Simulation state with node internal states
 */
export interface SimulationStateWithInternalState<
  TState = any,
  TInternalState = any
> {
  nodes: NodeWithInternalState<TState, TInternalState>[];
  state: TState;
  turn: number;
}

/**
 * Configuration for simulation with internal states
 */
export interface SimulationConfigWithInternalState<
  TState = any,
  TInternalState = any
> {
  maxTurns?: number;
  initialState: TState;
  nodes: NodeWithInternalState<TState, TInternalState>[];
}

/**
 * Result of running a simulation with internal states
 */
export interface SimulationResultWithInternalState<
  TState = any,
  TInternalState = any
> {
  finalState: TState;
  finalNodeStates: TInternalState[];
  turnHistory: TState[];
  totalTurns: number;
}
