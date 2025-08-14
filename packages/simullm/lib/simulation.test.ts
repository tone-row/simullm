import { describe, it, expect } from "bun:test";
import { createSimulation, createAgent } from "./simulation.ts";

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
          shouldExit: () => false,
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
          shouldExit: () => false,
        });

        expect(simulation.getAgentInternalState("test-agent")).toBe(
          "initial-state"
        );
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
          shouldExit: () => false,
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
              context.updateGlobalState((state) => state + action.amount);
            }
          }
        );

        const simulation = createSimulation<number, TestAction>({
          initialGlobalState: 10,
          agents: [agent],
          shouldExit: () => false,
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
          shouldExit: () => false,
        });

        await simulation.dispatch({ type: "INCREMENT", amount: 3 });

        expect(simulation.getAgentInternalState("stateful-agent")).toEqual({
          counter: 3,
        });
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
              context.updateGlobalState((state) => state + action.amount);
            }
          }
        );

        const agent3 = createAgent<number, TestAction>(
          "agent3",
          (action, context) => {
            actionLog.push(`agent3 received ${action.type}`);
            if (action.type === "DOUBLE") {
              context.updateGlobalState((state) => state * 2);
            }
          }
        );

        const simulation = createSimulation<number, TestAction>({
          initialGlobalState: 0,
          agents: [agent1, agent2, agent3],
          shouldExit: () => false,
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
              await new Promise((resolve) => setTimeout(resolve, 1));
              context.updateGlobalState((state) => state + action.amount);
            }
          }
        );

        const simulation = createSimulation<number, TestAction>({
          initialGlobalState: 10,
          agents: [agent],
          shouldExit: () => false,
        });

        await simulation.dispatch({ type: "INCREMENT", amount: 5 });

        expect(simulation.getGlobalState()).toBe(15);
      });

      describe("Exit Conditions", () => {
        it("should exit simulation based on action count", async () => {
          let receivedActionCount = 0;
          const agent = createAgent<number, TestAction>(
            "test-agent",
            (action, context) => {
              receivedActionCount++;
              if (action.type === "INCREMENT") {
                context.updateGlobalState((state) => state + action.amount);
                // Dispatch another action to test cascading
                context.dispatch({ type: "DOUBLE" });
              }
            }
          );

          const simulation = createSimulation<number, TestAction>({
            initialGlobalState: 0,
            agents: [agent],
            shouldExit: ({ actionCount }) => actionCount >= 3,
          });

          // Dispatch actions that would normally cascade
          await simulation.dispatch({ type: "INCREMENT", amount: 1 });
          await simulation.dispatch({ type: "INCREMENT", amount: 2 });

          expect(simulation.getActionCount()).toBe(3);
          expect(receivedActionCount).toBe(3); // Should stop after 3 processed actions
        });

        it("should exit simulation based on global state", async () => {
          const agent = createAgent<number, TestAction>(
            "counter-agent",
            (action, context) => {
              if (action.type === "INCREMENT") {
                context.updateGlobalState((state) => state + action.amount);
              }
            }
          );

          const simulation = createSimulation<number, TestAction>({
            initialGlobalState: 0,
            agents: [agent],
            shouldExit: ({ globalState }) => globalState >= 10,
          });

          await simulation.dispatch({ type: "INCREMENT", amount: 5 }); // globalState = 5
          await simulation.dispatch({ type: "INCREMENT", amount: 8 }); // globalState = 13, should exit after this
          await simulation.dispatch({ type: "INCREMENT", amount: 1 }); // This should not be processed

          expect(simulation.getGlobalState()).toBe(13); // Should stop after reaching >= 10
          expect(simulation.getActionCount()).toBe(2);
        });

        it("should exit simulation based on agent internal state", async () => {
          interface CounterState {
            value: number;
          }

          const agent = createAgent<number, TestAction, CounterState>(
            "stateful-agent",
            (action, context) => {
              if (action.type === "INCREMENT") {
                context.updateInternalState((state: CounterState) => ({
                  value: state.value + action.amount,
                }));
              }
            },
            { value: 0 }
          );

          const simulation = createSimulation<number, TestAction>({
            initialGlobalState: 0,
            agents: [agent],
            shouldExit: ({ agentStates }) =>
              agentStates["stateful-agent"]?.value >= 5,
          });

          await simulation.dispatch({ type: "INCREMENT", amount: 2 }); // value = 2
          await simulation.dispatch({ type: "INCREMENT", amount: 4 }); // value = 6, should exit after this
          await simulation.dispatch({ type: "INCREMENT", amount: 1 }); // Should not be processed

          expect(simulation.getAgentInternalState("stateful-agent")).toEqual({
            value: 6,
          });
          expect(simulation.getActionCount()).toBe(2);
        });

        it("should exit simulation based on last action type", async () => {
          const agent = createAgent<number, TestAction>(
            "test-agent",
            (action, context) => {
              if (action.type === "INCREMENT") {
                context.updateGlobalState((state) => state + action.amount);
              }
            }
          );

          const simulation = createSimulation<number, TestAction>({
            initialGlobalState: 0,
            agents: [agent],
            shouldExit: ({ lastAction }) => lastAction.type === "DOUBLE",
          });

          await simulation.dispatch({ type: "INCREMENT", amount: 1 }); // globalState = 1
          await simulation.dispatch({ type: "DOUBLE" }); // Should exit after this
          await simulation.dispatch({ type: "INCREMENT", amount: 5 }); // Should not be processed

          expect(simulation.getGlobalState()).toBe(1); // Only first increment processed
          expect(simulation.getActionCount()).toBe(2);
        });

        it("should prevent infinite loops with complex exit conditions", async () => {
          const agent = createAgent<number, TestAction>(
            "recursive-agent",
            (action, context) => {
              if (action.type === "START") {
                context.dispatch({ type: "INCREMENT", amount: 1 });
              } else if (action.type === "INCREMENT") {
                context.updateGlobalState((state) => state + action.amount);
                if (context.globalState < 5) {
                  context.dispatch({ type: "INCREMENT", amount: 1 });
                }
              }
            }
          );

          const simulation = createSimulation<number, TestAction>({
            initialGlobalState: 0,
            agents: [agent],
            shouldExit: ({ globalState, actionCount }) =>
              globalState >= 3 || actionCount >= 10,
          });

          await simulation.dispatch({ type: "START" });

          expect(simulation.getGlobalState()).toBe(3);
          expect(simulation.getActionCount()).toBeLessThanOrEqual(10);
        });

        it("should provide correct exit context", async () => {
          let capturedContext: any = null;
          const agent = createAgent<number, TestAction>(
            "test-agent",
            (action, context) => {
              if (action.type === "INCREMENT") {
                context.updateGlobalState((state) => state + action.amount);
              }
            }
          );

          const simulation = createSimulation<number, TestAction>({
            initialGlobalState: 5,
            agents: [agent],
            shouldExit: (context) => {
              capturedContext = context;
              return context.actionCount >= 2;
            },
          });

          await simulation.dispatch({ type: "INCREMENT", amount: 3 });
          await simulation.dispatch({ type: "DOUBLE" });

          expect(capturedContext).toMatchObject({
            globalState: 8, // 5 + 3
            actionCount: 2,
            lastAction: { type: "DOUBLE" },
            agentStates: { "test-agent": undefined },
          });
        });

        it("should handle shouldExit throwing errors gracefully", async () => {
          const agent = createAgent<number, TestAction>(
            "test-agent",
            (action, context) => {
              if (action.type === "INCREMENT") {
                context.updateGlobalState((state) => state + action.amount);
              }
            }
          );

          const simulation = createSimulation<number, TestAction>({
            initialGlobalState: 0,
            agents: [agent],
            shouldExit: ({ actionCount }) => {
              if (actionCount === 2) {
                throw new Error("Exit condition error");
              }
              return false;
            },
          });

          // First dispatch should succeed
          await simulation.dispatch({ type: "INCREMENT", amount: 1 });

          // Second dispatch should throw when exit condition throws
          await expect(
            simulation.dispatch({ type: "INCREMENT", amount: 2 })
          ).rejects.toThrow("Exit condition error");
        });

        it("should correctly report simulation exit status", async () => {
          const agent = createAgent<number, TestAction>(
            "test-agent",
            (action, context) => {
              if (action.type === "INCREMENT") {
                context.updateGlobalState((state) => state + action.amount);
              }
            }
          );

          const simulation = createSimulation<number, TestAction>({
            initialGlobalState: 0,
            agents: [agent],
            shouldExit: ({ actionCount }) => actionCount >= 2,
          });

          expect(simulation.hasSimulationExited()).toBe(false);

          await simulation.dispatch({ type: "INCREMENT", amount: 1 });
          expect(simulation.hasSimulationExited()).toBe(false);

          await simulation.dispatch({ type: "INCREMENT", amount: 2 });
          expect(simulation.hasSimulationExited()).toBe(true);

          // Further dispatches should be ignored
          await simulation.dispatch({ type: "INCREMENT", amount: 100 });
          expect(simulation.getGlobalState()).toBe(3); // Should still be 1 + 2 = 3
          expect(simulation.getActionCount()).toBe(2);
        });

        it("should resolve exit promise when simulation exits", async () => {
          const agent = createAgent<number, TestAction>(
            "test-agent",
            (action, context) => {
              if (action.type === "INCREMENT") {
                context.updateGlobalState((state) => state + action.amount);
              }
            }
          );

          const simulation = createSimulation<number, TestAction>({
            initialGlobalState: 0,
            agents: [agent],
            shouldExit: ({ actionCount }) => actionCount >= 2,
          });

          // Start dispatching actions
          simulation.dispatch({ type: "INCREMENT", amount: 1 });
          simulation.dispatch({ type: "INCREMENT", amount: 2 });

          // Wait for simulation to complete
          await simulation.exit();

          expect(simulation.hasSimulationExited()).toBe(true);
          expect(simulation.getGlobalState()).toBe(3);
          expect(simulation.getActionCount()).toBe(2);
        });

        it("should handle exit promise with async actions", async () => {
          const agent = createAgent<number, TestAction>(
            "async-agent",
            async (action, context) => {
              if (action.type === "INCREMENT") {
                await new Promise((resolve) => setTimeout(resolve, 10));
                context.updateGlobalState((state) => state + action.amount);
              }
            }
          );

          const simulation = createSimulation<number, TestAction>({
            initialGlobalState: 0,
            agents: [agent],
            shouldExit: ({ globalState }) => globalState >= 5,
          });

          // Start dispatching actions
          simulation.dispatch({ type: "INCREMENT", amount: 3 });
          simulation.dispatch({ type: "INCREMENT", amount: 4 });

          // Wait for simulation to complete
          await simulation.exit();

          expect(simulation.hasSimulationExited()).toBe(true);
          expect(simulation.getGlobalState()).toBe(7);
        });

        it("should handle exit promise with cascading actions", async () => {
          const agent = createAgent<number, TestAction>(
            "cascading-agent",
            (action, context) => {
              if (action.type === "START") {
                context.dispatch({ type: "INCREMENT", amount: 1 });
              } else if (action.type === "INCREMENT") {
                context.updateGlobalState((state) => state + action.amount);
                if (context.globalState < 3) {
                  context.dispatch({ type: "INCREMENT", amount: 1 });
                }
              }
            }
          );

          const simulation = createSimulation<number, TestAction>({
            initialGlobalState: 0,
            agents: [agent],
            shouldExit: ({ globalState }) => globalState >= 3,
          });

          // Start the simulation
          simulation.dispatch({ type: "START" });

          // Wait for simulation to complete
          await simulation.exit();

          expect(simulation.hasSimulationExited()).toBe(true);
          expect(simulation.getGlobalState()).toBe(3);
        });

        it("should handle multiple awaits on same exit promise", async () => {
          const agent = createAgent<number, TestAction>(
            "test-agent",
            (action, context) => {
              if (action.type === "INCREMENT") {
                context.updateGlobalState((state) => state + action.amount);
              }
            }
          );

          const simulation = createSimulation<number, TestAction>({
            initialGlobalState: 0,
            agents: [agent],
            shouldExit: ({ actionCount }) => actionCount >= 1,
          });

          // Start dispatching
          simulation.dispatch({ type: "INCREMENT", amount: 5 });

          // Multiple awaits should all resolve
          const [result1, result2, result3] = await Promise.all([
            simulation.exit(),
            simulation.exit(),
            simulation.exit(),
          ]);

          expect(result1).toBeUndefined();
          expect(result2).toBeUndefined();
          expect(result3).toBeUndefined();
          expect(simulation.hasSimulationExited()).toBe(true);
        });

        it("should process actions dispatched asynchronously by agents - REPRODUCTION TEST", async () => {
          let messageCount = 0;
          const receivedMessages: string[] = [];

          const alice = createAgent<number, TestAction>(
            "alice",
            (action, context) => {
              if (action.type === "START") {
                messageCount++;
                receivedMessages.push(`Alice message ${messageCount}`);

                // Simulate async action dispatch (like setTimeout in the bug report)
                setTimeout(() => {
                  if (messageCount < 3) {
                    context.dispatch({ type: "START" });
                  }
                }, 10);
              }
            }
          );

          const simulation = createSimulation<number, TestAction>({
            initialGlobalState: 0,
            agents: [alice],
            shouldExit: ({ actionCount }) => actionCount >= 5, // Allow plenty of actions
          });

          await simulation.dispatch({ type: "START" });

          // Wait a bit for async actions to potentially process
          await new Promise((resolve) => setTimeout(resolve, 100));

          // If the bug exists, Alice should only speak once
          // If fixed, Alice should speak 3 times
          expect(messageCount).toBe(3);
          expect(receivedMessages).toEqual([
            "Alice message 1",
            "Alice message 2",
            "Alice message 3",
          ]);
        });

        describe("Agent Coordination", () => {
          it("should provide allAgents in context for coordination", async () => {
            interface CoordinationState {
              role: string;
              status: string;
            }

            let capturedAllAgents: any = null;

            const coordinator = createAgent<
              number,
              TestAction,
              CoordinationState
            >(
              "coordinator",
              (action, context) => {
                if (action.type === "START") {
                  capturedAllAgents = context.allAgents;
                  context.updateInternalState((state) => ({
                    ...state,
                    status: "coordinating",
                  }));
                }
              },
              { role: "leader", status: "idle" }
            );

            const worker1 = createAgent<number, TestAction, CoordinationState>(
              "worker1",
              (action, context) => {},
              { role: "worker", status: "waiting" }
            );

            const worker2 = createAgent<number, TestAction, CoordinationState>(
              "worker2",
              (action, context) => {},
              { role: "worker", status: "ready" }
            );

            const simulation = createSimulation<number, TestAction>({
              initialGlobalState: 0,
              agents: [coordinator, worker1, worker2],
              shouldExit: ({ actionCount }) => actionCount >= 1,
            });

            await simulation.dispatch({ type: "START" });

            expect(capturedAllAgents).toEqual([
              {
                id: "coordinator",
                internalState: { role: "leader", status: "idle" },
              },
              {
                id: "worker1",
                internalState: { role: "worker", status: "waiting" },
              },
              {
                id: "worker2",
                internalState: { role: "worker", status: "ready" },
              },
            ]);
          });

          it("should allow agents to coordinate based on other agents' states", async () => {
            interface TaskState {
              taskQueue: string[];
              isWorking: boolean;
            }

            const taskDispatcher = createAgent<number, TestAction, TaskState>(
              "dispatcher",
              (action, context) => {
                if (action.type === "START") {
                  // Find available workers based on their internal states
                  const availableWorkers = context.allAgents
                    .filter(
                      (agent) =>
                        agent.id !== "dispatcher" &&
                        !agent.internalState?.isWorking
                    )
                    .map((agent) => agent.id);

                  if (availableWorkers.length > 0) {
                    // Assign tasks to available workers
                    availableWorkers.forEach((workerId) => {
                      context.dispatch({
                        type: "COMPLETED",
                        agentId: workerId,
                      });
                    });

                    context.updateInternalState((state) => ({
                      ...state,
                      taskQueue: state.taskQueue.filter(
                        (_: string, index: number) =>
                          index >= availableWorkers.length
                      ),
                    }));
                  }
                }
              },
              { taskQueue: ["task1", "task2", "task3"], isWorking: false }
            );

            const worker1 = createAgent<number, TestAction, TaskState>(
              "worker1",
              (action, context) => {
                if (
                  action.type === "COMPLETED" &&
                  action.agentId === "worker1"
                ) {
                  context.updateInternalState((state) => ({
                    ...state,
                    isWorking: true,
                  }));
                  context.updateGlobalState((state) => state + 1);
                }
              },
              { taskQueue: [], isWorking: false }
            );

            const worker2 = createAgent<number, TestAction, TaskState>(
              "worker2",
              (action, context) => {
                if (
                  action.type === "COMPLETED" &&
                  action.agentId === "worker2"
                ) {
                  context.updateInternalState((state) => ({
                    ...state,
                    isWorking: true,
                  }));
                  context.updateGlobalState((state) => state + 1);
                }
              },
              { taskQueue: [], isWorking: true } // Already working
            );

            const simulation = createSimulation<number, TestAction>({
              initialGlobalState: 0,
              agents: [taskDispatcher, worker1, worker2],
              shouldExit: ({ actionCount }) => actionCount >= 5,
            });

            await simulation.dispatch({ type: "START" });

            // Only worker1 should have been assigned a task (worker2 was already working)
            expect(simulation.getGlobalState()).toBe(1);
            expect(simulation.getAgentInternalState("worker1").isWorking).toBe(
              true
            );
            expect(simulation.getAgentInternalState("worker2").isWorking).toBe(
              true
            );

            // Task queue should be reduced by 1 (only worker1 got a task)
            expect(
              simulation.getAgentInternalState("dispatcher").taskQueue
            ).toEqual(["task2", "task3"]);
          });

          it("should provide consistent allAgents state across action processing", async () => {
            let allAgentsSnapshots: any[] = [];

            const observer = createAgent<number, TestAction>(
              "observer",
              (action, context) => {
                // Capture allAgents state at each action
                allAgentsSnapshots.push(
                  JSON.parse(JSON.stringify(context.allAgents))
                );

                if (action.type === "START") {
                  context.dispatch({ type: "INCREMENT", amount: 1 });
                }
              }
            );

            const counter = createAgent<number, TestAction, { count: number }>(
              "counter",
              (action, context) => {
                // Capture allAgents state when this agent processes actions
                if (action.type === "INCREMENT") {
                  allAgentsSnapshots.push(
                    JSON.parse(JSON.stringify(context.allAgents))
                  );
                  context.updateInternalState((state) => ({
                    count: state.count + action.amount,
                  }));
                  context.updateGlobalState((state) => state + action.amount);
                }
              },
              { count: 0 }
            );

            const simulation = createSimulation<number, TestAction>({
              initialGlobalState: 0,
              agents: [observer, counter],
              shouldExit: ({ actionCount }) => actionCount >= 2,
            });

            await simulation.dispatch({ type: "START" });

            // Should have captured 3 snapshots:
            // 1. Observer during START action
            // 2. Counter during START action
            // 3. Counter during INCREMENT action
            expect(allAgentsSnapshots).toHaveLength(3);

            // All snapshots should show counter with initial state (0)
            // because allAgents reflects state at the START of each action processing
            allAgentsSnapshots.forEach((snapshot) => {
              expect(snapshot).toContainEqual({
                id: "counter",
                internalState: { count: 0 },
              });
            });

            // But after actions are processed, the counter's state should be updated
            expect(simulation.getAgentInternalState("counter")).toEqual({
              count: 1,
            });
          });
        });
      });
    });
  });
});
