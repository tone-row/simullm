# Agent-Based Modeling Framework

A simple, functional, and strongly-typed framework for agent-based modeling in TypeScript.

## Features

- **Functional approach**: No classical OOP, pure functions and immutable state
- **Strongly typed**: Full TypeScript support with generic state types
- **Async support**: Actions can be synchronous or asynchronous
- **Simple API**: Easy to create nodes and run simulations
- **Testable**: Built-in testing with bun:test

## Core Concepts

### Node

A node represents an agent in the simulation. Each node has:

- `id`: Unique identifier
- `action`: A function that takes the current state and returns a new state

### Action

An action is a function that transforms the simulation state:

```typescript
type Action<TState> = (state: TState) => Promise<TState> | TState;
```

### Simulation

A simulation runs for a specified number of turns, executing each node's action in sequence.

## Usage

### Basic Example

```typescript
import {
  runSimulation,
  createNode,
  createSyncAction,
} from "./src/simulation.ts";

// Define your state type
interface MyState {
  value: number;
}

// Create actions
const incrementAction = createSyncAction<MyState>((state) => ({
  ...state,
  value: state.value + 1,
}));

const doubleAction = createSyncAction<MyState>((state) => ({
  ...state,
  value: state.value * 2,
}));

// Create nodes
const incrementNode = createNode("increment", incrementAction);
const doubleNode = createNode("double", doubleAction);

// Run simulation
const result = await runSimulation({
  initialState: { value: 1 },
  nodes: [incrementNode, doubleNode],
  maxTurns: 5,
});

console.log(result.finalState.value); // Final state after 5 turns
```

### Ecosystem Example

The framework includes a predator-prey ecosystem simulation demonstrating more complex interactions:

```typescript
import { runEcosystemExample } from "./src/ecosystem-example.ts";

await runEcosystemExample();
```

## API Reference

### Core Functions

- `createNode(id: string, action: Action<TState>)`: Creates a new node
- `createSyncAction(action: (state: TState) => TState)`: Creates a synchronous action
- `createAsyncAction(action: (state: TState) => Promise<TState>)`: Creates an asynchronous action
- `runSimulation(config: SimulationConfig<TState>)`: Runs a complete simulation
- `executeTurn(state: SimulationState<TState>)`: Executes a single turn

### Types

- `Node<TState>`: Represents an agent with an ID and action
- `Action<TState>`: Function that transforms state
- `SimulationConfig<TState>`: Configuration for running a simulation
- `SimulationResult<TState>`: Result of a completed simulation

## Running

```bash
# Run the demo
bun run index.ts

# Run tests
bun test

# Run specific test file
bun test src/simulation.test.ts
```

## Future Enhancements

This is a foundation that can be extended with:

- Spatial relationships between agents
- More complex interaction patterns
- Visualization tools
- Performance optimizations
- Classic ABM paper reimplementations

## Architecture

The framework follows a functional approach:

- Immutable state transformations
- Pure functions for actions
- Composition over inheritance
- Strong typing throughout
