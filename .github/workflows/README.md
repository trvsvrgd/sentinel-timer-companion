# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD.

## Workflows

### CI (`ci.yml`)
- **Triggers**: Push to `main`/`develop`, Pull Requests
- **Actions**:
  - Lint code
  - Build application
  - Validate build output

### Build and Release (`build-and-release.yml`)
- **Triggers**: Push tags starting with `v*` (e.g., `v1.0.0`)
- **Actions**:
  - Build for Windows, macOS, and Linux
  - Create GitHub Release
  - Upload all build artifacts
  - Publish release notes

## Usage

### Creating a Release

1. Update version in `package.json`:
   ```json
   {
     "version": "1.0.0"
   }
   ```

2. Commit and push:
   ```bash
   git add package.json
   git commit -m "Bump version to 1.0.0"
   git push
   ```

3. Create and push a tag:
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

4. GitHub Actions will automatically:
   - Build for all platforms
   - Create a release
   - Upload artifacts

### Manual Workflow Dispatch

You can also trigger the build workflow manually:
1. Go to Actions tab
2. Select "Build and Release"
3. Click "Run workflow"
4. Enter version number
5. Click "Run workflow"

## Configuration

Update these in `electron-builder.config.js`:
- `publish.owner`: Your GitHub username
- `publish.repo`: Your repository name

## Secrets

For code signing (optional):
- `MAC_CERTIFICATE`: Base64 encoded macOS certificate
- `MAC_CERTIFICATE_PASSWORD`: Certificate password
