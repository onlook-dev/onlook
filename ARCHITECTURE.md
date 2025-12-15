# Onlook Codebase Architecture Map

> **Project**: Onlook - Visual-First Code Editor for Next.js + TailwindCSS  
> **Type**: Bun Monorepo  
> **Tech Stack**: Next.js, tRPC, Supabase, Drizzle ORM, AI SDK, CodeSandbox SDK

## 🎯 High-Level Overview

Onlook is a **"Cursor for Designers"** - a visual-first code editor that allows users to create, edit, and deploy Next.js + TailwindCSS applications using AI and visual editing tools. It combines:

- **Visual Editor**: Figma-like UI for editing React components in real-time
- **AI Chat**: Powered by OpenRouter/Morph/Relace for code generation
- **Sandbox Environment**: CodeSandbox SDK for running user projects
- **Deployment**: Freestyle hosting for instant deployment
- **Collaboration**: Real-time editing and branching

---

## 📁 Monorepo Structure

```mermaid
graph TB
    subgraph "Onlook Monorepo"
        subgraph "Apps Layer"
            WEB["🌐 apps/web<br/>Main Web Application"]
            BACKEND["⚙️ apps/backend<br/>Supabase Backend"]
            ADMIN["👤 apps/admin<br/>Admin Dashboard"]
            DOCS["📚 docs<br/>Documentation Site"]
        end
        
        subgraph "Core Packages"
            AI["🤖 @onlook/ai<br/>AI/LLM Integration"]
            DB["🗄️ @onlook/db<br/>Database Schema"]
            MODELS["📦 @onlook/models<br/>Shared Models"]
            PARSER["🔍 @onlook/parser<br/>Code Parser"]
            CODE["💾 @onlook/code-provider<br/>Code Provider"]
        end
        
        subgraph "Feature Packages"
            GITHUB["🐙 @onlook/github<br/>GitHub Integration"]
            GIT["🔀 @onlook/git<br/>Git Operations"]
            STRIPE["💳 @onlook/stripe<br/>Payment Processing"]
            EMAIL["📧 @onlook/email<br/>Email Service"]
            GROWTH["📈 @onlook/growth<br/>Analytics"]
        end
        
        subgraph "Infrastructure Packages"
            UI["🎨 @onlook/ui<br/>Component Library"]
            RPC["🔌 @onlook/rpc<br/>tRPC Definitions"]
            FS["📂 @onlook/file-system<br/>File Operations"]
            IMG["🖼️ @onlook/image-server<br/>Image Processing"]
            PENPAL["👥 @onlook/penpal<br/>IFrame Communication"]
        end
        
        subgraph "Utilities"
            TYPES["📝 @onlook/types<br/>TypeScript Types"]
            CONST["⚙️ @onlook/constants<br/>Constants"]
            UTIL["🔧 @onlook/utility<br/>Utility Functions"]
            FONTS["🔤 @onlook/fonts<br/>Font Assets"]
        end
        
        subgraph "Tooling"
            ESLINT["🔍 @onlook/eslint<br/>Linting Config"]
            TS["📘 @onlook/typescript<br/>TS Config"]
            PRETTIER["✨ @onlook/prettier<br/>Prettier Config"]
            SCRIPTS["📜 @onlook/scripts<br/>Build Scripts"]
        end
    end
    
    WEB --> AI
    WEB --> DB
    WEB --> MODELS
    WEB --> PARSER
    WEB --> CODE
    WEB --> GITHUB
    WEB --> STRIPE
    WEB --> EMAIL
    WEB --> GROWTH
    WEB --> UI
    WEB --> RPC
    WEB --> FS
    WEB --> IMG
    WEB --> PENPAL
    WEB --> TYPES
    WEB --> CONST
    WEB --> UTIL
    WEB --> FONTS
    
    BACKEND --> DB
    ADMIN --> DB
    DOCS --> UI
    
    AI --> MODELS
    AI --> UI
    PARSER --> MODELS
    CODE --> MODELS
    DB --> STRIPE
    
    style WEB fill:#ff6b6b
    style AI fill:#4ecdc4
    style DB fill:#45b7d1
    style PARSER fill:#f9ca24
    style UI fill:#6c5ce7
```

---

## 🏗️ Web Application Architecture (apps/web)

The main web application is split into **3 distinct parts**:

### 1. **Client** (`apps/web/client`)
Next.js 16 application with App Router

```mermaid
graph LR
    subgraph "Web Client Structure"
        subgraph "Frontend (client/src)"
            APP["app/<br/>Next.js App Router"]
            COMP["components/<br/>React Components"]
            HOOKS["hooks/<br/>Custom Hooks"]
            TRPC["trpc/<br/>tRPC Client"]
            UTILS["utils/<br/>Utilities"]
            SERVICES["services/<br/>Business Logic"]
            STORIES["stories/<br/>Storybook"]
        end
        
        subgraph "Key Routes"
            LANDING["page.tsx<br/>Landing Page"]
            PROJECTS["projects/<br/>Project List"]
            PROJECT["project/[id]/<br/>Project Editor"]
            AUTH["auth/<br/>Authentication"]
            API["api/<br/>API Routes"]
        end
        
        subgraph "Server Components"
            SERVER["server/<br/>Server Actions"]
            ACTIONS["actions/<br/>tRPC Actions"]
        end
    end
    
    APP --> LANDING
    APP --> PROJECTS
    APP --> PROJECT
    APP --> AUTH
    APP --> API
    
    COMP --> TRPC
    TRPC --> SERVER
    SERVER --> ACTIONS
    
    style PROJECT fill:#ff6b6b
    style TRPC fill:#4ecdc4
    style SERVER fill:#45b7d1
```

### 2. **Server** (`apps/web/server`)
tRPC server for API endpoints

### 3. **Preload** (`apps/web/preload`)
Preload scripts for sandboxed environments

---

## 🧠 Project Editor Architecture

The core of Onlook - where users visually edit their projects:

```mermaid
graph TB
    subgraph "Project Editor (project/[id])"
        EDITOR["Editor Canvas<br/>(iFrame with user's Next.js app)"]
        SIDEBAR["Left Sidebar<br/>(Layers, Components, Pages)"]
        TOOLBAR["Top Toolbar<br/>(Text, Layout, Styling)"]
        CHAT["AI Chat Panel<br/>(AI-powered edits)"]
        CODE["Code Panel<br/>(Real-time code view)"]
        CLI["CLI Terminal<br/>(Command execution)"]
        BRANCH["Branch Manager<br/>(Git-like branching)"]
    end
    
    subgraph "Data Flow"
        SANDBOX["CodeSandbox Container<br/>(Runs user's app)"]
        PARSER_SVC["Parser Service<br/>(AST manipulation)"]
        AI_SVC["AI Service<br/>(LLM integration)"]
        FS_SVC["File System Service<br/>(CRUD operations)"]
        GIT_SVC["Git Service<br/>(Version control)"]
    end
    
    EDITOR --> SANDBOX
    EDITOR --> PARSER_SVC
    CHAT --> AI_SVC
    CODE --> FS_SVC
    BRANCH --> GIT_SVC
    TOOLBAR --> PARSER_SVC
    SIDEBAR --> PARSER_SVC
    
    PARSER_SVC --> FS_SVC
    AI_SVC --> FS_SVC
    FS_SVC --> SANDBOX
    
    style EDITOR fill:#ff6b6b
    style CHAT fill:#4ecdc4
    style SANDBOX fill:#f9ca24
```

---

## 🤖 AI System Architecture

```mermaid
graph TB
    subgraph "AI Package (@onlook/ai)"
        subgraph "Agents"
            CREATE_AGENT["Create Agent<br/>(Generate new projects)"]
            EDIT_AGENT["Edit Agent<br/>(Modify existing code)"]
            CHAT_AGENT["Chat Agent<br/>(Conversational AI)"]
        end
        
        subgraph "Tools"
            CREATE_FILE["Create File Tool"]
            EDIT_CODE["Edit Code Tool"]
            RUN_CMD["Run Command Tool"]
            READ_FILE["Read File Tool"]
            DEPLOY["Deploy Tool"]
            GIT_OPS["Git Operations Tool"]
            SEARCH["Search Tool"]
            IMAGE_GEN["Image Gen Tool"]
        end
        
        subgraph "Contexts"
            PROJECT_CTX["Project Context<br/>(File structure, deps)"]
            CODE_CTX["Code Context<br/>(Current file, AST)"]
            CONV_CTX["Conversation Context<br/>(Chat history)"]
            DESIGN_CTX["Design Context<br/>(Brand, tokens)"]
        end
        
        subgraph "Providers"
            OPENROUTER["OpenRouter<br/>(GPT-4, Claude, etc.)"]
            MORPH["Morph Fast Apply<br/>(Code editing)"]
            RELACE["Relace<br/>(Code editing)"]
            OPENAI["OpenAI<br/>(GPT models)"]
        end
        
        subgraph "Apply System"
            FAST_APPLY["Fast Apply<br/>(Quick code edits)"]
            STREAMING["Streaming Apply<br/>(Real-time edits)"]
        end
    end
    
    CREATE_AGENT --> OPENROUTER
    EDIT_AGENT --> MORPH
    EDIT_AGENT --> RELACE
    CHAT_AGENT --> OPENROUTER
    
    CREATE_AGENT --> CREATE_FILE
    CREATE_AGENT --> RUN_CMD
    EDIT_AGENT --> EDIT_CODE
    EDIT_AGENT --> READ_FILE
    CHAT_AGENT --> SEARCH
    CHAT_AGENT --> IMAGE_GEN
    
    CREATE_AGENT --> PROJECT_CTX
    EDIT_AGENT --> CODE_CTX
    CHAT_AGENT --> CONV_CTX
    
    EDIT_CODE --> FAST_APPLY
    EDIT_CODE --> STREAMING
    
    style EDIT_AGENT fill:#4ecdc4
    style MORPH fill:#f9ca24
    style FAST_APPLY fill:#ff6b6b
```

---

## 🔧 Parser System Architecture

The parser is responsible for understanding and modifying React/TSX code:

```mermaid
graph TB
    subgraph "Parser Package (@onlook/parser)"
        subgraph "Code Editing"
            AST["AST Parser<br/>(Babel/SWC)"]
            TEMPLATE["Template Node<br/>(JSX manipulation)"]
            PRETTIER["Prettier<br/>(Code formatting)"]
        end
        
        subgraph "Operations"
            INSERT["Insert Element"]
            UPDATE["Update Props"]
            DELETE["Delete Element"]
            MOVE["Move Element"]
            STYLE["Update Styles<br/>(Tailwind classes)"]
        end
        
        subgraph "Analysis"
            IDS["Element IDs<br/>(Track elements)"]
            PACKAGES["Package Detection"]
            HELPERS["Helper Functions"]
        end
    end
    
    AST --> INSERT
    AST --> UPDATE
    AST --> DELETE
    AST --> MOVE
    AST --> STYLE
    
    TEMPLATE --> INSERT
    TEMPLATE --> UPDATE
    
    PRETTIER --> INSERT
    PRETTIER --> UPDATE
    PRETTIER --> STYLE
    
    IDS --> TEMPLATE
    PACKAGES --> AST
    
    style AST fill:#f9ca24
    style TEMPLATE fill:#4ecdc4
    style STYLE fill:#ff6b6b
```

---

## 🗄️ Database Architecture

```mermaid
graph LR
    subgraph "Database (@onlook/db + apps/backend)"
        subgraph "Schema (Drizzle)"
            USERS["users<br/>(User accounts)"]
            PROJECTS["projects<br/>(User projects)"]
            BRANCHES["branches<br/>(Git branches)"]
            DOMAINS["domains<br/>(Custom domains)"]
            TEAMS["teams<br/>(Team collaboration)"]
            SUBS["subscriptions<br/>(Stripe billing)"]
            USAGE["usage<br/>(API usage tracking)"]
        end
        
        subgraph "Supabase Backend"
            AUTH["Authentication<br/>(Email, OAuth)"]
            STORAGE["Storage<br/>(Project files, assets)"]
            REALTIME["Realtime<br/>(Collaboration)"]
            EDGE["Edge Functions<br/>(API endpoints)"]
        end
        
        subgraph "Mappers"
            USER_MAP["User Mapper"]
            PROJECT_MAP["Project Mapper"]
            BRANCH_MAP["Branch Mapper"]
        end
    end
    
    USERS --> AUTH
    PROJECTS --> STORAGE
    BRANCHES --> REALTIME
    
    USERS --> USER_MAP
    PROJECTS --> PROJECT_MAP
    BRANCHES --> BRANCH_MAP
    
    SUBS -.Stripe.-> USAGE
    
    style AUTH fill:#4ecdc4
    style STORAGE fill:#45b7d1
    style REALTIME fill:#ff6b6b
```

---

## 🔄 Data Flow: User Makes a Visual Edit

```mermaid
sequenceDiagram
    participant User
    participant Editor as Editor Canvas (iFrame)
    participant Penpal as Penpal (IFrame Bridge)
    participant Parser as Parser Service
    participant FS as File System
    participant Sandbox as CodeSandbox
    participant UI as User Interface
    
    User->>Editor: Click element, change style
    Editor->>Penpal: Send element ID + new style
    Penpal->>Parser: Request code modification
    Parser->>FS: Read component file
    FS-->>Parser: Return TSX content
    Parser->>Parser: Parse AST, update Tailwind class
    Parser->>FS: Write modified TSX
    FS-->>Sandbox: Trigger hot reload
    Sandbox-->>Editor: Re-render with new styles
    Editor-->>UI: Update code panel
    UI-->>User: Show updated code + preview
    
    Note over Parser: Uses @onlook/parser<br/>to manipulate AST
    Note over Sandbox: Uses CodeSandbox SDK<br/>for isolated runtime
```

---

## 🔄 Data Flow: User Chats with AI

```mermaid
sequenceDiagram
    participant User
    participant Chat as Chat Panel
    participant AI as AI Service
    participant Context as Context Builder
    participant LLM as OpenRouter/Morph
    participant Tools as AI Tools
    participant FS as File System
    participant Sandbox as CodeSandbox
    
    User->>Chat: "Add a contact form"
    Chat->>AI: Send message
    AI->>Context: Build context (project files, structure)
    Context-->>AI: Return context
    AI->>LLM: Request with context + tools
    LLM-->>AI: Stream response with tool calls
    AI->>Tools: Execute createFile("ContactForm.tsx")
    Tools->>FS: Write new file
    FS-->>Sandbox: Trigger reload
    AI->>Tools: Execute editFile("app/page.tsx")
    Tools->>FS: Update page to import form
    FS-->>Sandbox: Trigger reload
    Sandbox-->>Chat: Show preview
    Chat-->>User: Stream response + preview
    
    Note over LLM: Uses GPT-4, Claude,<br/>or other models
    Note over Tools: Has 20+ tools:<br/>create, edit, run, deploy, etc.
```

---

## 🧩 Package Dependency Graph

```mermaid
graph TD
    subgraph "Apps"
        WEB_CLIENT["@onlook/web-client"]
        WEB_SERVER["@onlook/web-server"]
        BACKEND["@onlook/backend"]
    end
    
    subgraph "Core Logic"
        AI["@onlook/ai"]
        PARSER["@onlook/parser"]
        CODE_PROV["@onlook/code-provider"]
        MODELS["@onlook/models"]
    end
    
    subgraph "Data Layer"
        DB["@onlook/db"]
        RPC["@onlook/rpc"]
    end
    
    subgraph "Integrations"
        GITHUB["@onlook/github"]
        GIT["@onlook/git"]
        STRIPE["@onlook/stripe"]
        EMAIL["@onlook/email"]
        GROWTH["@onlook/growth"]
        IMAGE["@onlook/image-server"]
    end
    
    subgraph "UI & Utils"
        UI["@onlook/ui"]
        FS["@onlook/file-system"]
        PENPAL["@onlook/penpal"]
        UTIL["@onlook/utility"]
        CONST["@onlook/constants"]
        TYPES["@onlook/types"]
        FONTS["@onlook/fonts"]
    end
    
    WEB_CLIENT --> AI
    WEB_CLIENT --> PARSER
    WEB_CLIENT --> CODE_PROV
    WEB_CLIENT --> MODELS
    WEB_CLIENT --> DB
    WEB_CLIENT --> RPC
    WEB_CLIENT --> GITHUB
    WEB_CLIENT --> STRIPE
    WEB_CLIENT --> EMAIL
    WEB_CLIENT --> GROWTH
    WEB_CLIENT --> UI
    WEB_CLIENT --> FS
    WEB_CLIENT --> PENPAL
    WEB_CLIENT --> UTIL
    WEB_CLIENT --> CONST
    WEB_CLIENT --> TYPES
    WEB_CLIENT --> FONTS
    WEB_CLIENT --> IMAGE
    
    WEB_SERVER --> RPC
    WEB_SERVER --> DB
    
    BACKEND --> DB
    
    AI --> MODELS
    AI --> UI
    PARSER --> MODELS
    CODE_PROV --> MODELS
    DB --> STRIPE
    
    style WEB_CLIENT fill:#ff6b6b
    style AI fill:#4ecdc4
    style PARSER fill:#f9ca24
    style DB fill:#45b7d1
    style UI fill:#6c5ce7
```

---

## 📦 Package Details

### Core Packages

#### **@onlook/ai**
- **Purpose**: AI/LLM integration layer
- **Key Features**:
  - Agents: Create, Edit, Chat
  - Tools: 20+ tools (create file, edit code, run command, deploy, etc.)
  - Contexts: Project, Code, Conversation, Design
  - Providers: OpenRouter, Morph, Relace, OpenAI
  - Apply System: Fast Apply, Streaming Apply
- **Dependencies**: `ai`, `@openrouter/ai-sdk-provider`, `openai`, `zod`, `@onlook/ui`, `@onlook/models`

#### **@onlook/parser**
- **Purpose**: Code parsing and manipulation
- **Key Features**:
  - AST parsing (Babel/SWC)
  - JSX/TSX template node manipulation
  - Tailwind class editing
  - Element ID tracking
  - Prettier formatting
- **Dependencies**: `zod`, `@onlook/models`

#### **@onlook/code-provider**
- **Purpose**: Abstraction layer for different code sources
- **Key Features**:
  - Providers: CodeSandbox, Local, GitHub
  - File CRUD operations
  - Project management
- **Dependencies**: `@onlook/models`

#### **@onlook/models**
- **Purpose**: Shared TypeScript models and Zod schemas
- **Key Features**:
  - Project models
  - Element models
  - Chat models
  - Code models
- **Dependencies**: `zod`, `ai`

#### **@onlook/db**
- **Purpose**: Database schema and ORM
- **Key Features**:
  - Drizzle ORM schemas
  - Postgres connection
  - Database migrations
  - Seed scripts
- **Dependencies**: `drizzle-orm`, `postgres`, `pg`, `@onlook/stripe`

### Feature Packages

#### **@onlook/github**
- **Purpose**: GitHub integration
- **Key Features**:
  - OAuth authentication
  - Installation management
  - Repository operations
- **Dependencies**: `octokit`

#### **@onlook/git**
- **Purpose**: Git version control operations
- **Key Features**:
  - Branching
  - Commit management
  - Diff generation

#### **@onlook/stripe**
- **Purpose**: Payment and subscription management
- **Key Features**:
  - Subscription plans
  - Usage tracking
  - Billing

#### **@onlook/email**
- **Purpose**: Email service integration
- **Key Features**:
  - Transactional emails
  - Email templates

#### **@onlook/growth**
- **Purpose**: Analytics and growth tracking
- **Key Features**:
  - PostHog integration
  - User tracking
  - Feature flags

#### **@onlook/image-server**
- **Purpose**: Image processing and optimization
- **Key Features**:
  - Image resizing
  - Format conversion
  - CDN integration

### Infrastructure Packages

#### **@onlook/ui**
- **Purpose**: Shared UI component library
- **Key Features**:
  - 70+ components
  - Tailwind CSS v4
  - Theme system
  - Hooks
- **Dependencies**: `react`, `tailwind-merge`, `class-variance-authority`

#### **@onlook/rpc**
- **Purpose**: tRPC type definitions
- **Key Features**:
  - Client-server type safety
  - API route definitions
- **Dependencies**: `@trpc/client`, `@trpc/server`

#### **@onlook/file-system**
- **Purpose**: File system operations
- **Key Features**:
  - CRUD operations
  - Path utilities
  - File watching

#### **@onlook/penpal**
- **Purpose**: IFrame communication bridge
- **Key Features**:
  - Secure postMessage wrapper
  - Bidirectional RPC
- **Dependencies**: `penpal`

### Utility Packages

#### **@onlook/types**
- **Purpose**: Shared TypeScript types

#### **@onlook/constants**
- **Purpose**: Shared constants and configuration

#### **@onlook/utility**
- **Purpose**: Utility functions

#### **@onlook/fonts**
- **Purpose**: Font assets and loading

---

## 🚀 Runtime Architecture

```mermaid
graph TB
    subgraph "User's Browser"
        NEXTJS["Next.js App<br/>(onlook.com)"]
        EDITOR["Visual Editor<br/>(React components)"]
        IFRAME["Sandboxed iFrame<br/>(User's project)"]
    end
    
    subgraph "CodeSandbox Container"
        CONTAINER["Web Container<br/>(Isolated runtime)"]
        NEXTJS_USER["User's Next.js App<br/>(Running in container)"]
        HMR["Hot Module Reload<br/>(Fast refresh)"]
    end
    
    subgraph "Backend Services"
        TRPC["tRPC Server<br/>(apps/web/server)"]
        SUPABASE["Supabase<br/>(apps/backend)"]
        STORAGE["Supabase Storage<br/>(Project files)"]
    end
    
    subgraph "External Services"
        OPENROUTER["OpenRouter<br/>(AI models)"]
        MORPH["Morph<br/>(Fast Apply)"]
        STRIPE_SVC["Stripe<br/>(Billing)"]
        GITHUB_SVC["GitHub<br/>(OAuth, repos)"]
        FREESTYLE["Freestyle<br/>(Hosting)"]
    end
    
    NEXTJS --> EDITOR
    EDITOR <--> IFRAME
    IFRAME <--> CONTAINER
    CONTAINER --> NEXTJS_USER
    NEXTJS_USER --> HMR
    
    EDITOR --> TRPC
    TRPC --> SUPABASE
    SUPABASE --> STORAGE
    
    TRPC --> OPENROUTER
    TRPC --> MORPH
    TRPC --> STRIPE_SVC
    TRPC --> GITHUB_SVC
    TRPC --> FREESTYLE
    
    style CONTAINER fill:#f9ca24
    style TRPC fill:#4ecdc4
    style SUPABASE fill:#45b7d1
```

---

## 🎨 UI/UX Flow

```mermaid
graph LR
    subgraph "Landing Page"
        HERO["Hero Section"]
        FEATURES["Features"]
        PRICING["Pricing"]
        CTA["Sign Up CTA"]
    end
    
    subgraph "Onboarding"
        SIGNUP["Sign Up<br/>(Email/GitHub)"]
        CREATE["Create Project<br/>(Template/AI/Import)"]
        SETUP["Project Setup<br/>(Name, framework)"]
    end
    
    subgraph "Project List"
        PROJECTS["My Projects"]
        NEW["New Project"]
        SEARCH["Search"]
    end
    
    subgraph "Project Editor"
        CANVAS["Visual Canvas"]
        LEFT["Left Panel<br/>(Layers, Components)"]
        RIGHT["Right Panel<br/>(Styles, Code)"]
        BOTTOM["Bottom Panel<br/>(Chat, CLI)"]
        TOP["Top Toolbar<br/>(Tools, Actions)"]
    end
    
    subgraph "Deployment"
        PREVIEW["Preview"]
        DOMAIN["Custom Domain"]
        DEPLOY_BTN["Deploy Button"]
        SHARE["Share Link"]
    end
    
    HERO --> CTA
    CTA --> SIGNUP
    SIGNUP --> CREATE
    CREATE --> SETUP
    SETUP --> PROJECTS
    PROJECTS --> PROJECT_EDITOR
    NEW --> CREATE
    
    CANVAS --> LEFT
    CANVAS --> RIGHT
    CANVAS --> BOTTOM
    CANVAS --> TOP
    
    TOP --> DEPLOY_BTN
    DEPLOY_BTN --> PREVIEW
    PREVIEW --> DOMAIN
    DOMAIN --> SHARE
```

---

## 🔐 Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Next.js Frontend
    participant Supabase as Supabase Auth
    participant DB as Database
    participant GitHub as GitHub OAuth
    
    User->>Frontend: Click "Sign Up with GitHub"
    Frontend->>Supabase: Initiate OAuth flow
    Supabase->>GitHub: Redirect to GitHub
    GitHub-->>User: Show authorization
    User->>GitHub: Approve
    GitHub-->>Supabase: Return auth code
    Supabase->>GitHub: Exchange code for token
    GitHub-->>Supabase: Return access token
    Supabase->>DB: Create/update user record
    Supabase-->>Frontend: Return session + JWT
    Frontend->>Frontend: Store session in cookie
    Frontend-->>User: Redirect to projects
    
    Note over Supabase: Uses @supabase/ssr<br/>for server-side auth
```

---

## 🌍 Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        VERCEL["Vercel<br/>(Next.js Frontend)"]
        SUPABASE_PROD["Supabase<br/>(Auth + DB + Storage)"]
        FREESTYLE_HOST["Freestyle<br/>(User Project Hosting)"]
    end
    
    subgraph "CDN & Assets"
        CDN["Vercel CDN<br/>(Static assets)"]
        IMAGES["Supabase Storage<br/>(User images)"]
    end
    
    subgraph "External APIs"
        OPENROUTER_API["OpenRouter API"]
        MORPH_API["Morph API"]
        STRIPE_API["Stripe API"]
        GITHUB_API["GitHub API"]
    end
    
    VERCEL <--> SUPABASE_PROD
    VERCEL --> CDN
    VERCEL --> IMAGES
    VERCEL --> OPENROUTER_API
    VERCEL --> MORPH_API
    VERCEL --> STRIPE_API
    VERCEL --> GITHUB_API
    
    VERCEL --> FREESTYLE_HOST
    
    style VERCEL fill:#ff6b6b
    style SUPABASE_PROD fill:#45b7d1
    style FREESTYLE_HOST fill:#4ecdc4
```

---

## 📊 Key Technologies Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 (App Router) | Server-side rendering, routing |
| **UI Framework** | React 19 | Component library |
| **Styling** | TailwindCSS v4 | Utility-first CSS |
| **Backend** | tRPC | Type-safe API |
| **Database** | Supabase (Postgres) | Auth, DB, Storage |
| **ORM** | Drizzle | Database queries |
| **AI** | AI SDK + OpenRouter | LLM integration |
| **Sandbox** | CodeSandbox SDK | Isolated runtime |
| **Hosting** | Freestyle | User project hosting |
| **Payments** | Stripe | Subscriptions |
| **Analytics** | PostHog | User tracking |
| **Monorepo** | Bun Workspaces | Package management |
| **Runtime** | Bun | Fast JavaScript runtime |
| **Language** | TypeScript 5.5+ | Type safety |

---

## 🔍 Key File Locations

### Configuration Files
- `/package.json` - Root monorepo config
- `/bunfig.toml` - Bun configuration
- `/docker-compose.yml` - Docker setup
- `/apps/web/client/next.config.ts` - Next.js config
- `/apps/web/client/tailwind.config.ts` - Tailwind config (likely in @onlook/ui)

### Entry Points
- `/apps/web/client/src/app/layout.tsx` - Root layout
- `/apps/web/client/src/app/page.tsx` - Landing page
- `/apps/web/client/src/app/project/[id]/page.tsx` - Project editor
- `/apps/backend/supabase/` - Supabase backend

### Core Logic
- `/packages/ai/src/agents/` - AI agents
- `/packages/ai/src/tools/` - AI tools
- `/packages/parser/src/code-edit/` - Code editing logic
- `/packages/models/src/` - Shared models
- `/apps/web/client/src/server/` - Server actions

---

## 🧪 Testing & Development

```bash
# Development
bun dev              # Start web client + preload
bun dev:admin        # Start admin dashboard
bun backend:start    # Start Supabase backend
bun docs             # Start documentation site

# Building
bun build            # Build web client
bun docker:build     # Build Docker image

# Database
bun db:gen           # Generate Drizzle schema
bun db:push          # Push schema to DB
bun db:seed          # Seed database
bun db:migrate       # Run migrations

# Quality
bun lint             # Lint all packages
bun format           # Format code
bun typecheck        # Type check
bun test             # Run tests
```

---

## 🎯 Summary

**Onlook** is a sophisticated monorepo with:
- **3 apps**: Web (Next.js), Backend (Supabase), Admin
- **20 packages**: AI, Parser, DB, UI, and more
- **4 tooling packages**: ESLint, TypeScript, Prettier, Scripts
- **Complex data flows**: Visual editing → Parser → File System → Sandbox → Re-render
- **AI-powered**: Multiple agents, 20+ tools, streaming edits
- **Full-stack**: Next.js + tRPC + Supabase + CodeSandbox + Freestyle

The architecture is designed for:
1. **Real-time visual editing** of React components
2. **AI-powered code generation** with streaming responses
3. **Sandboxed execution** of user projects
4. **Collaborative editing** with branching
5. **Instant deployment** to production

