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
            autoLayout
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

        # Styling
        styles {
            element "Person" {
                shape Person
                background #08427B
                color #ffffff
            }
            element "User" {
                background #08427B
            }
            element "Admin" {
                background #1168BD
            }
            element "Software System" {
                background #1168BD
                color #ffffff
            }
            element "External" {
                background #999999
                color #ffffff
            }
            element "Container" {
                background #438DD5
                color #ffffff
            }
            element "WebApp" {
                shape WebBrowser
            }
            element "StaticAssets" {
                shape Folder
            }
            element "Component" {
                background #85BBF0
                color #000000
            }
            element "Deployment Node" {
                background #ffffff
                color #000000
            }
        }
    }
}
