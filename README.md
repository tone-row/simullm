# simullm

Event-driven Agent-Based Modeling framework for TypeScript.

## 📦 Package

The main package is located in [`packages/simullm/`](./packages/simullm/) - see its [README](./packages/simullm/README.md) for full documentation, API reference, and usage examples.

**Quick install:**
```bash
npm install simullm
# or  
bun add simullm
```

## 🏗️ Repository Structure

This is a monorepo containing:

```
.
├── packages/
│   └── simullm/           # 📦 Main package - Event-driven ABM framework
│       ├── lib/           # Core library code
│       ├── experiments/   # Example simulations
│       └── scripts/       # Release automation
└── apps/
    └── www/              # 🌐 Documentation website (coming soon)
```

## 🚀 Quick Start

```typescript
import { createSimulation, createAgent } from 'simullm';

const simulation = createSimulation({
  initialGlobalState: { value: 0 },
  agents: [myAgent], 
  shouldExit: ({ actionCount }) => actionCount >= 10 // Required in v0.2.0+
});

await simulation.dispatch({ type: "START" });
```

## 📚 Documentation

- **[Full Documentation](./packages/simullm/README.md)** - Complete usage guide and API reference
- **[Examples](./packages/simullm/experiments/)** - Counter, ecosystem, and market simulations  
- **[Changelog](./packages/simullm/CHANGELOG.md)** - Version history and breaking changes

## 🛠️ Development

This workspace uses Bun:

```bash
# Install dependencies
bun install

# Run tests for the main package
cd packages/simullm && bun test

# Release new version
cd packages/simullm && bun run release
```

## 📄 License

MIT
