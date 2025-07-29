// Core types for the Agent-Based Modeling framework

/**
 * Represents an action that an agent can perform
 */
export type Action<TState = any> = (state: TState) => Promise<TState> | TState;

/**
 * Represents a node/agent in the simulation
 */
export interface Node<TState = any> {
  id: string;
  action: Action<TState>;
}

/**
 * Represents the simulation state
 */
export interface SimulationState<TState = any> {
  nodes: Node<TState>[];
  state: TState;
  turn: number;
}

/**
 * Configuration for running a simulation
 */
export interface SimulationConfig<TState = any> {
  maxTurns?: number;
  initialState: TState;
  nodes: Node<TState>[];
}

/**
 * Result of running a simulation
 */
export interface SimulationResult<TState = any> {
  finalState: TState;
  turnHistory: TState[];
  totalTurns: number;
}
