import * as fs from 'fs';
import * as path from 'path';

/**
 * Recursively finds all .d.ts files in a directory
 */
function findDTSFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    console.warn(`Directory does not exist: ${dir}`);
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...findDTSFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Minifies TypeScript declaration content by removing unnecessary whitespace
 * while preserving code structure
 */
function minifyDTS(content: string): string {
  return content
    // Remove comments (both // and /* */ styles)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    // Remove extra whitespace while preserving single spaces
    .replace(/\s+/g, ' ')
    // Remove spaces around certain characters
    .replace(/\s*([{}();:,<>=])\s*/g, '$1')
    // Remove spaces before/after brackets
    .replace(/\s*\[\s*/g, '[')
    .replace(/\s*\]\s*/g, ']')
    // Clean up any remaining multiple spaces
    .replace(/\s{2,}/g, ' ')
    // Trim leading/trailing whitespace
    .trim();
}

/**
 * Extracts and compiles all SimuLLM type definitions
 */
function extractSimullmTypes(): string {
  // Path to simullm dist folder
  const simullmDistPath = path.resolve('/Users/robgordon/Dev/playground/simullm/packages/simullm/dist');
  
  // Fallback to lib folder if dist doesn't exist (for development)
  const simullmLibPath = path.resolve('/Users/robgordon/Dev/playground/simullm/packages/simullm/lib');
  
  let searchPath = simullmDistPath;
  if (!fs.existsSync(simullmDistPath) && fs.existsSync(simullmLibPath)) {
    console.log('dist folder not found, using lib folder instead');
    searchPath = simullmLibPath;
  }
  
  // Find all .d.ts files
  const dtsFiles = findDTSFiles(searchPath);
  
  if (dtsFiles.length === 0) {
    console.warn(`No .d.ts files found in ${searchPath}`);
    // If no .d.ts files found, try to read .ts files from lib and extract types
    const tsFiles = fs.readdirSync(simullmLibPath)
      .filter(file => file.endsWith('.ts') && !file.endsWith('.test.ts'))
      .map(file => path.join(simullmLibPath, file));
    
    if (tsFiles.length === 0) {
      throw new Error('No TypeScript files found in lib folder either');
    }
    
    console.log(`Found ${tsFiles.length} .ts files in lib folder, extracting types...`);
    
    // Read and combine all TypeScript files, extracting only type definitions
    let combinedTypes = '';
    for (const file of tsFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      // Extract only exports (interfaces, types, classes that are exported)
      const typeExports = content
        .split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return (
            trimmed.startsWith('export interface') ||
            trimmed.startsWith('export type') ||
            trimmed.startsWith('export class') ||
            trimmed.startsWith('export const') ||
            trimmed.startsWith('export function') ||
            (line.includes('export') && (line.includes('interface') || line.includes('type') || line.includes('class')))
          );
        })
        .join('\n');
      
      if (typeExports.trim()) {
        combinedTypes += `\n// From ${path.basename(file)}\n${typeExports}\n`;
      }
    }
    
    return minifyDTS(combinedTypes);
  }
  
  console.log(`Found ${dtsFiles.length} .d.ts files:`);
  dtsFiles.forEach(file => console.log(`  - ${path.relative(searchPath, file)}`));
  
  // Read and combine all .d.ts files
  let combinedTypes = '';
  
  for (const file of dtsFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(searchPath, file);
      
      // Add a comment indicating which file this content came from
      combinedTypes += `\n// From ${relativePath}\n${content}\n`;
    } catch (error) {
      console.error(`Error reading file ${file}:`, error);
    }
  }
  
  // Minify the combined content
  return minifyDTS(combinedTypes);
}

/**
 * Main function to generate the types file
 */
function generateTypesFile(): void {
  try {
    const types = extractSimullmTypes();
    
    const outputContent = `// Auto-generated SimuLLM type definitions
// Generated on: ${new Date().toISOString()}
// This file is auto-generated. Do not edit manually.

export const simullmTypes = \`${types}\`;
`;
    
    const outputPath = path.join(__dirname, 'simullmTypes.ts');
    fs.writeFileSync(outputPath, outputContent);
    
    console.log(`✅ SimuLLM types extracted successfully!`);
    console.log(`📁 Output written to: ${outputPath}`);
    console.log(`📊 Compressed size: ${types.length} characters`);
    
    // Show a preview
    console.log(`\n📋 Preview (first 200 chars):`);
    console.log(types.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('❌ Error extracting SimuLLM types:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  generateTypesFile();
}

export { extractSimullmTypes, generateTypesFile };