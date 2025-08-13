#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function release() {
  console.log('🚀 Starting release process...\n');

  try {
    // 1. Check git status
    console.log('📋 Checking git status...');
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    if (gitStatus.trim()) {
      console.log('❌ Working directory is not clean. Please commit or stash changes first.');
      process.exit(1);
    }

    // 2. Run tests
    console.log('🧪 Running tests...');
    execSync('bun test && bun run typecheck', { stdio: 'inherit' });
    console.log('✅ Tests passed!\n');

    // 3. Get current version
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const currentVersion = packageJson.version;
    console.log(`📦 Current version: v${currentVersion}`);

    // 4. Get version bump type
    const bumpType = await question('🔢 Version bump type? (patch/minor/major): ');
    if (!['patch', 'minor', 'major'].includes(bumpType)) {
      console.log('❌ Invalid bump type. Must be patch, minor, or major.');
      process.exit(1);
    }

    // 5. Calculate new version
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    let newVersion;
    switch (bumpType) {
      case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
    }
    console.log(`🎯 New version: v${newVersion}\n`);

    // 6. Get changelog entry
    console.log('📝 Enter changelog details:');
    const changelogTitle = await question('  Summary (e.g., "Add new feature X"): ');
    const changelogDetails = await question('  Details (optional, press enter to skip): ');

    // 7. Update package.json
    console.log('📄 Updating package.json...');
    packageJson.version = newVersion;
    writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');

    // 8. Update CHANGELOG.md
    console.log('📄 Updating CHANGELOG.md...');
    const changelog = readFileSync('CHANGELOG.md', 'utf8');
    const today = new Date().toISOString().split('T')[0];
    
    let newEntry = `## [${newVersion}] - ${today}

### ${bumpType === 'major' ? 'Changed' : bumpType === 'minor' ? 'Added' : 'Fixed'}
- ${changelogTitle}`;

    if (changelogDetails) {
      newEntry += `\n- ${changelogDetails}`;
    }
    newEntry += '\n\n';

    const updatedChangelog = changelog.replace(
      /^(# Changelog\n\n[^\n]*\n\n)/m,
      `$1${newEntry}`
    );
    writeFileSync('CHANGELOG.md', updatedChangelog);

    // 9. Commit and tag
    const commitMessage = `Release v${newVersion}: ${changelogTitle}

${changelogDetails || ''}

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;

    console.log('📝 Committing changes...');
    execSync('git add .', { stdio: 'inherit' });
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    execSync(`git tag v${newVersion}`, { stdio: 'inherit' });

    // 10. Push
    const shouldPush = await question('🚀 Push to remote? (y/N): ');
    if (shouldPush.toLowerCase() === 'y' || shouldPush.toLowerCase() === 'yes') {
      console.log('⬆️  Pushing to remote...');
      execSync('git push && git push --tags', { stdio: 'inherit' });
    }

    // 11. Publish
    const shouldPublish = await question('📦 Publish to npm? (y/N): ');
    if (shouldPublish.toLowerCase() === 'y' || shouldPublish.toLowerCase() === 'yes') {
      const otp = await question('🔐 Enter OTP from your authenticator: ');
      console.log('📤 Publishing to npm...');
      execSync(`npm publish --otp=${otp}`, { stdio: 'inherit' });
      console.log(`\n🎉 Successfully published simullm@${newVersion}!`);
      console.log(`📦 https://www.npmjs.com/package/simullm`);
    }

    console.log(`\n✅ Release v${newVersion} completed successfully!`);

  } catch (error) {
    console.error('❌ Release failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

release();