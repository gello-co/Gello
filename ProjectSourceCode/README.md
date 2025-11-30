# Gello

![Bun](https://img.shields.io/badge/Bun-000?logo=bun&logoColor=fff&style=for-the-badge)
![Express](https://img.shields.io/badge/Express-000?logo=express&logoColor=fff&style=for-the-badge)
![Handlebars](https://img.shields.io/badge/Handlebars-000?logo=handlebarsdotjs&logoColor=fff&style=for-the-badge)
![Supabase](https://img.shields.io/badge/Supabase-000?logo=supabase&logoColor=fff&style=for-the-badge)
![Zod](https://img.shields.io/badge/Zod-000?logo=zod&logoColor=fff&style=for-the-badge)
![Biome](https://img.shields.io/badge/Biome-000?logo=biome&logoColor=fff&style=for-the-badge)
[![Render](https://img.shields.io/badge/Render-000?logo=render&logoColor=fff&style=for-the-badge)](https://render.com)

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
