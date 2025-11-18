# Devcontainer Testing & Validation

## Quick Validation

Build and test the devcontainer configuration locally:

```bash
# 1. Build the devcontainer
devcontainer build --workspace-folder .

# 2. Start a devcontainer (using VS Code or Cursor)
# File -> Reopen in Container

# 3. Inside the container, verify tools:
bun --version
node --version
supabase --version
doppler --version
docker ps
```

## Manual Testing Steps

### Test 1: Basic Container Build

```bash
# Build Dockerfile directly
docker buildx build -f .devcontainer/Dockerfile -t gello-test .devcontainer

# Should complete without errors
```

### Test 2: Devcontainer CLI Build

```bash
# Using devcontainer CLI
devcontainer build --workspace-folder .

# Should show success message:
# {"outcome":"success","imageName":["vsc-gello-..."]}
```

### Test 3: Full Development Workflow

Once inside the devcontainer:

```bash
# 1. Install dependencies
bun install

# 2. Start Supabase
bun run supabase:start

# 3. Seed database
bun run seed

# 4. Start dev server
bun run dev

# 5. Open browser to http://localhost:3000
# App should load successfully
```

### Test 4: Docker Socket Access

```bash
# Inside the container
docker ps
docker compose version

# Should work without permission errors
```

### Test 5: Supabase Integration

```bash
# Inside the container
supabase status

# Should show running Supabase services
```

## Automated Test Script

Run the automated validation script:

```bash
# Inside the devcontainer
bash .devcontainer/test-devcontainer.sh
```

This tests:
- ✅ Essential tools (Bun, Node.js, Doppler)
- ✅ Homebrew tools (Supabase CLI, mkcert)
- ✅ Docker socket access
- ✅ Workspace permissions
- ✅ Git LFS
- ✅ Global npm packages

## Common Issues & Solutions

### Issue: Docker socket permission denied

**Solution**: VS Code/Cursor handles this automatically with `runArgs`. If testing manually:

```bash
# Find docker socket group
stat -c '%g' /var/run/docker.sock

# Run with that group
docker run --group-add=<GID> ...
```

### Issue: Supabase not starting

**Solution**: Check Docker Desktop is running and has enough resources:

```bash
docker info
# Should show running Docker daemon
```

### Issue: Port 3000 already in use

**Solution**: Stop conflicting services or change the port in `src/index.ts`

```bash
# Find process using port
lsof -i :3000

# Kill it or use different port
PORT=3001 bun run dev
```

## Performance Optimization

### Node Modules Volume

The devcontainer uses a named volume for `node_modules` to improve performance:

```json
{
  "mounts": [
    "source=gello-node-modules,target=/workspace/node_modules,type=volume"
  ]
}
```

This significantly speeds up file operations on WSL2 and macOS.

### Build Cache

Docker buildx uses layer caching. To force rebuild:

```bash
docker buildx build --no-cache -f .devcontainer/Dockerfile -t gello-test .devcontainer
```

## Troubleshooting Build Failures

### Network Issues During Build

If features fail to download (DNS resolution errors):

1. Check your network connection
2. Try building again (transient network issues)
3. If persistent, remove problematic features from `devcontainer.json`

### Out of Disk Space

```bash
# Clean up old containers/images
docker system prune -a

# Check disk usage
docker system df
```

## CI/CD Integration

To test devcontainer in CI:

```yaml
# .github/workflows/devcontainer-test.yml
- name: Test Devcontainer Build
  run: |
    npm install -g @devcontainers/cli
    devcontainer build --workspace-folder .
```

## Expected Build Times

- **First build**: 5-10 minutes (downloads base images, installs tools)
- **Cached rebuild**: 30-60 seconds (only changed layers)
- **devcontainer up**: 10-30 seconds (container startup + hooks)

## Tools Installed

| Tool | Version | Purpose |
|------|---------|---------|
| Bun | Latest | Runtime & package manager |
| Node.js | LTS | JavaScript runtime |
| Supabase CLI | Latest | Database management |
| Doppler | Latest | Secrets management |
| mkcert | Latest | Local TLS certificates |
| PostgreSQL Client | Latest | Database client |
| Git LFS | Latest | Large file storage |
| Docker Compose | Latest | Multi-container orchestration |
| GitHub CLI | Latest | GitHub integration |

## Next Steps After Successful Build

1. ✅ Container starts successfully
2. ✅ All tools are accessible
3. ✅ Docker socket works
4. ✅ Supabase can start

Now you're ready to develop! See the main README.md for development commands.
