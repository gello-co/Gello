# Gello Architecture Documentation

This directory contains C4 architecture diagrams defined using Structurizr DSL.

## Directory Structure

```
docs/architecture/
├── workspace.dsl      # C4 model definitions (source of truth)
├── diagrams/          # Generated PNG/SVG diagrams (committed to repo)
│   ├── structurizr-SystemContext.png
│   ├── structurizr-Containers.png
│   ├── structurizr-Components.png
│   ├── structurizr-DevelopmentDeployment.png
│   └── structurizr-ProductionDeployment.png
└── README.md          # This file
```

## Diagram Types

| Diagram               | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| System Context        | Shows Gello in relation to users and external systems                       |
| Containers            | High-level technical components (Web App, Database)                         |
| Components            | Internal structure of the web application (routes, services, database layer)|
| Development Deployment| Local development environment setup                                         |
| Production Deployment | Render + Supabase Cloud deployment                                          |

## Generating Diagrams

Diagrams are generated locally using Structurizr Lite and exported manually. This approach is recommended by Structurizr because PNG/SVG rendering requires a browser.

### Quick Start

```bash
# Start Structurizr Lite
bun run arch:preview

# Then open http://localhost:8081 in your browser
# Use the export button (PNG/SVG) to save diagrams
```

### Export Steps

1. Start Structurizr Lite: `bun run arch:preview`
2. Open http://localhost:8081 in your browser
3. Navigate to each diagram view
4. Click the export button and select PNG or SVG
5. Save files to `docs/architecture/diagrams/`
6. Commit the updated diagram files

### Alternative: Docker Direct

```bash
# Interactive editing with Structurizr Lite
docker run -it --rm -p 8081:8080 \
  -v $(pwd)/docs/architecture:/usr/local/structurizr \
  structurizr/lite
```

## Editing the Architecture

1. **Edit the DSL file**: Modify `workspace.dsl` using any text editor
2. **Preview locally**: Run `bun run arch:preview` and open http://localhost:8081
3. **Export diagrams**: Use the browser export feature to save PNG/SVG files
4. **Commit changes**: Commit both `workspace.dsl` and updated diagram files

## DSL Reference

- [Structurizr DSL Language Reference](https://docs.structurizr.com/dsl/language)
- [C4 Model](https://c4model.com/)
- [Structurizr Lite](https://docs.structurizr.com/lite)
