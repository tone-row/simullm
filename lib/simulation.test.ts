import { describe, it, expect } from "bun:test";
import {
  runSimulation,
  createNode,
  createAction,
  createSimulationState,
  executeTurn,
  createEventSimulation,
  createAgent,
} from "./simulation.ts";
import type { SimulationConfig } from "./types.ts";

describe("ABM Framework", () => {
  describe("createSimulationState", () => {
    it("should create a simulation state with correct initial values", () => {
      const config = {
        initialState: 42,
        nodes: [],
      };

      const state = createSimulationState(config);

      expect(state.state).toBe(42);
      expect(state.turn).toBe(0);
      expect(state.nodes).toEqual([]);
    });
  });

  describe("executeTurn", () => {
    it("should execute a single turn with sync actions", async () => {
      const incrementAction = createAction<number>(({ globalState }) => ({ globalState: globalState + 1 }));
      const doubleAction = createAction<number>(({ globalState }) => ({ globalState: globalState * 2 }));

      const nodes = [
        createNode("increment", incrementAction),
        createNode("double", doubleAction),
      ];

      const initialState = createSimulationState({
        initialState: 5,
        nodes,
      });

      const result = await executeTurn(initialState);

      // 5 + 1 = 6, then 6 * 2 = 12
      expect(result.state).toBe(12);
      expect(result.turn).toBe(1);
    });

    it("should execute a single turn with async actions", async () => {
      const asyncIncrementAction = createAction<number>(async ({ globalState }) => {
        await new Promise((resolve) => setTimeout(resolve, 1)); // Simulate async work
        return { globalState: globalState + 1 };
      });

      const nodes = [createNode("async-increment", asyncIncrementAction)];

      const initialState = createSimulationState({
        initialState: 10,
        nodes,
      });

      const result = await executeTurn(initialState);

      expect(result.state).toBe(11);
      expect(result.turn).toBe(1);
    });
  });

  describe("runSimulation", () => {
    it("should run a complete simulation with multiple turns", async () => {
      const incrementAction = createAction<number>(({ globalState }) => ({ globalState: globalState + 1 }));
      const nodes = [createNode("increment", incrementAction)];

      const config = {
        initialState: 0,
        nodes,
        maxTurns: 3,
      };

      const result = await runSimulation(config);

      expect(result.finalState).toBe(3); // 0 + 1 + 1 + 1 = 3
      expect(result.totalTurns).toBe(3);
      expect(result.turnHistory).toEqual([0, 1, 2, 3]);
    });

    it("should respect maxTurns limit", async () => {
      const incrementAction = createAction<number>(({ globalState }) => ({ globalState: globalState + 1 }));
      const nodes = [createNode("increment", incrementAction)];

      const config = {
        initialState: 0,
        nodes,
        maxTurns: 2,
      };

      const result = await runSimulation(config);

      expect(result.totalTurns).toBe(2);
      expect(result.turnHistory).toEqual([0, 1, 2]);
    });

    it("should use default maxTurns when not specified", async () => {
      const incrementAction = createAction<number>(({ globalState }) => ({ globalState: globalState + 1 }));
      const nodes = [createNode("increment", incrementAction)];

      const config = {
        initialState: 0,
        nodes,
        // maxTurns not specified, should default to 100
      };

      const result = await runSimulation(config);

      expect(result.totalTurns).toBe(100);
      expect(result.finalState).toBe(100);
    });
  });

  describe("utility functions", () => {
    it("should create nodes correctly", () => {
      const action = createAction<number>(({ globalState }) => ({ globalState: globalState + 1 }));
      const node = createNode("test-node", action);

      expect(node.id).toBe("test-node");
      expect(typeof node.action).toBe("function");
    });

    it("should create sync actions correctly", () => {
      const action = createAction<number>(({ globalState }) => ({ globalState: globalState * 2 }));
      const result = action({ globalState: 5 });

      expect((result as any).globalState).toBe(10);
    });

    it("should create async actions correctly", async () => {
      const action = createAction<number>(async ({ globalState }) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return { globalState: globalState * 3 };
      });

      const result = await action({ globalState: 4 });

      expect(result.globalState).toBe(12);
    });
  });

  describe("Event-Driven Framework", () => {
    type TestAction = 
      | { type: "START" }
      | { type: "INCREMENT"; amount: number }
      | { type: "DOUBLE" }
      | { type: "COMPLETED"; agentId: string };

    describe("EventSimulation", () => {
      it("should create simulation with correct initial state", () => {
        const simulation = createEventSimulation<number, TestAction>({
          initialGlobalState: 42,
          agents: [],
        });

        expect(simulation.getGlobalState()).toBe(42);
      });

      it("should handle agent with initial internal state", () => {
        const agent = createAgent<number, TestAction, string>(
          "test-agent",
          () => {},
          "initial-state"
        );

        const simulation = createEventSimulation<number, TestAction>({
          initialGlobalState: 0,
          agents: [agent],
        });

        expect(simulation.getAgentInternalState("test-agent")).toBe("initial-state");
      });

      it("should dispatch actions to all agents", async () => {
        const receivedActions: TestAction[] = [];
        
        const agent1 = createAgent<number, TestAction>(
          "agent1",
          (action, context) => {
            receivedActions.push(action);
          }
        );

        const agent2 = createAgent<number, TestAction>(
          "agent2", 
          (action, context) => {
            receivedActions.push(action);
          }
        );

        const simulation = createEventSimulation<number, TestAction>({
          initialGlobalState: 0,
          agents: [agent1, agent2],
        });

        await simulation.dispatch({ type: "START" });

        expect(receivedActions).toHaveLength(2);
        expect(receivedActions[0]).toEqual({ type: "START" });
        expect(receivedActions[1]).toEqual({ type: "START" });
      });

      it("should allow agents to update global state", async () => {
        const agent = createAgent<number, TestAction>(
          "counter",
          (action, context) => {
            if (action.type === "INCREMENT") {
              context.updateGlobalState(state => state + action.amount);
            }
          }
        );

        const simulation = createEventSimulation<number, TestAction>({
          initialGlobalState: 10,
          agents: [agent],
        });

        await simulation.dispatch({ type: "INCREMENT", amount: 5 });

        expect(simulation.getGlobalState()).toBe(15);
      });

      it("should allow agents to update their internal state", async () => {
        interface InternalState {
          counter: number;
        }

        const agent = createAgent<number, TestAction, InternalState>(
          "stateful-agent",
          (action, context) => {
            if (action.type === "INCREMENT") {
              context.updateInternalState((state: InternalState) => ({
                ...state,
                counter: state.counter + action.amount,
              }));
            }
          },
          { counter: 0 }
        );

        const simulation = createEventSimulation<number, TestAction>({
          initialGlobalState: 0,
          agents: [agent],
        });

        await simulation.dispatch({ type: "INCREMENT", amount: 3 });

        expect(simulation.getAgentInternalState("stateful-agent")).toEqual({ counter: 3 });
      });

      it("should handle cascading actions", async () => {
        const actionLog: string[] = [];

        const agent1 = createAgent<number, TestAction>(
          "agent1",
          (action, context) => {
            actionLog.push(`agent1 received ${action.type}`);
            if (action.type === "START") {
              context.dispatch({ type: "INCREMENT", amount: 1 });
            }
          }
        );

        const agent2 = createAgent<number, TestAction>(
          "agent2",
          (action, context) => {
            actionLog.push(`agent2 received ${action.type}`);
            if (action.type === "INCREMENT") {
              context.dispatch({ type: "DOUBLE" });
              context.updateGlobalState(state => state + action.amount);
            }
          }
        );

        const agent3 = createAgent<number, TestAction>(
          "agent3",
          (action, context) => {
            actionLog.push(`agent3 received ${action.type}`);
            if (action.type === "DOUBLE") {
              context.updateGlobalState(state => state * 2);
            }
          }
        );

        const simulation = createEventSimulation<number, TestAction>({
          initialGlobalState: 0,
          agents: [agent1, agent2, agent3],
        });

        await simulation.dispatch({ type: "START" });

        // Should process: START → INCREMENT → DOUBLE
        expect(actionLog).toEqual([
          "agent1 received START",
          "agent2 received START", 
          "agent3 received START",
          "agent1 received INCREMENT",
          "agent2 received INCREMENT",
          "agent3 received INCREMENT", 
          "agent1 received DOUBLE",
          "agent2 received DOUBLE",
          "agent3 received DOUBLE",
        ]);

        // Global state: 0 + 1 = 1, then 1 * 2 = 2
        expect(simulation.getGlobalState()).toBe(2);
      });

      it("should handle async agent actions", async () => {
        const agent = createAgent<number, TestAction>(
          "async-agent",
          async (action, context) => {
            if (action.type === "INCREMENT") {
              await new Promise(resolve => setTimeout(resolve, 1));
              context.updateGlobalState(state => state + action.amount);
            }
          }
        );

        const simulation = createEventSimulation<number, TestAction>({
          initialGlobalState: 10,
          agents: [agent],
        });

        await simulation.dispatch({ type: "INCREMENT", amount: 5 });

        expect(simulation.getGlobalState()).toBe(15);
      });
    });
  });
});
