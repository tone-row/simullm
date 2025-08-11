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


