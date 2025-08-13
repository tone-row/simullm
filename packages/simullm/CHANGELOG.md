# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-01-13

### Added
- **Exit Conditions**: Required `shouldExit` property in `SimulationConfig` for controlled simulation termination
- `ExitContext` interface providing access to global state, agent states, last action, and action count
- `getActionCount()` method to retrieve total processed actions
- `hasSimulationExited()` method to check simulation exit status
- Comprehensive test suite for exit condition functionality

### Changed
- **BREAKING**: `shouldExit` is now a required property in `SimulationConfig`
- All existing experiments updated to include exit conditions
- Enhanced simulation engine to track action count and exit state

### Fixed
- Prevention of infinite loops through proper exit condition handling
- Proper cleanup of action queue when exit condition is met

## [0.1.0] - 2025-01-10

### Added
- Initial release of simullm framework
- Event-driven Agent-Based Modeling system
- `EventSimulation` class with action dispatching
- `createSimulation` and `createAgent` helper functions
- Support for global state and agent internal state management
- Cascading action support with async handling
- Example implementations (counter, ecosystem, market simulation)
- TypeScript support with full type safety