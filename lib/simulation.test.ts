import { describe, it, expect } from "bun:test";
import {
  createSimulation,
  createAgent,
} from "./simulation.ts";

describe("ABM Framework", () => {
  describe("Event-Driven Framework (Primary API)", () => {
    type TestAction = 
      | { type: "START" }
      | { type: "INCREMENT"; amount: number }
      | { type: "DOUBLE" }
      | { type: "COMPLETED"; agentId: string };

    describe("EventSimulation", () => {
      it("should create simulation with correct initial state", () => {
        const simulation = createSimulation<number, TestAction>({
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

        const simulation = createSimulation<number, TestAction>({
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

        const simulation = createSimulation<number, TestAction>({
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

        const simulation = createSimulation<number, TestAction>({
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

        const simulation = createSimulation<number, TestAction>({
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

        const simulation = createSimulation<number, TestAction>({
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

        const simulation = createSimulation<number, TestAction>({
          initialGlobalState: 10,
          agents: [agent],
        });

        await simulation.dispatch({ type: "INCREMENT", amount: 5 });

        expect(simulation.getGlobalState()).toBe(15);
      });
    });
  });
});
