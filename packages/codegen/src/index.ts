import { startFramework } from "@tonerow/agent-framework";
import { generateCodeGoal } from "./generate-code";
import "./first-implementation";

if (require.main === module) {
  startFramework([generateCodeGoal]);
}

export { getSystemPrompt } from "./first-implementation";
