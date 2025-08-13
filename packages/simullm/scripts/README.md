# Release Scripts

## `release.js`

Automated release script that handles the complete release workflow.

### Usage

```bash
bun run release
# or
npm run release
```

### What it does

1. ✅ **Checks git status** - Ensures working directory is clean
2. 🧪 **Runs tests** - `bun test && bun run typecheck`
3. 🔢 **Prompts for version bump** - patch/minor/major
4. 📝 **Updates CHANGELOG.md** - Adds new entry with your input
5. 📄 **Updates package.json** - Bumps version number
6. 📝 **Commits changes** - With proper commit message
7. 🏷️ **Tags release** - Creates git tag `vX.X.X`
8. ⬆️ **Pushes to remote** - Optional step
9. 📦 **Publishes to npm** - With OTP prompt

### Interactive Prompts

- Version bump type (patch/minor/major)
- Changelog summary and details
- Confirmation for push to remote
- Confirmation for npm publish
- OTP code for npm 2FA

### Safety Features

- Verifies git status is clean
- Runs full test suite before proceeding
- All steps are clearly logged
- Fails fast on any errors
- Manual confirmation for destructive operations