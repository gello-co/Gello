# Gello

![Bun](https://img.shields.io/badge/Bun-000?logo=bun&logoColor=fff&style=for-the-badge)
![Express](https://img.shields.io/badge/Express-000?logo=express&logoColor=fff&style=for-the-badge)
![Handlebars](https://img.shields.io/badge/Handlebars-000?logo=handlebarsdotjs&logoColor=fff&style=for-the-badge)
![Supabase](https://img.shields.io/badge/Supabase-000?logo=supabase&logoColor=fff&style=for-the-badge)
![Zod](https://img.shields.io/badge/Zod-000?logo=zod&logoColor=fff&style=for-the-badge)
![Biome](https://img.shields.io/badge/Biome-000?logo=biome&logoColor=fff&style=for-the-badge)
[![Render](https://img.shields.io/badge/Render-000?logo=render&logoColor=fff&style=for-the-badge)](https://render.com)

## Overview

Our application, Gello (“Jell-oh”), focuses on productivity and team organization. 
Users can take on admin roles to organize teams and assign tasks/goals for team members. 
Team members can sign in to specific teams and complete tasks assigned by the admin to earn points. 
Due to our implemented security and authentication, access is limited to specific teams in case of use of sensitive data.
To differentiate Gello from other productivity applications, our application gamifies productivity by using a point system. 
This works to introduce friendly competition and motivation into the workplace. Team members are awarded points based on task difficulty and meeting deadlines assigned by the team admin. 
Points can also be used to redeem rewards on the team member side.

## Run Instructions

### Initial Setup

#### Initialize Submodules:
```
git submodule update --init --recursive
Install Dependencies
bun install
```
Installs all project dependencies defined in package.json.

#### Start Local Supabase:
```
bun run db:start
```
What this does: Starts local Supabase services (PostgreSQL, Auth, Storage) in Docker containers.

Wait for: "API URL: http://127.0.0.1:54321/" 

Note: First time takes ~2 minutes (downloads Docker images).

If it fails: Ensure Docker Desktop is running.

#### Start Development Environment (Recommended)
```
bun run start
```
What this does:

Checks if Supabase is running, starts it if needed
Waits for Supabase to be ready
Starts the Express.js server with hot-reload enabled
Opens: http://localhost:3000/

Auto-reload: Edit files → Save → Browser auto-refreshes

#### Stop Everything: 
```
bun run stop
```
(stops dev server + Supabase)

#### Stop Individual Services:

Press Ctrl+C in terminal (stops dev server only)

```
bun run supabase:stop
```
(stops Supabase only)

#### Start Development Server Only
If Supabase is already running, you can start just the dev server:
```
bun run dev
```
Prerequisite: Ensure Supabase is running first:
```
bun run supabase:status
```
## Directory Structure

```
/ProjectSourceCoe
├── src/
│   ├── app.ts                      # Express app setup
│   │
│   ├── routes/                     # Route definitions
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   └── index.ts
│   │
│   ├── services/                   # Data operations
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   └── email.service.ts
│   │
│   ├── middleware/                 # Express middleware
│   │   ├── requireAuth.ts
│   │   └── errorHandler.ts
│   │
│   ├── db/                         # Database layer
│   │
│   ├── schemas/                    # Zod schemas & form validation
│   │   ├── auth.schema.ts
│   │   └──user.schema.ts
│   │
│   ├── errors/                     # Custom error classes
│   │
│   ├── lib/                        # Larger reusable modules
│   │   ├── logger.ts               # Pino wrapper
│   │   └── supabase.ts
│   │
│   ├── utils/                      # Small helper functions
│   │   ├── handlebars.ts
│   │   └── env.ts
│   │
│   ├── views/                      # Server-rendered templates
│   │   ├── layouts/
|   |   |   ├── dashboard.hbs
│   │   │   └── main.hbs
|   |   |
│   │   ├── partials/
│   │   │   ├── footer.hbs
│   │   │   └── navbar.hbs
|   |   |
│   │   └── pages/
│   │       └── home.hbs
│   │
│   └── public/                     # Everything Express serves statically
│       ├── js/
│       ├── css/
│       ├── images/
│       └── stock.jpg
|
├── supabase/
|
├── tests/                          # Playwright + backend tests
│   ├── e2e/
│   ├── integration/
│   └── unit/
│
├── scripts/                        # tooling scripts (migrations, seeds)
|   ├── bootstrap.sh
│   └── seed-simple.ts
|
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── README.md

```

