# simullm

Event-driven Agent-Based Modeling framework for TypeScript.

## Features

- **Event-driven architecture**: Agents respond to actions/messages in a reactive system
- **Type-safe**: Full TypeScript support with generic types for state and actions
- **Flexible state management**: Both global state and agent internal state
- **Exit conditions**: Required termination logic prevents infinite loops
- **Async support**: Handles both synchronous and asynchronous agent actions
- **Action cascading**: Agents can dispatch new actions during processing
- **Memory management**: Agents can maintain internal state across turns

## Installation

```bash
npm install simullm
# or
bun add simullm
```

## Quick Start

```typescript
import { createSimulation, createAgent } from 'simullm';

// Define your state and action types
interface CounterState {
  value: number;
}

type CounterAction = 
  | { type: "INCREMENT"; amount: number }
  | { type: "RESET" };

// Create agents
const counterAgent = createAgent<CounterState, CounterAction>(
  "counter",
  (action, context) => {
    if (action.type === "INCREMENT") {
      context.updateGlobalState(state => ({
        value: state.value + action.amount
      }));
    } else if (action.type === "RESET") {
      context.updateGlobalState(state => ({ value: 0 }));
    }
  }
);

// Create simulation with required exit condition
const simulation = createSimulation<CounterState, CounterAction>({
  initialGlobalState: { value: 0 },
  agents: [counterAgent],
  shouldExit: ({ actionCount, globalState }) => 
    actionCount >= 10 || globalState.value >= 100
});

// Run simulation
await simulation.dispatch({ type: "INCREMENT", amount: 5 });
await simulation.dispatch({ type: "INCREMENT", amount: 15 });

console.log(simulation.getGlobalState()); // { value: 20 }
console.log(simulation.getActionCount()); // 2
```

## Core Concepts

### Agents
Agents are reactive entities that respond to actions. They can:
- Update global state
- Update their own internal state  
- Dispatch new actions
- Maintain memory across turns

### Actions
Actions are messages passed through the system. All agents receive every action and can choose to respond.

### Exit Conditions (Required)
Every simulation must define when to stop via the `shouldExit` function. You have access to:
- `globalState`: Current global state
- `agentStates`: All agent internal states
- `lastAction`: The action that was just processed
- `actionCount`: Total number of processed actions

## Examples

### Basic Counter
```typescript
const simulation = createSimulation({
  initialGlobalState: { value: 0 },
  agents: [counterAgent],
  shouldExit: ({ actionCount }) => actionCount >= 5
});
```

### State-based Exit
```typescript
const simulation = createSimulation({
  initialGlobalState: { temperature: 20 },
  agents: [heatingAgent, coolingAgent],
  shouldExit: ({ globalState }) => 
    globalState.temperature >= 100 || globalState.temperature <= 0
});
```

### Agent Memory Exit
```typescript
const simulation = createSimulation({
  initialGlobalState: { score: 0 },
  agents: [learningAgent],
  shouldExit: ({ agentStates }) => 
    agentStates["learner"]?.experience >= 1000
});
```

## API Reference

### `createSimulation<TGlobalState, TAction>(config)`

Creates a new simulation instance.

**Config:**
- `initialGlobalState: TGlobalState` - Starting global state
- `agents: Agent[]` - Array of agents to participate
- `shouldExit: (context: ExitContext) => boolean` - **Required** exit condition

**Returns:** `EventSimulation<TGlobalState, TAction>`

### `createAgent<TGlobalState, TAction, TInternalState>(id, onAction, initialInternalState?)`

Creates a new agent.

**Parameters:**
- `id: string` - Unique agent identifier
- `onAction: (action, context) => void | Promise<void>` - Action handler
- `initialInternalState?: TInternalState` - Optional internal state

### `EventSimulation` Methods

- `dispatch(action)` - Dispatch an action to all agents
- `getGlobalState()` - Get current global state
- `getAgentInternalState(agentId)` - Get agent's internal state
- `getAllAgentStates()` - Get all agent internal states
- `getActionCount()` - Get total processed actions
- `hasSimulationExited()` - Check if simulation has terminated

## Advanced Usage

See the `/experiments` directory for complete examples:
- Counter simulation with turn-based agents
- Predator-prey ecosystem simulation  
- Market trading simulation with LLM agents

## Migration from v0.1.x

**Breaking Change:** The `shouldExit` property is now required in `SimulationConfig`.

**Before (v0.1.x):**
```typescript
const simulation = createSimulation({
  initialGlobalState: { value: 0 },
  agents: [myAgent]
  // Could run infinitely
});
```

**After (v0.2.x):**
```typescript
const simulation = createSimulation({
  initialGlobalState: { value: 0 },
  agents: [myAgent],
  shouldExit: ({ actionCount }) => actionCount >= 10 // Required
});
```

## Development

### Release Process

Use the automated release script:

```bash
bun run release
```

This handles:
- Version bumping (patch/minor/major)
- Changelog updates
- Git commit and tagging
- Pushing to remote
- npm publishing

See `scripts/README.md` for details.

## License

MIT