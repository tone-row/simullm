import type {
  Agent,
  Context,
  SimulationConfig,
  ActionDispatcher,
  ExitContext,
} from "./types.ts";

/**
 * Event-driven simulation engine
 */
export class EventSimulation<TGlobalState, TAction> {
  private globalState: TGlobalState;
  private agents: Map<string, Agent<TGlobalState, TAction, any>> = new Map();
  private agentInternalStates: Map<string, any> = new Map();
  private actionQueue: TAction[] = [];
  private isProcessing = false;
  private actionCount = 0;
  private hasExited = false;
  private shouldExit: (context: ExitContext<TGlobalState, TAction>) => boolean;
  private exitPromise: Promise<void>;
  private resolveExit!: () => void;

  constructor(config: SimulationConfig<TGlobalState, TAction>) {
    this.globalState = config.initialGlobalState;
    this.shouldExit = config.shouldExit;
    
    this.exitPromise = new Promise<void>((resolve) => {
      this.resolveExit = resolve;
    });
    
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
    if (this.hasExited) {
      return; // Don't process any more actions after exit
    }
    
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
      
      // Increment action count and check exit condition
      this.actionCount++;
      const exitContext: ExitContext<TGlobalState, TAction> = {
        globalState: this.globalState,
        agentStates: this.getAllAgentStates(),
        lastAction: action,
        actionCount: this.actionCount,
      };
      
      if (this.shouldExit(exitContext)) {
        // Clear remaining actions and exit
        this.actionQueue.length = 0;
        this.hasExited = true;
        this.resolveExit();
        break;
      }
      
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
        if (!this.isProcessing) {
          this.processActionQueue();
        }
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
      allAgents: Array.from(this.agents.keys()).map(id => ({
        id,
        internalState: this.agentInternalStates.get(id),
      })),
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
    for (const [agentId] of this.agents) {
      result[agentId] = this.agentInternalStates.get(agentId);
    }
    return result;
  }

  /**
   * Get current action count
   */
  getActionCount(): number {
    return this.actionCount;
  }

  /**
   * Check if simulation has exited
   */
  hasSimulationExited(): boolean {
    return this.hasExited;
  }

  /**
   * Returns a promise that resolves when the simulation exits
   */
  exit(): Promise<void> {
    return this.exitPromise;
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
});

