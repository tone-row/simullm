- [x] actions should be separated
- [x] Fix the optional schema properties issue in the prompt
- [x] callLLM is not typed now for some reason
- [x] Switch back to openrouter gpt-4o-mini which has nicer rate-limits even if it's dumber
- [x] hit an anthropic rate limit that I wish I could have some protection against
- [x] Trying to access an 'allAgents' property on the contex that doesn't exist
- [x] Push new simullm version with .exit()
- [x] I do think the raw types would help, just the .d.ts, which could be compiled here
- [ ] Make sure that all 4 tests work as expected, no bugs, and run by default

Add allAgents property to agent context for multi-agent coordination. Fix critical bug where context.dispatch() didn't trigger action processing. Add exit() method for awaiting simulation completion. Improve documentation and add comprehensive tests.
