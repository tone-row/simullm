export function getSimullmSource(): string {
  return `// simullm - Event-driven Agent-Based Modeling framework for TypeScript
// Complete source code compilation

// ===== types.ts =====
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

// ===== simulation.ts =====
/**
 * Event-driven simulation engine
 */
export class EventSimulation<TGlobalState, TAction> {
  private globalState: TGlobalState;
  private agents: Map<string, Agent<TGlobalState, TAction, any>> = new Map();
  private agentInternalStates: Map<string, any> = new Map();
  private actionQueue: TAction[] = [];
  private isProcessing = false;

  constructor(config: SimulationConfig<TGlobalState, TAction>) {
    this.globalState = config.initialGlobalState;
    
    for (const agent of config.agents) {
      this.agents.set(agent.id, agent);
      if (agent.initialInternalState !== undefined) {
        this.agentInternalStates.set(agent.id, agent.initialInternalState);
      }
    }
  }

  /**
   * Dispatch an action to all agents
   */
  async dispatch(action: TAction): Promise<void> {
    this.actionQueue.push(action);
    
    if (!this.isProcessing) {
      await this.processActionQueue();
    }
  }

  /**
   * Process all queued actions
   */
  private async processActionQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.actionQueue.length > 0) {
      const action = this.actionQueue.shift()!;
      
      // Send action to all agents
      const promises: Promise<void>[] = [];
      for (const [agentId, agent] of this.agents) {
        const context = this.createContext(agentId);
        promises.push(Promise.resolve(agent.onAction(action, context)));
      }
      
      await Promise.all(promises);
      
      // Add a small delay to prevent infinite synchronous loops
      // and allow setTimeout/Promise resolution in calling code
      if (this.actionQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    this.isProcessing = false;
  }

  /**
   * Create context for an agent
   */
  private createContext(agentId: string): Context<TGlobalState, TAction> {
    return {
      globalState: this.globalState,
      dispatch: (action: TAction) => {
        this.actionQueue.push(action);
      },
      updateGlobalState: (updater: (state: TGlobalState) => TGlobalState) => {
        this.globalState = updater(this.globalState);
      },
      updateInternalState: (updater: (state: any) => any) => {
        const currentState = this.agentInternalStates.get(agentId);
        const newState = updater(currentState);
        this.agentInternalStates.set(agentId, newState);
      },
      internalState: this.agentInternalStates.get(agentId),
    };
  }

  /**
   * Get current global state
   */
  getGlobalState(): TGlobalState {
    return this.globalState;
  }

  /**
   * Get agent's internal state
   */
  getAgentInternalState(agentId: string): any {
    return this.agentInternalStates.get(agentId);
  }

  /**
   * Get all agent internal states
   */
  getAllAgentStates(): { [agentId: string]: any } {
    const result: { [agentId: string]: any } = {};
    for (const [agentId, state] of this.agentInternalStates) {
      result[agentId] = state;
    }
    return result;
  }
}

/**
 * Create a simulation
 */
export const createSimulation = <TGlobalState, TAction>(
  config: SimulationConfig<TGlobalState, TAction>
): EventSimulation<TGlobalState, TAction> => {
  return new EventSimulation(config);
};

/**
 * Utility to create an agent
 */
export const createAgent = <TGlobalState, TAction, TInternalState = any>(
  id: string,
  onAction: (action: TAction, context: Context<TGlobalState, TAction>) => void | Promise<void>,
  initialInternalState?: TInternalState
): Agent<TGlobalState, TAction, TInternalState> => ({
  id,
  onAction,
  initialInternalState,
});`;
}
