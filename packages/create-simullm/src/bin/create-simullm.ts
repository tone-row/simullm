#!/usr/bin/env node

import { intro, outro, text, select, spinner } from '@clack/prompts';
import { createSimulation, createCustomSimulation } from '../index.js';
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
      { value: 'dnd', label: 'D&D Adventure', hint: 'Multi-agent D&D game simulation' },
      { value: 'custom', label: 'Custom AI-Generated', hint: 'Describe your simulation and let AI generate it' }
    ]
  });

  if (typeof template === 'symbol') {
    outro('❌ Operation cancelled');
    process.exit(0);
  }

  let customDescription = '';
  if (template === 'custom') {
    customDescription = await text({
      message: 'Describe your simulation in detail:',
      placeholder: 'A simulation of birds flocking together, avoiding predators while searching for food in a forest environment...',
      validate: (value) => {
        if (!value || value.length < 10) {
          return 'Please provide a detailed description (at least 10 characters)';
        }
      }
    }) as string;

    if (typeof customDescription === 'symbol') {
      outro('❌ Operation cancelled');
      process.exit(0);
    }
  }

  const s = spinner();
  
  try {
    if (template === 'custom') {
      s.start('🤖 Generating your custom simulation with AI...');
      
      await createCustomSimulation({
        projectName,
        description: customDescription,
        useTypeScript: true,
        installDeps: true
      });
    } else {
      s.start('Creating your SimulLM project...');
      
      await createSimulation({
        projectName,
        template: template as string,
        useTypeScript: true,
        installDeps: true
      });
    }

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
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(console.error);