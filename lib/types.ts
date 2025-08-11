// Event-driven Agent-Based Modeling framework types

/**
 * Context provided to agents when they receive actions
 */
export interface Context<TGlobalState, TAction> {
  globalState: TGlobalState;
  dispatch: (action: TAction) => void;
  updateGlobalState: (updater: (state: TGlobalState) => TGlobalState) => void;
  updateInternalState: (updater: (state: any) => any) => void;
  internalState: any;
}

/**
 * Event-driven agent that responds to actions
 */
export interface Agent<TGlobalState, TAction, TInternalState = any> {
  id: string;
  onAction: (action: TAction, context: Context<TGlobalState, TAction>) => void | Promise<void>;
  initialInternalState?: TInternalState;
}

/**
 * Configuration for creating an event-driven simulation
 */
export interface SimulationConfig<TGlobalState, TAction> {
  initialGlobalState: TGlobalState;
  agents: Agent<TGlobalState, TAction, any>[];
}

/**
 * Manages action dispatch and agent coordination
 */
export interface ActionDispatcher<TGlobalState, TAction> {
  dispatch: (action: TAction) => void | Promise<void>;
  getGlobalState: () => TGlobalState;
  getAgentInternalState: (agentId: string) => any;
}

// Legacy types for backward compatibility (if needed during transition)

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
 * Represents a node/agent in the simulation (legacy)
 */
export interface Node<TGlobalState, TInternalState = never> {
  id: string;
  action: Action<TGlobalState, TInternalState>;
  internalState?: TInternalState;
}

/**
 * Represents the simulation state (legacy)
 */
export interface SimulationState<TGlobalState> {
  nodes: Node<TGlobalState, any>[];
  state: TGlobalState;
  turn: number;
}

/**
 * Result of running a simulation (legacy)
 */
export interface SimulationResult<TGlobalState> {
  finalState: TGlobalState;
  finalNodeStates?: { [nodeId: string]: any };
  turnHistory: TGlobalState[];
  totalTurns: number;
}

