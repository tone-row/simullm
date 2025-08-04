import { describe, it, expect } from "bun:test";
import {
  runSimulation,
  createNode,
  createAction,
  createSimulationState,
  executeTurn,
} from "./simulation.ts";
import type { SimulationConfig } from "./types.ts";

describe("ABM Framework", () => {
  describe("createSimulationState", () => {
    it("should create a simulation state with correct initial values", () => {
      const config: SimulationConfig<number> = {
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
      const incrementAction = createAction<number>((state) => state + 1);
      const doubleAction = createAction<number>((state) => state * 2);

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
      const asyncIncrementAction = createAction<number>(async (state) => {
        await new Promise((resolve) => setTimeout(resolve, 1)); // Simulate async work
        return state + 1;
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
      const incrementAction = createAction<number>((state) => state + 1);
      const nodes = [createNode("increment", incrementAction)];

      const config: SimulationConfig<number> = {
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
      const incrementAction = createAction<number>((state) => state + 1);
      const nodes = [createNode("increment", incrementAction)];

      const config: SimulationConfig<number> = {
        initialState: 0,
        nodes,
        maxTurns: 2,
      };

      const result = await runSimulation(config);

      expect(result.totalTurns).toBe(2);
      expect(result.turnHistory).toEqual([0, 1, 2]);
    });

    it("should use default maxTurns when not specified", async () => {
      const incrementAction = createAction<number>((state) => state + 1);
      const nodes = [createNode("increment", incrementAction)];

      const config: SimulationConfig<number> = {
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
      const action = createAction<number>((state) => state + 1);
      const node = createNode("test-node", action);

      expect(node.id).toBe("test-node");
      expect(typeof node.action).toBe("function");
    });

    it("should create sync actions correctly", () => {
      const action = createAction<number>((state) => state * 2);
      const result = action(5);

      expect(result).toBe(10);
    });

    it("should create async actions correctly", async () => {
      const action = createAction<number>(async (state) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return state * 3;
      });

      const result = await action(4);

      expect(result).toBe(12);
    });
  });
});
