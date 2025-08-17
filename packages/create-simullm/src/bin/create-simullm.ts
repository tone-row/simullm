#!/usr/bin/env node

import { intro, outro, text, select, spinner, note } from '@clack/prompts';
import { createSimulation, createCustomSimulation } from '../index.js';
import { execSync } from 'child_process';
import pc from 'picocolors';

function checkBunInstalled(): boolean {
  try {
    execSync('bun --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  intro(`${pc.bgMagenta(pc.white(' SimuLLM '))} ${pc.magenta('✨ Welcome to create-simullm! ✨')}`);

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
    message: pc.cyan('What is your project name?'),
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
    message: pc.cyan('Which template would you like to use?'),
    options: [
      { value: 'basic', label: `${pc.green('🟢')} Basic Simulation`, hint: 'Simple example to get started' },
      { value: 'dnd', label: `${pc.red('🎲')} D&D Adventure`, hint: 'Multi-agent D&D game simulation' },
      { value: 'custom', label: `${pc.magenta('🤖')} Custom AI-Generated`, hint: 'Describe your simulation and let AI generate it' }
    ]
  });

  if (typeof template === 'symbol') {
    outro('❌ Operation cancelled');
    process.exit(0);
  }

  let customDescription = '';
  if (template === 'custom') {
    customDescription = await text({
      message: pc.cyan('🎨 Describe your simulation in detail:'),
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
      
      // Show helpful tip during generation
      note(pc.dim(`💡 ${pc.cyan('Tip:')} Create a ${pc.yellow('~/.env.simullm')} file with your OPENROUTER_API_KEY\n   to automatically copy it to all new projects!`), 'Pro Tip');
      
      const result = await createCustomSimulation({
        projectName,
        description: customDescription,
        useTypeScript: true,
        installDeps: true
      });
      
      s.stop(`${pc.green('✅')} Custom simulation generated successfully!`);
      
      // Show env file status
      if (result.envResult.copied) {
        note(pc.green(`🔑 Copied API key from ~/.env.simullm`), 'Environment');
      } else {
        note(pc.yellow(`⚠️  Remember to add your OPENROUTER_API_KEY to .env`), 'Environment');
      }
    } else {
      s.start(`${pc.cyan('🚀')} Creating your SimuLLM project...`);
      
      const result = await createSimulation({
        projectName,
        template: template as string,
        useTypeScript: true,
        installDeps: true
      });
      
      s.stop(`${pc.green('✅')} Project created successfully!`);
      
      // Show env file status
      if (result.envResult.copied) {
        note(pc.green(`🔑 Copied API key from ~/.env.simullm`), 'Environment');
      }
    }
    
    outro(`${pc.magenta('🎉 Your SimuLLM simulation is ready!')}

${pc.cyan('Next steps:')}
  ${pc.green('1.')} ${pc.bold(`cd ${projectName}`)}
  ${pc.green('2.')} ${pc.bold('bun run dev')} ${pc.dim('(to start your simulation)')}

${pc.dim('📚 Need an API key?')} ${pc.blue('https://openrouter.ai/settings/keys')}
${pc.dim('💡 Save time:')} Create ${pc.yellow('~/.env.simullm')} with your key for future projects

${pc.magenta('Happy simulating!')} ${pc.yellow('🤖✨')}`);
  } catch (error) {
    s.stop(`${pc.red('❌')} Failed to create project`);
    console.error(`${pc.red('Error:')} ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

main().catch(console.error);