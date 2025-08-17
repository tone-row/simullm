import { mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface CreateSimulationOptions {
  projectName: string;
  template: string;
  useTypeScript: boolean;
  installDeps: boolean;
}

export interface CreateCustomSimulationOptions {
  projectName: string;
  description: string;
  useTypeScript: boolean;
  installDeps: boolean;
}

export async function createSimulation(options: CreateSimulationOptions) {
  const { projectName, template, useTypeScript, installDeps } = options;
  
  const projectPath = join(process.cwd(), projectName);
  
  await mkdir(projectPath, { recursive: true });
  
  await createPackageJson(projectPath, projectName, useTypeScript);
  
  await createProjectStructure(projectPath, template, useTypeScript);
  
  await createEnvFile(projectPath);
  
  await createGitignore(projectPath);
  
  if (installDeps) {
    process.chdir(projectPath);
    execSync('bun install', { stdio: 'inherit' });
  }
}

async function createPackageJson(projectPath: string, projectName: string, useTypeScript: boolean) {
  const packageJson = {
    name: projectName,
    version: "0.1.0",
    type: "module",
    scripts: {
      dev: "bun run src/index.ts",
      build: useTypeScript ? "tsc" : "echo 'No build needed'",
      start: "bun run dist/index.js"
    },
    dependencies: {
      "ai": "^3.0.0",
      "@openrouter/ai-sdk-provider": "^0.0.5",
      "zod": "^3.22.0",
      "simullm": "latest"
    },
    ...(useTypeScript && {
      devDependencies: {
        typescript: "^5.0.0",
        "@types/bun": "latest"
      }
    })
  };

  await writeFile(
    join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
}

async function createEnvFile(projectPath: string) {
  const envContent = `# OpenRouter API Key - Get yours at https://openrouter.ai/settings/keys
OPENROUTER_API_KEY=
`;

  await writeFile(join(projectPath, '.env'), envContent);
}

async function createGitignore(projectPath: string) {
  const gitignoreContent = `# Dependencies
node_modules/
.pnp
.pnp.js

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
`;

  await writeFile(join(projectPath, '.gitignore'), gitignoreContent);
}

async function createProjectStructure(projectPath: string, template: string, useTypeScript: boolean) {
  const srcDir = join(projectPath, 'src');
  await mkdir(srcDir, { recursive: true });

  const extension = useTypeScript ? 'ts' : 'js';
  const indexFile = join(srcDir, `index.${extension}`);

  let content: string;

  switch (template) {
    case 'basic':
      content = getBasicTemplate(useTypeScript);
      break;
    case 'dnd':
      // Copy the DND template file
      const templatePath = join(__dirname, 'templates', 'dnd.ts');
      content = await readFile(templatePath, 'utf-8');
      break;
    case 'multi-agent':
      content = getMultiAgentTemplate(useTypeScript);
      break;
    case 'custom':
      content = getCustomTemplate(useTypeScript);
      break;
    default:
      content = getBasicTemplate(useTypeScript);
  }

  await writeFile(indexFile, content);

  if (useTypeScript) {
    await writeFile(
      join(projectPath, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          allowImportingTsExtensions: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          skipLibCheck: true,
          outDir: "dist"
        },
        include: ["src/**/*"],
        exclude: ["node_modules", "dist"]
      }, null, 2)
    );
  }
}

function getBasicTemplate(useTypeScript: boolean): string {
  const imports = useTypeScript ? 
    `import { Simulation, Agent } from 'simullm';` :
    `const { Simulation, Agent } = require('simullm');`;

  return `${imports}

const simulation = new Simulation({
  name: 'Basic Simulation'
});

const agent = new Agent({
  name: 'Assistant',
  role: 'A helpful AI assistant'
});

simulation.addAgent(agent);

console.log('Starting basic simulation...');
simulation.run();
`;
}

function getMultiAgentTemplate(useTypeScript: boolean): string {
  const imports = useTypeScript ? 
    `import { Simulation, Agent } from 'simullm';` :
    `const { Simulation, Agent } = require('simullm');`;

  return `${imports}

const simulation = new Simulation({
  name: 'Multi-Agent Simulation'
});

const researcher = new Agent({
  name: 'Researcher',
  role: 'Research specialist who gathers information'
});

const analyst = new Agent({
  name: 'Analyst',
  role: 'Analyzes data and provides insights'
});

const coordinator = new Agent({
  name: 'Coordinator',
  role: 'Coordinates between agents and manages workflow'
});

simulation.addAgent(researcher);
simulation.addAgent(analyst);
simulation.addAgent(coordinator);

console.log('Starting multi-agent simulation...');
simulation.run();
`;
}

function getCustomTemplate(useTypeScript: boolean): string {
  const imports = useTypeScript ? 
    `import { Simulation } from 'simullm';` :
    `const { Simulation } = require('simullm');`;

  return `${imports}

const simulation = new Simulation({
  name: 'Custom Simulation'
});

// Add your custom logic here
console.log('Starting custom simulation...');
simulation.run();
`;
}

export async function createCustomSimulation(options: CreateCustomSimulationOptions) {
  const { projectName, description, useTypeScript, installDeps } = options;
  
  const projectPath = join(process.cwd(), projectName);
  
  // Create basic project structure first
  await mkdir(projectPath, { recursive: true });
  await createPackageJson(projectPath, projectName, useTypeScript);
  await createEnvFile(projectPath);
  await createGitignore(projectPath);
  
  // Generate custom simulation code using our API
  const generatedCode = await generateSimulationCode(description);
  
  // Create project structure with generated code
  await createCustomProjectStructure(projectPath, generatedCode, useTypeScript);
  
  if (installDeps) {
    process.chdir(projectPath);
    execSync('bun install', { stdio: 'inherit' });
  }
}

async function generateSimulationCode(description: string): Promise<string> {
  try {
    const response = await fetch('https://simullm-api.vercel.app/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json() as { code: string };
    return data.code;
  } catch (error) {
    throw new Error(`Failed to generate simulation code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function createCustomProjectStructure(projectPath: string, generatedCode: string, useTypeScript: boolean) {
  const srcDir = join(projectPath, 'src');
  await mkdir(srcDir, { recursive: true });

  const extension = useTypeScript ? 'ts' : 'js';
  const indexFile = join(srcDir, `index.${extension}`);

  await writeFile(indexFile, generatedCode);

  if (useTypeScript) {
    await writeFile(
      join(projectPath, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          allowImportingTsExtensions: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          skipLibCheck: true,
          outDir: "dist"
        },
        include: ["src/**/*"],
        exclude: ["node_modules", "dist"]
      }, null, 2)
    );
  }
}