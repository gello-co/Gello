workspace "Gello" "Gamified task management application with points and leaderboard system" {

    model {
        # People
        user = person "User" "Team member who manages tasks and earns points" "User"
        admin = person "Admin" "Team administrator who manages boards and team settings" "Admin"

        # External Systems
        supabase = softwareSystem "Supabase" "Backend-as-a-Service providing PostgreSQL database and authentication" "External"
        render = softwareSystem "Render" "Cloud platform hosting the web application" "External"

        # Gello System
        gello = softwareSystem "Gello" "Gamified task management application" {
            webApp = container "Web Application" "Server-rendered web app using Express.js and Handlebars" "Bun, Express.js, Handlebars" "WebApp" {
                # Route Layer
                boardRoutes = component "Board Routes" "HTTP endpoints for board operations" "Express Router"
                taskRoutes = component "Task Routes" "HTTP endpoints for task operations" "Express Router"
                listRoutes = component "List Routes" "HTTP endpoints for list operations" "Express Router"
                authRoutes = component "Auth Routes" "HTTP endpoints for authentication" "Express Router"
                teamRoutes = component "Team Routes" "HTTP endpoints for team management" "Express Router"
                leaderboardRoutes = component "Leaderboard Routes" "HTTP endpoints for leaderboard data" "Express Router"

                # Service Layer
                boardService = component "BoardService" "Business logic for board management" "TypeScript Service"
                taskService = component "TaskService" "Business logic for task operations and point calculations" "TypeScript Service"
                listService = component "ListService" "Business logic for list management" "TypeScript Service"
                authService = component "AuthService" "Business logic for user authentication" "TypeScript Service"
                teamService = component "TeamService" "Business logic for team management" "TypeScript Service"
                pointsService = component "PointsService" "Business logic for points and leaderboard" "TypeScript Service"

                # Database Layer
                boardDb = component "Board Database" "Data access for boards with RLS" "Supabase Client"
                taskDb = component "Task Database" "Data access for tasks with RLS" "Supabase Client"
                listDb = component "List Database" "Data access for lists with RLS" "Supabase Client"
                userDb = component "User Database" "Data access for users with RLS" "Supabase Client"
                teamDb = component "Team Database" "Data access for teams with RLS" "Supabase Client"

                # Middleware
                authMiddleware = component "Auth Middleware" "Cookie-based session validation" "Express Middleware"
                serviceMiddleware = component "Service Middleware" "Dependency injection for services" "Express Middleware"
                errorMiddleware = component "Error Middleware" "Centralized error handling" "Express Middleware"

                # View Layer
                viewEngine = component "View Engine" "Handlebars template rendering" "express-handlebars"
            }

            staticAssets = container "Static Assets" "CSS, JavaScript, and images served by Express" "Bootstrap, HTMX, Alpine.js" "StaticAssets"
        }

        # Relationships - System Context
        user -> gello "Manages tasks, earns points"
        admin -> gello "Manages teams and boards"
        gello -> supabase "Stores data, authenticates users" "HTTPS/PostgreSQL"
        gello -> render "Deployed on" "HTTPS"

        # Relationships - Container
        user -> webApp "Uses" "HTTPS"
        admin -> webApp "Administers" "HTTPS"
        webApp -> supabase "Reads/writes data" "Supabase JS Client"
        webApp -> staticAssets "Serves"

        # Relationships - Component (Routes to Services)
        boardRoutes -> boardService "Uses"
        taskRoutes -> taskService "Uses"
        listRoutes -> listService "Uses"
        authRoutes -> authService "Uses"
        teamRoutes -> teamService "Uses"
        leaderboardRoutes -> pointsService "Uses"

        # Relationships - Component (Services to Database)
        boardService -> boardDb "Uses"
        taskService -> taskDb "Uses"
        taskService -> pointsService "Calculates points"
        listService -> listDb "Uses"
        authService -> userDb "Uses"
        teamService -> teamDb "Uses"
        pointsService -> userDb "Updates points"

        # Relationships - Component (Middleware)
        authMiddleware -> authService "Validates session"
        serviceMiddleware -> boardService "Injects"
        serviceMiddleware -> taskService "Injects"
        serviceMiddleware -> listService "Injects"
        serviceMiddleware -> authService "Injects"
        serviceMiddleware -> teamService "Injects"
        serviceMiddleware -> pointsService "Injects"

        # Relationships - Component (Views)
        boardRoutes -> viewEngine "Renders templates"
        taskRoutes -> viewEngine "Renders templates"
        listRoutes -> viewEngine "Renders templates"
        authRoutes -> viewEngine "Renders templates"

        # Deployment - Development
        developmentEnvironment = deploymentEnvironment "Development" {
            deploymentNode "Developer Workstation" "Local development machine" "macOS/Linux/Windows" {
                deploymentNode "Bun Runtime" "JavaScript runtime" "Bun 1.3+" {
                    devWebApp = containerInstance webApp
                }
                deploymentNode "Docker" "Container runtime" "Docker Desktop" {
                    deploymentNode "Supabase Local" "Local Supabase instance" "supabase/postgres" {
                        devDatabase = softwareSystemInstance supabase
                    }
                }
            }
        }

        # Deployment - Production
        productionEnvironment = deploymentEnvironment "Production" {
            deploymentNode "Render" "Cloud hosting platform" "Render.com" {
                deploymentNode "Web Service" "Managed Node.js hosting" "Bun Runtime" {
                    prodWebApp = containerInstance webApp
                }
            }
            deploymentNode "Supabase Cloud" "Managed PostgreSQL" "Supabase.com" {
                prodDatabase = softwareSystemInstance supabase
            }
        }
    }

    views {
        # System Context View
        systemContext gello "SystemContext" {
            include *
            autoLayout
            description "System Context diagram showing Gello and its external dependencies"
        }

        # Container View
        container gello "Containers" {
            include *
            autoLayout
            description "Container diagram showing the high-level technical components"
        }

        # Component View - Web Application
        component webApp "Components" {
            include *
            autoLayout lr 200 150
            description "Component diagram showing the internal structure of the web application"
        }

        # Deployment Views
        deployment gello developmentEnvironment "DevelopmentDeployment" {
            include *
            autoLayout
            description "Development environment deployment diagram"
        }

        deployment gello productionEnvironment "ProductionDeployment" {
            include *
            autoLayout
            description "Production environment deployment diagram"
        }

        # Modern Styling
        styles {
            # People - Friendly gradient blues
            element "Person" {
                shape Person
                background #4F46E5
                color #ffffff
                stroke #3730A3
                strokeWidth 2
            }
            element "User" {
                background #6366F1
                icon https://raw.githubusercontent.com/phosphor-icons/core/main/assets/regular/user.svg
            }
            element "Admin" {
                background #8B5CF6
                icon https://raw.githubusercontent.com/phosphor-icons/core/main/assets/regular/shield-check.svg
            }

            # Main Software System - Vibrant teal
            element "Software System" {
                shape RoundedBox
                background #0D9488
                color #ffffff
                stroke #0F766E
                strokeWidth 2
                fontSize 24
            }

            # External Systems - Warm gray
            element "External" {
                shape RoundedBox
                background #6B7280
                color #ffffff
                stroke #4B5563
                strokeWidth 2
                fontSize 20
            }

            # Containers - Ocean blues
            element "Container" {
                shape RoundedBox
                background #0EA5E9
                color #ffffff
                stroke #0284C7
                strokeWidth 2
                fontSize 18
            }
            element "WebApp" {
                shape WebBrowser
                background #3B82F6
                icon https://raw.githubusercontent.com/phosphor-icons/core/main/assets/regular/browser.svg
            }
            element "StaticAssets" {
                shape Folder
                background #06B6D4
                icon https://raw.githubusercontent.com/phosphor-icons/core/main/assets/regular/folder-open.svg
            }
            element "Database" {
                shape Cylinder
                background #10B981
                icon https://raw.githubusercontent.com/phosphor-icons/core/main/assets/regular/database.svg
            }

            # Components - Soft purples and blues by layer
            element "Component" {
                shape RoundedBox
                background #A78BFA
                color #1F2937
                stroke #7C3AED
                strokeWidth 1
                fontSize 14
            }
            
            # Route layer - Blue
            element "Express Router" {
                background #60A5FA
                color #1E3A5F
            }
            
            # Service layer - Purple  
            element "TypeScript Service" {
                background #C4B5FD
                color #3B0764
            }
            
            # Database layer - Green
            element "Supabase Client" {
                background #6EE7B7
                color #064E3B
            }
            
            # Middleware - Orange
            element "Express Middleware" {
                background #FDBA74
                color #7C2D12
            }

            # Deployment Nodes - Clean whites and grays
            element "Deployment Node" {
                shape RoundedBox
                background #F8FAFC
                color #1E293B
                stroke #CBD5E1
                strokeWidth 2
                fontSize 16
            }
            element "Infrastructure Node" {
                shape RoundedBox
                background #E2E8F0
                color #334155
                stroke #94A3B8
            }

            # Relationships - Clean dark lines
            relationship "Relationship" {
                color #475569
                thickness 2
                style solid
                routing Orthogonal
                fontSize 14
            }
            relationship "Sync" {
                style dashed
                color #0EA5E9
            }
            relationship "Async" {
                style dotted
                color #8B5CF6
            }
        }

        # Optional: Custom branding
        branding {
            font "Inter"
        }

        # Use default theme as base
        theme default
    }
}
