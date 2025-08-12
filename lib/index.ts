// Main library exports for simullm
// Event-driven Agent-Based Modeling framework for TypeScript

// Export all types
export type {
  Agent,
  Context,
  SimulationConfig,
  ActionDispatcher,
} from "./types.ts";

// Export the main simulation class and utilities
export {
  EventSimulation,
  createSimulation,
  createAgent,
} from "./simulation.ts";