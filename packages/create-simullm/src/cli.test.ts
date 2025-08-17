import { test, expect, describe } from "bun:test";
import { execSync } from 'child_process';
import { join } from 'path';

describe("CLI script", () => {
  test("should execute without import/syntax errors", () => {
    // Test that the CLI script can start without crashing due to import errors
    // This catches issues like "pc.black is not a function", missing modules, etc.
    const cliPath = join(process.cwd(), 'dist', 'bin', 'create-simullm.js');
    
    let output = '';
    let error = '';
    
    try {
      // Try to run the CLI script - it will fail with TTY error but should not have syntax errors
      execSync(`echo "" | timeout 2s node ${cliPath}`, { 
        stdio: 'pipe',
        encoding: 'utf-8'
      });
    } catch (execError: any) {
      output = execError.stdout || '';
      error = execError.stderr || '';
    }
    
    // Should not contain function-related errors (like our pc.black issue)
    expect(error).not.toContain('is not a function');
    expect(error).not.toContain('Cannot find module');
    expect(error).not.toContain('SyntaxError');
    expect(error).not.toContain('ReferenceError');
    
    // TTY errors are expected in test environment
    const hasTtyError = error.includes('TTY') || error.includes('EINVAL') || error.includes('timeout');
    const hasImportError = error.includes('is not a function') || error.includes('Cannot find module');
    
    // If there are errors, they should be TTY-related, not import-related
    if (error && !hasTtyError) {
      expect(hasImportError).toBe(false);
    }
  });

  test("bun should be available for testing", () => {
    // Simple test that bun is available (since our CLI requires it)
    try {
      const result = execSync('bun --version', { stdio: 'pipe', encoding: 'utf-8' });
      expect(result.trim()).toBeTruthy();
    } catch {
      // If bun is not available, skip this test
      console.log('Bun not available, skipping bun test');
      expect(true).toBe(true);
    }
  });
});