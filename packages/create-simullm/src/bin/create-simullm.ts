#!/usr/bin/env node

import { intro, outro, text, select, spinner } from '@clack/prompts';
import { createSimulation } from '../index.js';
import { execSync } from 'child_process';

function checkBunInstalled(): boolean {
  try {
    execSync('bun --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  intro('🚀 Welcome to create-simullm!');

  if (!checkBunInstalled()) {
    outro(`
⚠️  Bun is required but not found!

create-simullm projects are designed to work with Bun for optimal performance.
Please install Bun first: https://bun.sh

Then try again!
    `);
    process.exit(1);
  }

  const projectName = await text({
    message: 'What is your project name?',
    placeholder: 'my-simulation',
    validate: (value) => {
      if (!value) return 'Project name is required';
      if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
        return 'Project name can only contain letters, numbers, hyphens, and underscores';
      }
    }
  });

  if (typeof projectName === 'symbol') {
    outro('❌ Operation cancelled');
    process.exit(0);
  }

  const template = await select({
    message: 'Which template would you like to use?',
    options: [
      { value: 'basic', label: 'Basic Simulation', hint: 'Simple example to get started' },
      { value: 'dnd', label: 'D&D Adventure', hint: 'Multi-agent D&D game simulation' }
    ]
  });

  if (typeof template === 'symbol') {
    outro('❌ Operation cancelled');
    process.exit(0);
  }

  const s = spinner();
  s.start('Creating your SimulLM project...');

  try {
    await createSimulation({
      projectName,
      template: template as string,
      useTypeScript: true,
      installDeps: true
    });

    s.stop('✅ Project created successfully!');
    
    outro(`
🎉 Your SimulLM simulation is ready!

Next steps:
  1. cd ${projectName}
  2. Add your OpenRouter API key to .env file
     Get your API key: https://openrouter.ai/settings/keys
  3. bun run dev

Happy simulating! 🤖
    `);
  } catch (error) {
    s.stop('❌ Failed to create project');
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);