# ABM-LLM

A TypeScript framework for creating event-driven agent-based simulations with support for LLM-powered agents.

## Quick Start

```bash
# Install dependencies
bun install

# Run tests
bun test
```

## How Event-Driven Simulations Work

Simulations are built around **agents** that respond to **actions**:

1. **Define Global State** - What data your simulation tracks globally
2. **Create Agents** - Functions that respond to actions and modify state
3. **Dispatch Actions** - Trigger events that agents can respond to
4. **Emergent Behavior** - Complex patterns emerge from agent interactions

Key concepts:
- **Actions** are events dispatched through the system (e.g., `{ type: "DAY_START" }`)
- **Agents** listen for actions and can update global state, internal state, or dispatch new actions
- **Facilitation** emerges from agent coordination rather than pre-defined patterns

## Your First Simulation

Here's a simple counter simulation using multiple agents:

```typescript
import { createSimulation, createAgent } from "./lib/simulation.ts";

// 1. Define the global state
interface CounterState {
  count: number;
}

// 2. Define action types
type CounterAction = 
  | { type: "START" }
  | { type: "INCREMENT"; amount: number };

// 3. Create a facilitator agent
const facilitator = createAgent<CounterState, CounterAction>(
  "facilitator",
  (action, context) => {
    if (action.type === "START") {
      context.dispatch({ type: "INCREMENT", amount: 1 });
    }
  }
);

// 4. Create a counter agent
const counter = createAgent<CounterState, CounterAction>(
  "counter", 
  (action, context) => {
    if (action.type === "INCREMENT") {
      context.updateGlobalState(state => ({ count: state.count + action.amount }));
    }
  }
);

// 5. Create and run simulation
const simulation = createSimulation<CounterState, CounterAction>({
  initialGlobalState: { count: 0 },
  agents: [facilitator, counter],
});

await simulation.dispatch({ type: "START" });

console.log(simulation.getGlobalState().count); // 1
```

## Multi-Agent Ecosystem Example

Here's a predator-prey ecosystem where agents coordinate through events:

```typescript
import { createSimulation, createAgent } from "./lib/simulation.ts";

interface EcosystemState {
  rabbits: number;
  grass: number;
  day: number;
}

type EcosystemAction =
  | { type: "DAY_START"; day: number }
  | { type: "RABBITS_EAT"; amount: number }
  | { type: "GRASS_GROWS"; amount: number };

// Rabbit agent responds to new days
const rabbitAgent = createAgent<EcosystemState, EcosystemAction>(
  "rabbits",
  (action, context) => {
    if (action.type === "DAY_START") {
      const grassEaten = Math.min(context.globalState.rabbits, context.globalState.grass);
      context.dispatch({ type: "RABBITS_EAT", amount: grassEaten });
    }
    
    if (action.type === "RABBITS_EAT") {
      // Update rabbit population based on food
      const newRabbits = Math.max(1, Math.floor(context.globalState.rabbits * 1.1));
      context.updateGlobalState(state => ({ ...state, rabbits: newRabbits }));
    }
  }
);

// Grass agent responds to rabbit eating
const grassAgent = createAgent<EcosystemState, EcosystemAction>(
  "grass",
  (action, context) => {
    if (action.type === "RABBITS_EAT") {
      // Reduce grass
      context.updateGlobalState(state => ({ 
        ...state, 
        grass: Math.max(0, state.grass - action.amount) 
      }));
      
      // Then regrow
      context.dispatch({ type: "GRASS_GROWS", amount: 10 });
    }
    
    if (action.type === "GRASS_GROWS") {
      context.updateGlobalState(state => ({ 
        ...state, 
        grass: Math.min(100, state.grass + action.amount) 
      }));
    }
  }
);

const simulation = createSimulation<EcosystemState, EcosystemAction>({
  initialGlobalState: { rabbits: 5, grass: 50, day: 0 },
  agents: [rabbitAgent, grassAgent],
});

// Start the ecosystem
await simulation.dispatch({ type: "DAY_START", day: 1 });
```

## Agents with Internal State

Agents can maintain their own private state for memory, learning, or coordination:

```typescript
interface AgentMemory {
  lastAction: string;
  energy: number;
}

const learningAgent = createAgent<GlobalState, Action, AgentMemory>(
  "learner",
  (action, context) => {
    if (action.type === "WORK_REQUEST") {
      // Use internal state for decision making
      const canWork = context.internalState.energy > 50;
      
      if (canWork) {
        context.updateGlobalState(state => ({ ...state, work: state.work + 10 }));
        context.updateInternalState(state => ({ 
          ...state, 
          energy: state.energy - 20,
          lastAction: "worked"
        }));
      }
    }
  },
  { lastAction: "none", energy: 100 } // Initial internal state
);
```

## Project Structure

```
lib/                     # Core framework
├── simulation.ts        # Event-driven simulation engine  
├── types.ts            # Type definitions
└── simulation.test.ts  # Comprehensive test suite

experiments/            # Example simulations
├── counter/           # Simple counter examples
├── ecosystem/         # Predator-prey dynamics  
└── market/           # Economic simulations with LLMs

tmp/                   # Development examples
└── *.ts              # Quick test scenarios
```

## Advanced Patterns

### Facilitator Agents

Create agents that coordinate others through event dispatch:

```typescript
const facilitator = createAgent<State, Action, FacilitatorState>(
  "facilitator",
  (action, context) => {
    if (action.type === "START") {
      context.dispatch({ type: "TURN_START", agentId: "player1" });
    }
    
    if (action.type === "TURN_COMPLETE") {
      const nextPlayer = getNextPlayer(action.agentId);
      context.dispatch({ type: "TURN_START", agentId: nextPlayer });
    }
  },
  { currentTurn: 0, playerOrder: ["player1", "player2"] }
);
```

### LLM-Powered Agents

See `experiments/market/boom-bust.ts` for examples of agents that use LLMs to make decisions based on simulation state.

### Cascading Actions

Actions can trigger chains of other actions, creating complex emergent behaviors:

```typescript
const triggerAgent = createAgent<State, Action>(
  "trigger",
  (action, context) => {
    if (action.type === "START") {
      context.dispatch({ type: "PHASE_1" });
    }
  }
);

const responderAgent = createAgent<State, Action>(
  "responder", 
  (action, context) => {
    if (action.type === "PHASE_1") {
      context.dispatch({ type: "PHASE_2" });
    }
  }
);
```

## API Reference

### Core Functions

- `createSimulation<TGlobalState, TAction>(config)` - Create a new simulation
- `createAgent<TGlobalState, TAction, TInternalState?>(id, onAction, initialInternalState?)` - Create an agent

### Agent Context

Each agent receives a context object with:
- `globalState` - Current global state (read-only)
- `internalState` - Agent's private state (read-only)  
- `dispatch(action)` - Dispatch new actions
- `updateGlobalState(updater)` - Modify global state
- `updateInternalState(updater)` - Modify agent's internal state

### Simulation Methods

- `dispatch(action)` - Send action to all agents
- `getGlobalState()` - Get current global state
- `getAgentInternalState(agentId)` - Get agent's internal state

## Running Examples

```bash
# Run specific example
bun run experiments/counter/simple.ts

# Run all tests  
bun test

# Test specific tmp file
bun run tmp/02-multi-agent-ecosystem.ts
```

## Creating Your Own Simulation

1. **Design your global state** - What shared data drives your system?
2. **Define your actions** - What events can occur?
3. **Create agents** - What entities respond to these events?
4. **Add facilitation** - How do agents coordinate with each other?
5. **Test and iterate** - Use the event-driven patterns to create emergent complexity

The framework is designed for flexibility - start simple and let complex behaviors emerge from agent interactions.