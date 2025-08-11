import type {
  Agent,
  Context,
  SimulationConfig,
  ActionDispatcher,
  // Legacy imports
  Action,
  ActionParams,
  Node,
  SimulationResult,
  SimulationState,
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
 * Create an event-driven simulation
 */
export const createEventSimulation = <TGlobalState, TAction>(
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

// Legacy functions for backward compatibility

/**
 * Creates a new simulation state (legacy)
 */
export const createSimulationState = <TGlobalState>(
  config: { initialState: TGlobalState; nodes: Node<TGlobalState, any>[] }
): SimulationState<TGlobalState> => ({
  nodes: config.nodes,
  state: config.initialState,
  turn: 0,
});

/**
 * Executes a single turn of the simulation (legacy)
 */
export const executeTurn = async <TGlobalState>(
  simulationState: SimulationState<TGlobalState>
): Promise<SimulationState<TGlobalState>> => {
  let currentGlobalState = simulationState.state;
  const updatedNodes = [...simulationState.nodes];

  for (let i = 0; i < updatedNodes.length; i++) {
    const node = updatedNodes[i];
    const params: ActionParams<TGlobalState, any> = {
      globalState: currentGlobalState,
      internalState: node.internalState,
    };

    const result = await node.action(params);
    currentGlobalState = result.globalState;

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
 * Runs a complete simulation (legacy)
 */
export const runSimulation = async <TGlobalState>(
  config: { initialState: TGlobalState; nodes: Node<TGlobalState, any>[]; maxTurns?: number }
): Promise<SimulationResult<TGlobalState>> => {
  let currentState = createSimulationState(config);
  const turnHistory: TGlobalState[] = [currentState.state];
  const maxTurns = config.maxTurns ?? 100;

  while (currentState.turn < maxTurns) {
    currentState = await executeTurn(currentState);
    turnHistory.push(currentState.state);
  }

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
 * Utility to create a node (legacy)
 */
export const createNode = <TGlobalState, TInternalState = any>(
  id: string,
  action: Action<TGlobalState, TInternalState>,
  initialInternalState?: TInternalState
): Node<TGlobalState, TInternalState> => ({
  id,
  action,
  internalState: initialInternalState,
});

/**
 * Unified utility to create an action (legacy)
 */
export const createAction = <TGlobalState, TInternalState = any>(
  action: Action<TGlobalState, TInternalState>
): Action<TGlobalState, TInternalState> => action;
