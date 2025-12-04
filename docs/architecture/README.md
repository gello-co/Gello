# Gello Architecture Documentation

This directory contains C4 architecture diagrams defined using Structurizr DSL.

## Directory Structure

```
docs/architecture/
├── workspace.dsl      # C4 model definitions (source of truth)
├── diagrams/          # Generated PNG diagrams (committed to repo)
│   ├── structurizr-SystemContext.png
│   ├── structurizr-Containers.png
│   ├── structurizr-Components.png
│   ├── structurizr-TaskFlow.png
│   ├── structurizr-AuthFlow.png
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
| Task Flow             | Focused view of task management: routes → services → database               |
| Auth Flow             | Focused view of authentication: login, session, user data                   |
| Development Deployment| Local development environment setup                                         |
| Production Deployment | Render + Supabase Cloud deployment                                          |

## Generating Diagrams

Diagrams are generated locally using Structurizr Lite and exported manually. This approach is required because Structurizr CLI cannot export PNG/SVG directly - diagrams are rendered client-side in the browser.

### Quick Start

```bash
# Start Structurizr Lite (opens on port 8081)
bun run arch:preview

# Open http://localhost:8081 in your browser
# Navigate to each diagram view and export
```

### Export Workflow

1. Start Structurizr Lite: `bun run arch:preview`
2. Open http://localhost:8081 in your browser
3. Navigate to each diagram view using the dropdown
4. Click the export button (top-right) and select PNG or SVG
5. Save files to `docs/architecture/diagrams/` with the naming convention:
   - `structurizr-SystemContext.png`
   - `structurizr-Containers.png`
   - `structurizr-Components.png`
   - `structurizr-TaskFlow.png`
   - `structurizr-AuthFlow.png`
   - `structurizr-DevelopmentDeployment.png`
   - `structurizr-ProductionDeployment.png`
6. Commit the updated diagram files

### Alternative: Docker Direct

```bash
# Run Structurizr Lite directly without the npm script
docker run -it --rm -p 8081:8080 \
  -v $(pwd)/docs/architecture:/usr/local/structurizr \
  structurizr/lite
```

## Editing the Architecture

1. **Edit the DSL file**: Modify `workspace.dsl` using any text editor
2. **Preview changes**: Run `bun run arch:preview` and refresh browser
3. **Export diagrams**: Use the browser export feature to save PNG/SVG files
4. **Commit changes**: Commit both `workspace.dsl` and updated diagram files

## Visual Styling

The diagrams use a high-contrast color scheme with white text on saturated backgrounds:

| Layer      | Color   | Hex     | Description                    |
| ---------- | ------- | ------- | ------------------------------ |
| Routes     | Blue    | #3B82F6 | Express Router endpoints       |
| Services   | Purple  | #8B5CF6 | TypeScript business logic      |
| Database   | Green   | #059669 | Supabase Client data access    |
| Middleware | Orange  | #EA580C | Express Middleware components  |
| View       | Rose    | #E11D48 | Handlebars template rendering  |

## DSL Reference

- [Structurizr DSL Language Reference](https://docs.structurizr.com/dsl/language)
- [C4 Model](https://c4model.com/)
- [Structurizr Lite](https://docs.structurizr.com/lite)
