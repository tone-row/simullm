# Agent-Based Modeling Framework

A TypeScript framework for creating agent-based simulations with support for LLM-powered agents.

## Quick Start

```bash
# Install dependencies
bun install

# Run tests
bun test
```

## How Simulations Work

Every simulation follows these steps:

1. **Define State** - What data your simulation tracks
2. **Create Actions** - Functions that modify the state
3. **Create Nodes** - Agents that perform actions
4. **Configure & Run** - Set initial conditions and execute

Each simulation turn:

- Executes all node actions sequentially
- Each action receives current state, returns new state
- State is immutable - actions return modified copies

## Your First Simulation

Here's the simplest possible simulation - a counter that increments:

```typescript
import {
  runSimulation,
  createNode,
  createSyncAction,
} from "./lib/simulation.ts";

// 1. Define the global state of your simulation
interface CounterState {
  count: number;
}

// 2. Create an action that modifies the state
const increment = createSyncAction<CounterState>((state) => ({
  count: state.count + 1,
}));

// 3. Create a node (agent) that performs the action
const incrementNode = createNode("increment", increment);

// 4. Configure and run the simulation
const result = await runSimulation({
  initialState: { count: 0 },
  nodes: [incrementNode],
  maxTurns: 3,
});

console.log(result.finalState.count); // 3
console.log(result.turnHistory); // Full history: [{count:0}, {count:1}, {count:2}, {count:3}]
```

**Result**: Counter goes 0 → 1 → 2 → 3 over 3 turns.

## Multi-Agent Example

Here's a simple ecosystem with rabbits and grass:

```typescript
import {
  runSimulation,
  createNode,
  createSyncAction,
} from "./lib/simulation.ts";

interface EcosystemState {
  rabbits: number;
  grass: number;
}

// Rabbits eat grass and reproduce
const rabbitAction = createSyncAction<EcosystemState>((state) => {
  const grassEaten = Math.min(state.rabbits, state.grass);
  const newRabbits = state.rabbits + Math.floor(grassEaten * 0.5);

  return {
    rabbits: newRabbits,
    grass: Math.max(0, state.grass - grassEaten),
  };
});

// Grass regrows
const grassAction = createSyncAction<EcosystemState>((state) => ({
  ...state,
  grass: state.grass + 2,
}));

// Create nodes and run
const result = await runSimulation({
  initialState: { rabbits: 2, grass: 10 },
  nodes: [
    createNode("rabbits", rabbitAction),
    createNode("grass", grassAction),
  ],
  maxTurns: 5,
});

// Print results
result.turnHistory.forEach((state, turn) => {
  console.log(`Turn ${turn}: Rabbits=${state.rabbits}, Grass=${state.grass}`);
});
```

This creates population dynamics where rabbits consume grass to reproduce while grass regrows each turn.

## Project Structure

```
lib/                           # Core framework
├── simulation.ts              # Main simulation engine
├── types.ts                   # Type definitions
├── simulation-with-internal-state.ts   # Extended version with node-internal state
└── types-with-internal-state.ts        # Extended types

experiments/                   # Example simulations
├── counter/                   # Simple counter examples
├── ecosystem/                 # Predator-prey dynamics
└── market/                    # Economic boom-bust cycles with LLMs
```

## Advanced Features

### Internal Node State

For complex agents that need memory, use the extended framework:

```typescript
import {
  runSimulationWithInternalState,
  createNodeWithInternalState,
} from "./lib/simulation-with-internal-state.ts";
```

This allows each node to maintain private state separate from the global simulation state.

### LLM Integration

See `experiments/market/boom-bust.ts` for an example of using LLMs as trading agents that make decisions based on market conditions.

## API Reference

### Core Functions

- `runSimulation(config)` - Execute a complete simulation
- `createNode(id, action)` - Create an agent node
- `createSyncAction(fn)` - Create synchronous action
- `createAsyncAction(fn)` - Create asynchronous action (for LLM calls)

### Key Types

- `Action<TState>` - Function that transforms state: `(state: TState) => TState | Promise<TState>`
- `Node<TState>` - Agent with `id` and `action`
- `SimulationConfig<TState>` - `{ initialState, nodes, maxTurns? }`
- `SimulationResult<TState>` - `{ finalState, turnHistory, totalTurns }`

## Creating Your Own Simulation

1. **Design your state interface** - What variables define your system?
2. **Identify agents** - What entities act in your simulation?
3. **Define actions** - How does each agent modify the state?
4. **Set parameters** - Initial conditions and run length
5. **Analyze results** - Use `turnHistory` to track dynamics over time

Look at files in `experiments/` for patterns and inspiration.

## Examples

- **Simple Counter** (`experiments/counter/simple.ts`) - Basic state modification
- **Ecosystem** (`experiments/ecosystem/predator-prey.ts`) - Multi-agent interactions
- **Market Simulation** (`experiments/market/boom-bust.ts`) - LLM-powered economic agents

## Running Examples

```bash
# Run specific example
bun run experiments/counter/simple.ts

# Run tests
bun test lib/simulation.test.ts
```

The framework is designed to be simple yet extensible - start with basic examples and gradually add complexity as needed for your research.
