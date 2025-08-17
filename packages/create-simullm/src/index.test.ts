import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdir, writeFile, readFile, rmdir } from 'fs/promises';
import { join } from 'path';
import { createSimulation, createCustomSimulation } from './index.js';
import { execSync } from 'child_process';
import * as pc from 'picocolors';

// Test helpers
const testDir = join(process.cwd(), 'test-output');
const originalCwd = process.cwd();

beforeEach(async () => {
  // Clean up any existing test directory
  try {
    await rmdir(testDir, { recursive: true });
  } catch {}
  
  await mkdir(testDir, { recursive: true });
  process.chdir(testDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  try {
    await rmdir(testDir, { recursive: true });
  } catch {}
});

describe("create-simullm", () => {
  test("should create basic simulation project", async () => {
    const projectName = "test-basic-project";
    
    const result = await createSimulation({
      projectName,
      template: "basic",
      useTypeScript: true,
      installDeps: false // Skip deps for faster testing
    });
    
    // Check if project directory was created
    const projectPath = join(testDir, projectName);
    
    // Verify package.json exists and has correct content
    const packageJsonPath = join(projectPath, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    
    expect(packageJson.name).toBe(projectName);
    expect(packageJson.dependencies.ai).toBe("^5.0.11");
    expect(packageJson.dependencies["@openrouter/ai-sdk-provider"]).toBe("^1.1.2");
    expect(packageJson.dependencies.zod).toBe("^4.0.17");
    expect(packageJson.dependencies.simullm).toBe("latest");
    
    // Verify TypeScript files exist
    const indexPath = join(projectPath, 'src', 'index.ts');
    const indexContent = await readFile(indexPath, 'utf-8');
    expect(indexContent).toContain("import");
    expect(indexContent).toContain("Simulation");
    
    // Verify .env file was created
    const envPath = join(projectPath, '.env');
    const envContent = await readFile(envPath, 'utf-8');
    expect(envContent).toContain("OPENROUTER_API_KEY");
    
    // Verify tsconfig.json exists
    const tsconfigPath = join(projectPath, 'tsconfig.json');
    const tsconfigContent = await readFile(tsconfigPath, 'utf-8');
    const tsconfig = JSON.parse(tsconfigContent);
    expect(tsconfig.compilerOptions.module).toBe("ESNext");
  });

  test("should create D&D simulation project", async () => {
    const projectName = "test-dnd-project";
    
    await createSimulation({
      projectName,
      template: "dnd",
      useTypeScript: true,
      installDeps: false
    });
    
    const indexPath = join(testDir, projectName, 'src', 'index.ts');
    const indexContent = await readFile(indexPath, 'utf-8');
    
    // Should contain D&D template content (from dnd.ts template file)
    expect(indexContent.length).toBeGreaterThan(100);
  });

  test("should handle .env.simullm file copying (basic functionality)", async () => {
    const projectName = "test-env-project";
    
    // Test that env file creation works (without mocking homedir)
    const result = await createSimulation({
      projectName,
      template: "basic",
      useTypeScript: true,
      installDeps: false
    });
    
    // Should not have copied (since we don't have a real ~/.env.simullm)
    expect(result.envResult.copied).toBe(false);
    
    // Verify the .env file was created with default content
    const projectEnvPath = join(testDir, projectName, '.env');
    const projectEnvContent = await readFile(projectEnvPath, 'utf-8');
    expect(projectEnvContent).toContain("OPENROUTER_API_KEY=");
    expect(projectEnvContent).toContain("# OpenRouter API Key");
  });

  test("should validate project names", async () => {
    // This tests the validation logic indirectly
    const validName = "valid-project_123";
    const result = await createSimulation({
      projectName: validName,
      template: "basic", 
      useTypeScript: true,
      installDeps: false
    });
    
    const projectPath = join(testDir, validName);
    const packageJson = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'));
    expect(packageJson.name).toBe(validName);
  });

  test("picocolors functions should work correctly", () => {
    // Test that the color functions we use actually exist
    expect(typeof pc.magenta).toBe('function');
    expect(typeof pc.cyan).toBe('function');
    expect(typeof pc.green).toBe('function');
    expect(typeof pc.red).toBe('function');
    expect(typeof pc.yellow).toBe('function');
    expect(typeof pc.blue).toBe('function');
    expect(typeof pc.white).toBe('function');
    expect(typeof pc.dim).toBe('function');
    expect(typeof pc.bold).toBe('function');
    expect(typeof pc.bgMagenta).toBe('function');
    
    // Test that they return strings
    expect(typeof pc.magenta('test')).toBe('string');
    expect(typeof pc.bgMagenta(pc.white(' test '))).toBe('string');
  });

  test("should create proper TypeScript configuration", async () => {
    const projectName = "test-ts-config";
    
    await createSimulation({
      projectName,
      template: "basic",
      useTypeScript: true,
      installDeps: false
    });
    
    const tsconfigPath = join(testDir, projectName, 'tsconfig.json');
    const tsconfig = JSON.parse(await readFile(tsconfigPath, 'utf-8'));
    
    expect(tsconfig.compilerOptions.target).toBe("ES2022");
    expect(tsconfig.compilerOptions.module).toBe("ESNext");
    expect(tsconfig.compilerOptions.moduleResolution).toBe("bundler");
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.include).toEqual(["src/**/*"]);
    expect(tsconfig.exclude).toEqual(["node_modules", "dist"]);
  });
});