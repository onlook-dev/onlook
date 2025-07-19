# Onlook Architecture Guide

## Table of Contents

- [Overview](#overview)
- [What is Onlook?](#what-is-onlook)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Key Components](#key-components)
- [How to Get Started](#how-to-get-started)
- [Complete File Tree](#complete-file-tree)
- [Development Workflow](#development-workflow)
- [Key Features](#key-features)

## Overview

Onlook is **"Cursor for Designers"** - an open-source, visual-first code editor that allows you to craft websites and prototypes with AI in Next.js + TailwindCSS. It's a browser-based visual editor where you can make edits directly in the browser DOM while the changes are automatically written back to your code.

## What is Onlook?

Onlook is a revolutionary tool that bridges the gap between visual design tools and code editors. It provides:

- **Visual-First Editing**: Make changes directly in a browser-like interface
- **AI-Powered**: Chat with AI to generate and modify code
- **Real-Time Code Sync**: Changes in the visual editor are immediately reflected in code
- **Next.js + TailwindCSS Focus**: Optimized for modern web development
- **Open Source Alternative**: To tools like Bolt.new, Lovable, V0, Replit Agent, Figma Make, Webflow

## Architecture Overview

The core architecture follows this flow:

```
1. Code is loaded into a web container (CodeSandbox)
2. Container runs and serves the code
3. Editor receives preview link and displays in iFrame
4. Editor reads and indexes code from container
5. Code is instrumented to map elements to their source location
6. When elements are edited, changes are made in iFrame, then written to code
7. AI chat has code access and tools to understand/edit code
```

This architecture is **framework agnostic** and can theoretically scale to any language/framework that displays DOM elements declaratively.

## Tech Stack

### Frontend

- **Next.js 15** - Full-stack React framework
- **React 19** - UI library
- **TailwindCSS 4** - Styling framework
- **TypeScript** - Type safety
- **tRPC** - Type-safe API layer
- **Tanstack Query** - Data fetching and caching

### Backend

- **Supabase** - Auth, Database, Storage (PostgreSQL)
- **Drizzle ORM** - Database ORM
- **Fastify** - Web server framework
- **WebSockets** - Real-time communication

### AI & LLM

- **AI SDK** - Vercel's unified interface for all LLM providers, handles streaming responses, tool calling, and standardizes communication across different AI providers
- **Anthropic (Claude)** - Primary LLM provider for chat conversations and code generation, uses Claude models for understanding user intent and generating/modifying code
- **Morph Fast Apply** - Specialized model for fast code application using `morph-v3-large`, takes original code + snippet + instruction and merges them intelligently without breaking syntax
- **Relace** - Alternative fast apply service used as fallback when Morph fails, provides redundancy for intelligent code merging and application

**Fast Apply Pattern**: Instead of having general LLMs rewrite entire files, Morph and Relace can surgically apply small changes to large codebases, making code modifications much faster and more reliable.

### Sandboxing & Hosting

- **CodeSandbox SDK** - Creates and manages isolated development environments in the cloud, provides file system operations, terminal/CLI access, real-time preview URLs, and WebSocket communication for each Next.js project
- **Freestyle** - Deployment platform for hosting user-created websites with custom domain support, build process automation, CDN hosting, and DNS verification

### Development Tools

- **Bun** - Modern JavaScript runtime replacing Node.js + npm/yarn, serves as package manager for workspaces, runtime for executing TypeScript directly, bundler for applications, and script runner for monorepo operations
- **Fastify** - High-performance Node.js web server framework powering the control server, provides WebSocket support for real-time communication, tRPC integration for type-safe APIs, and handles file operations and container management
- **Docker** - Container management for Supabase backend (PostgreSQL + Auth + Storage)
- **Husky** - Git hooks for code quality
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Project Structure

This is a **monorepo** using Bun workspaces with the following structure:

```
onlook/
├── apps/                    # Main applications
│   ├── backend/            # Supabase backend
│   └── web/                # Web application
│       ├── client/         # Next.js frontend
│       ├── server/         # Fastify control server
│       ├── preload/        # DOM injection script
│       └── template/       # Example Next.js app
├── packages/               # Shared packages
│   ├── ai/                # AI integration
│   ├── db/                # Database schema
│   ├── parser/            # Code parsing
│   ├── ui/                # Shared components
│   └── [12 other packages]
├── tooling/               # Development tools
└── docs/                  # Documentation
```

## Key Components

### 1. Frontend (`apps/web/client`)

**Technology**: Next.js 15 + React 19 + TailwindCSS

**Purpose**: Main web application providing the visual editor interface

**Key Features**:

- Figma-like visual editing interface
- AI chat integration for code generation
- Real-time code editor with syntax highlighting
- Project management and file browser
- Canvas for visual manipulation
- Brand asset and token management

### 2. Backend (`apps/backend`)

**Technology**: Supabase (PostgreSQL + Auth + Storage)

**Purpose**: Handles authentication, data persistence, and user management

**Features**:

- User authentication and authorization
- Project and file data storage
- Database migrations and schema management
- Real-time subscriptions

### 3. Control Server (`apps/web/server`)

**Technology**: Fastify + WebSockets + tRPC

**Purpose**: High-performance intermediary server for communicating with development containers

**Key Implementation Details**:

- **Fastify Framework**: Chosen for its superior performance over Express.js, provides built-in TypeScript support and extensive plugin ecosystem
- **WebSocket Integration**: Uses `@fastify/websocket` plugin for real-time bidirectional communication between editor and CodeSandbox containers
- **tRPC Integration**: `@trpc/server/adapters/fastify` enables type-safe API calls with automatic TypeScript inference across client/server boundary
- **Container Management**: Orchestrates lifecycle of CodeSandbox development environments, handles file operations, and manages preview URLs

**Features**:

- WebSocket connections for real-time communication with CodeSandbox containers
- tRPC API endpoints for type-safe communication between frontend and backend
- Template app lifecycle management (create, start, stop, destroy)
- File system operations (read, write, watch) across isolated containers
- Terminal/CLI session management for running commands in containers

### 4. Preload Script (`apps/web/preload`)

**Purpose**: JavaScript injected into the user's Next.js app

**Features**:

- Cross-iframe communication bridge
- DOM instrumentation for element mapping
- Real-time change propagation
- Event handling and manipulation

### 5. Template App (`apps/web/template`)

**Purpose**: Example Next.js + TailwindCSS application for editing

**Features**:

- Live preview of changes
- Instrumented components for editing
- Real-time updates from the editor

## AI Services Architecture

### AI Service Integration (`packages/ai`)

The AI system uses a sophisticated multi-provider approach for different types of code operations:

#### **Primary Chat & Code Generation**

- **Provider**: Anthropic Claude via AI SDK
- **Use Cases**: User conversations, code generation from natural language, complex reasoning about code structure
- **Integration**: Streams responses through AI SDK's unified interface, supports tool calling for code operations

#### **Fast Code Application**

- **Primary Provider**: Morph Fast Apply (`morph-v3-large` model)
- **Backup Provider**: Relace Fast Apply
- **Use Cases**: Intelligently merging AI-generated code changes into existing files without breaking syntax or logic
- **Why Specialized Models**: Traditional LLMs like GPT-4 are slow and unreliable for code merging. Fast apply models are optimized specifically for this task.

#### **Code Application Flow**

```
1. User requests code change through chat
2. Anthropic Claude generates the modification
3. System identifies target file and location
4. Morph/Relace applies change to existing code
5. Result is validated and written to CodeSandbox container
6. Changes propagate to visual editor via WebSockets
```

#### **Provider Fallback Strategy**

The system implements automatic failover between fast apply providers:

- Attempts preferred provider (default: Morph)
- Falls back to alternative provider if first fails
- Ensures high availability for code modification operations
- Maintains consistent API interface regardless of provider

## Infrastructure Services Architecture

### CodeSandbox SDK Integration

**Purpose**: Provides isolated, cloud-based development environments for each user project

**Key Implementation Details**:

- **Container Isolation**: Each Next.js project runs in its own secure, sandboxed environment
- **File System API**: Full read/write access to project files with real-time synchronization
- **WebSocket Communication**: Bidirectional real-time communication between editor and container
- **Terminal Access**: Execute CLI commands and scripts within the container environment
- **Preview URLs**: Automatic generation of live preview URLs for running applications

**Integration Points**:

```typescript
// Creating a new sandbox
const sandbox = await sdk.sandboxes.create({
    source: 'template',
    title: 'User Project',
    files: projectFiles,
});

// Establishing WebSocket connection
const session = await connectToSandbox(sandboxId);
```

**File Operations**:

- **Real-time File Watching**: Monitors file changes and propagates updates
- **Batch Operations**: Efficient handling of multiple file modifications
- **Binary File Support**: Handles images, fonts, and other assets
- **Path Validation**: Ensures secure file system access within container boundaries

### Freestyle Hosting Platform

**Purpose**: Production deployment platform for publishing user-created websites

**Key Features**:

- **Build Automation**: Automatically builds Next.js projects for production deployment
- **CDN Distribution**: Global content delivery network for fast site loading
- **Custom Domain Support**: Full DNS management and SSL certificate provisioning
- **Environment Management**: Secure handling of environment variables and build configurations

**Deployment Pipeline**:

1. **Project Preparation**: Bun builds the Next.js project with optimizations
2. **File Packaging**: All static assets and server files are packaged for deployment
3. **Freestyle Upload**: Built files are uploaded to Freestyle infrastructure
4. **Domain Configuration**: DNS records are configured for custom domains
5. **SSL Provisioning**: Automatic HTTPS certificates are generated and installed

**Domain Verification Process**:

```typescript
// DNS verification for custom domains
const verification = await sdk.createDomainVerificationRequest(domain);
// Requires TXT record: _freestyle-challenge.domain.com
// Points A records to Freestyle IP address
```

### Bun Runtime & Package Management

**Purpose**: Modern JavaScript runtime and toolchain replacing Node.js + npm/yarn ecosystem

**Why Bun Over Node.js**:

- **Performance**: 2-4x faster package installation and script execution
- **Native TypeScript**: Direct TypeScript execution without compilation step
- **Built-in Bundler**: Eliminates need for separate bundling tools
- **Workspace Management**: Superior monorepo support with dependency linking

**Monorepo Architecture**:

```json
{
    "workspaces": ["packages/*", "apps/*", "tooling/*", "apps/web/*", "docs"]
}
```

**Key Operations**:

- **Dependency Management**: Handles complex workspace dependencies and version resolution
- **Script Orchestration**: Coordinates build and development scripts across packages
- **Development Server**: Hot reloading and fast refresh for development workflow
- **Production Builds**: Optimized bundling for deployment

### Docker Infrastructure

**Purpose**: Containerization for Supabase backend services

**Services Containerized**:

- **PostgreSQL Database**: Primary data storage with real-time subscriptions
- **PostgREST API**: Auto-generated REST API from database schema
- **GoTrue Auth**: Authentication service with JWT token management
- **Realtime Server**: WebSocket connections for live data updates
- **Storage API**: File upload and management service

**Development Workflow**:

```bash
# Start all Supabase services
bun backend:start
# Exposes:
# - Database: postgresql://localhost:54322/postgres
# - API: http://localhost:54321
# - Auth: http://localhost:54321/auth/v1
# - Storage: http://localhost:54321/storage/v1
```

**Container Orchestration**:

- **Service Discovery**: Automatic networking between containers
- **Volume Management**: Persistent data storage for database
- **Health Checks**: Monitoring and automatic restart of failed services
- **Environment Configuration**: Secure secret management and configuration injection

### Service Interconnection

**Real-time Data Flow**:

1. **User Interaction** → Frontend (Next.js)
2. **API Calls** → Fastify Server (tRPC)
3. **Container Operations** → CodeSandbox SDK
4. **File Changes** → WebSocket propagation
5. **Database Updates** → Supabase (Docker)
6. **AI Processing** → Anthropic/Morph/Relace APIs

**Security Boundaries**:

- **Container Isolation**: Each user project runs in isolated CodeSandbox environment
- **API Authentication**: All external API calls require valid API keys
- **Database Security**: Row-level security policies in Supabase
- **File System Sandboxing**: Restricted file access within container boundaries

## How to Get Started

### Prerequisites

```bash
# Required tools
- Bun (package manager and runtime)
- Docker (for Supabase backend)
- Node.js v20.16.0+ (avoid v20.11.0)
```

### Setup Steps

```bash
# 1. Clone and install dependencies
git clone https://github.com/onlook-dev/onlook.git
cd onlook
bun install

# 2. Start the backend (requires Docker)
bun backend:start
# Note: Save the anon key and service role key from output

# 3. Set up environment variables
# Copy the example environment file and fill in your API keys
cp env.local.example .env.local

# 4. Get required API keys and add them to .env.local:
# - CodeSandbox API key (from dashboard settings)
# - Anthropic API key (for AI chat)
# - Fast Apply API key (MorphLLM or Relace)
# - Supabase keys (from step 2 output)

# 5. Run the environment setup script (optional)
bun run setup:env

# 6. Initialize database schema
bun db:push

# 7. Seed database with test data
bun db:seed

# 8. Start development server
bun dev
```

Visit `http://localhost:3000` to see the application running!

### Available Scripts

```bash
# Development
bun dev                    # Start all development servers
bun dev:client            # Start only the client
bun dev:server            # Start only the control server

# Building
bun build                 # Build the client for production
bun start                 # Start production build

# Database
bun db:gen                # Generate database types
bun db:push               # Push schema changes
bun db:seed               # Seed with test data
bun db:migrate            # Run migrations

# Quality & Testing
bun format                # Format all code
bun lint                  # Lint the codebase
bun test                  # Run all tests
bun typecheck             # Type checking

# Backend
bun backend:start         # Start Supabase backend
```

## Complete File Tree

```
onlook/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── help_wanted.md
│   ├── workflows/
│   │   ├── supabase-push-staging.yml
│   │   └── unit-test.yml
│   ├── dependabot.yml
│   └── pull_request_template.md
├── .husky/
│   └── pre-commit
├── .vscode/
│   ├── .debug.script.mjs
│   ├── extensions.json
│   ├── launch.json
│   └── tasks.json
├── apps/
│   ├── backend/
│   │   ├── supabase/
│   │   │   ├── migrations/
│   │   │   │   ├── [0000-0014]_*.sql
│   │   │   │   └── meta/
│   │   │   │       ├── [snapshots & journal]
│   │   │   └── config.toml
│   │   ├── .env.example
│   │   ├── .gitignore
│   │   ├── README.md
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/
│       ├── client/
│       │   ├── messages/
│       │   │   ├── en.json
│       │   │   ├── es.json
│       │   │   ├── ja.json
│       │   │   ├── ko.json
│       │   │   └── zh.json
│       │   ├── public/
│       │   │   ├── assets/
│       │   │   │   ├── [images & icons]
│       │   │   ├── favicon.ico
│       │   │   └── robots.txt
│       │   ├── src/
│       │   │   ├── app/
│       │   │   │   ├── (authenticated)/
│       │   │   │   │   ├── projects/
│       │   │   │   │   └── settings/
│       │   │   │   ├── (marketing)/
│       │   │   │   │   ├── about/
│       │   │   │   │   ├── blog/
│       │   │   │   │   ├── docs/
│       │   │   │   │   └── pricing/
│       │   │   │   ├── project/[id]/
│       │   │   │   │   ├── _components/
│       │   │   │   │   │   ├── bottom-bar/
│       │   │   │   │   │   ├── canvas/
│       │   │   │   │   │   │   ├── frame/
│       │   │   │   │   │   │   ├── overlay/
│       │   │   │   │   │   │   └── hotkeys/
│       │   │   │   │   │   ├── editor-bar/
│       │   │   │   │   │   ├── left-sidebar/
│       │   │   │   │   │   └── right-sidebar/
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── auth/
│       │   │   │   ├── api/
│       │   │   │   │   ├── trpc/
│       │   │   │   │   ├── auth/
│       │   │   │   │   └── webhooks/
│       │   │   │   ├── globals.css
│       │   │   │   ├── layout.tsx
│       │   │   │   └── page.tsx
│       │   │   ├── components/
│       │   │   │   ├── store/
│       │   │   │   │   ├── editor/
│       │   │   │   │   │   ├── action/
│       │   │   │   │   │   ├── ast/
│       │   │   │   │   │   ├── canvas/
│       │   │   │   │   │   ├── chat/
│       │   │   │   │   │   ├── code/
│       │   │   │   │   │   ├── element/
│       │   │   │   │   │   ├── font/
│       │   │   │   │   │   ├── frames/
│       │   │   │   │   │   └── [other stores]
│       │   │   │   │   └── create/
│       │   │   │   ├── ui/
│       │   │   │   │   ├── alert/
│       │   │   │   │   ├── button/
│       │   │   │   │   ├── input/
│       │   │   │   │   └── [other components]
│       │   │   │   └── [feature components]
│       │   │   ├── lib/
│       │   │   │   ├── api/
│       │   │   │   ├── auth/
│       │   │   │   ├── db/
│       │   │   │   ├── editor/
│       │   │   │   └── utils/
│       │   │   └── [config files]
│       │   ├── test/
│       │   ├── .env.example
│       │   ├── .gitignore
│       │   ├── components.json
│       │   ├── eslint.config.js
│       │   ├── next.config.ts
│       │   ├── package.json
│       │   ├── postcss.config.js
│       │   ├── prettier.config.js
│       │   └── tsconfig.json
│       ├── preload/
│       │   ├── src/
│       │   │   ├── helpers/
│       │   │   ├── methods/
│       │   │   ├── observers/
│       │   │   └── index.ts
│       │   ├── package.json
│       │   └── tsconfig.json
│       ├── server/
│       │   ├── src/
│       │   │   ├── routes/
│       │   │   ├── index.ts
│       │   │   └── [other files]
│       │   ├── package.json
│       │   └── tsconfig.json
│       ├── template/
│       │   ├── src/
│       │   │   ├── app/
│       │   │   ├── components/
│       │   │   └── lib/
│       │   ├── public/
│       │   ├── package.json
│       │   ├── next.config.js
│       │   ├── tailwind.config.ts
│       │   └── tsconfig.json
│       ├── .gitignore
│       ├── README.md
│       ├── docker-compose.yml
│       └── package.json
├── packages/
│   ├── ai/
│   │   ├── src/
│   │   │   ├── apply/
│   │   │   ├── chat/
│   │   │   ├── prompt/
│   │   │   ├── tools/
│   │   │   └── index.ts
│   │   ├── test/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── constants/
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── db/
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   ├── migrations/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── email/
│   ├── fonts/
│   ├── git/
│   ├── growth/
│   ├── image-server/
│   ├── mastra/
│   ├── models/
│   │   ├── src/
│   │   │   ├── actions/
│   │   │   ├── chat/
│   │   │   ├── element/
│   │   │   ├── projects/
│   │   │   └── [other models]
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── parser/
│   │   ├── src/
│   │   │   ├── ast/
│   │   │   ├── css/
│   │   │   ├── html/
│   │   │   └── [parsers]
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── penpal/
│   ├── rpc/
│   │   ├── src/
│   │   │   ├── routers/
│   │   │   ├── procedures/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── scripts/
│   ├── stripe/
│   ├── types/
│   ├── ui/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/
│   │   │   │   └── [shared components]
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── utility/
├── tooling/
│   ├── eslint/
│   ├── prettier/
│   ├── tailwind/
│   └── typescript/
├── docs/
├── assets/
│   ├── architecture.png
│   ├── web-preview.png
│   └── [other images]
├── .gitignore
├── .prettierignore
├── .prettierrc
├── AGENTS.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE.md
├── README.md
├── SECURITY.md
├── bun.lock
├── bun.lockb
└── package.json
```

## Development Workflow

### How Visual Editing Works

The visual editing system implements a sophisticated bidirectional synchronization between visual changes and code modifications:

#### **1. DOM Instrumentation & Preload Script Injection**

- **Preload Script**: JavaScript is injected into every user's Next.js app via `apps/web/preload/`
- **Element Tagging**: DOM elements are automatically tagged with `data-onlook-*` attributes that map to their source code locations
- **Component Mapping**: React components are instrumented to track their file path, line numbers, and JSX structure
- **Cross-iframe Bridge**: Enables secure communication between the main editor interface and the user's app iframe

```typescript
// Example DOM instrumentation
<div data-onlook-id="comp-123"
     data-onlook-path="/src/components/Button.tsx"
     data-onlook-line="15">
  Button Content
</div>
```

#### **2. Real-time Visual Manipulation**

- **Direct DOM Editing**: Users can click, drag, and modify elements using Figma-like tools
- **Style Application**: TailwindCSS classes are applied directly to DOM elements in real-time
- **Layout Manipulation**: Drag-and-drop repositioning within parent containers
- **Content Editing**: Inline text editing with immediate visual feedback

#### **3. File System Synchronization**

- **File Watcher**: Monitors changes in CodeSandbox containers using `@codesandbox/sdk` WebSocket connections
- **Bidirectional Sync**: Changes flow both from editor to code and from code to editor
- **Conflict Resolution**: Handles simultaneous edits from multiple sources
- **Change Batching**: Groups related modifications for efficient processing

#### **4. AST Parsing & Code Generation**

- **Parser Integration**: Uses `@onlook/parser` package for JavaScript/TypeScript/JSX parsing
- **AST Manipulation**: Modifies Abstract Syntax Tree to reflect visual changes
- **Code Preservation**: Maintains code formatting, comments, and non-visual logic
- **Template Node Mapping**: Maps React components to their template structure for precise editing

```typescript
// AST transformation example
const ast = parse(sourceCode);
traverse(ast, {
    JSXElement(path) {
        if (matchesElementId(path.node, elementId)) {
            updateJSXAttributes(path.node, newStyles);
        }
    },
});
const updatedCode = generate(ast);
```

#### **5. WebSocket Propagation & File Writing**

- **Real-time Updates**: Changes are immediately propagated via Fastify WebSocket connections
- **CodeSandbox Integration**: Modified code is written back to the isolated container environment
- **File Validation**: Ensures syntax correctness before applying changes
- **Hot Reloading**: Triggers Next.js hot reload for immediate visual feedback in the iframe

### Action System

The action system provides a robust foundation for change management and collaboration:

#### **Action Types & Structure**

All modifications are stored as typed **actions** with the following capabilities:

- **Serializable Format**: JSON-based action format for storage and transmission
- **Undo/Redo Support**: Complete action history with bidirectional replay
- **Collaboration Ready**: Actions can be shared between users for real-time collaboration
- **AI Agent Integration**: AI systems can generate and apply actions programmatically

#### **Action Categories**

- **Style Actions**: TailwindCSS class modifications, inline style changes
- **Layout Actions**: Element positioning, drag-and-drop operations
- **Content Actions**: Text editing, image replacements, content updates
- **Structure Actions**: Component creation, deletion, hierarchy changes
- **AI Actions**: Code generation, refactoring, and intelligent modifications

#### **Action Processing Pipeline**

```typescript
interface Action {
  id: string;
  type: ActionType;
  elementId: string;
  before: ElementState;
  after: ElementState;
  timestamp: number;
  userId?: string;
}

// Action application flow
1. Action created from user interaction
2. Validation and conflict checking
3. AST transformation applied
4. Code generation and file writing
5. WebSocket propagation to all clients
6. DOM update in iframe
7. Action stored in history
```

### Cross-iframe Communication

The **preload script** (`apps/web/preload/`) creates a secure communication bridge using the Penpal library:

#### **Communication Architecture**

- **Parent Frame**: Main Onlook editor interface (Next.js app)
- **Child Frame**: User's Next.js application running in CodeSandbox
- **WebSocket Layer**: Real-time connection to Fastify control server

#### **Message Types & Protocols**

```typescript
// Event types handled by preload script
interface PreloadEvents {
    // Element selection and manipulation
    'element:select': (elementId: string) => void;
    'element:update': (elementId: string, changes: StyleChanges) => void;
    'element:insert': (parentId: string, element: ElementData) => void;
    'element:delete': (elementId: string) => void;

    // File system operations
    'file:read': (path: string) => Promise<string>;
    'file:write': (path: string, content: string) => Promise<void>;
    'file:watch': (path: string, callback: Function) => void;

    // Navigation and page management
    'page:navigate': (route: string) => void;
    'page:reload': () => void;
}
```

#### **Security & Sandboxing**

- **Origin Validation**: Strict origin checking for all cross-frame messages
- **API Whitelisting**: Only predefined methods are exposed to the iframe
- **Sanitization**: All user input is sanitized before DOM manipulation
- **Container Isolation**: Each project runs in its own CodeSandbox environment

#### **Real-time Synchronization**

- **Bidirectional Updates**: Changes sync from editor to iframe and vice versa
- **Event Debouncing**: Prevents excessive updates during rapid user interactions
- **State Reconciliation**: Handles conflicts when multiple changes occur simultaneously
- **Connection Recovery**: Automatic reconnection handling for dropped WebSocket connections

### Service Integration Flows

#### **Development Flow**

1. **CodeSandbox** creates isolated containers for each project
2. **Fastify server** manages WebSocket connections to these containers
3. **Bun** orchestrates the development environment and builds
4. User makes visual edits in the browser

#### **AI-Powered Editing Flow**

1. User chats with **Anthropic Claude** about code changes
2. Claude generates code modifications via **AI SDK**
3. **Morph/Relace** fast apply services merge changes into existing code
4. Changes are written back to **CodeSandbox** containers
5. **Fastify** propagates updates via WebSockets

#### **Publishing Flow**

1. **Bun** builds the Next.js project for production
2. **Freestyle** receives the built files and deploys them
3. Custom domains are verified through **Freestyle's** DNS system
4. Published sites are hosted on **Freestyle's** CDN

This architecture creates a seamless flow from visual editing → AI-assisted coding → live preview → production deployment, all while keeping user projects isolated and secure in the cloud.

## Technical Architecture Overview

### System Performance & Scalability

#### **Container Orchestration**

- **Horizontal Scaling**: CodeSandbox containers can be spawned on-demand for each user project
- **Resource Management**: Each container has allocated CPU/memory limits to prevent resource exhaustion
- **Load Balancing**: Fastify servers can be load-balanced across multiple instances for high availability
- **Auto-scaling**: Container instances scale up/down based on user demand

#### **Database Architecture**

- **PostgreSQL Primary**: Supabase provides robust ACID compliance for critical data
- **Real-time Subscriptions**: WebSocket connections for live collaboration features
- **Row-Level Security**: Fine-grained access control at the database level
- **Connection Pooling**: Efficient database connection management via PgBouncer

#### **API Gateway Pattern**

- **tRPC Type Safety**: End-to-end type safety from database to frontend
- **Request Validation**: Zod schemas validate all API inputs and outputs
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Rate Limiting**: API throttling to prevent abuse and ensure fair usage

### Security Architecture

#### **Multi-Layer Security**

- **Container Isolation**: Each user project runs in completely isolated CodeSandbox environments
- **API Authentication**: JWT tokens with Supabase Auth for user session management
- **CORS Protection**: Strict origin validation for all cross-frame communications
- **Input Sanitization**: All user inputs sanitized before DOM manipulation or file operations

#### **Code Execution Safety**

- **Sandboxed Environments**: User code executes only within controlled CodeSandbox containers
- **File System Restrictions**: Limited file system access within project boundaries
- **Network Isolation**: Containers have restricted network access for security
- **Resource Limits**: CPU and memory constraints prevent resource exhaustion attacks

#### **Data Protection**

- **Encryption at Rest**: All database data encrypted using Supabase's encryption
- **TLS Everywhere**: All API communications use HTTPS/WSS protocols
- **Secret Management**: API keys and sensitive data stored securely in environment variables
- **Audit Logging**: All user actions and system events are logged for security monitoring

### Monitoring & Observability

#### **System Monitoring**

- **Health Checks**: Automated monitoring of all critical services (Fastify, CodeSandbox, Supabase)
- **Performance Metrics**: Real-time tracking of API response times, container startup times, and user interactions
- **Error Tracking**: Centralized error logging and alerting for system failures
- **Resource Monitoring**: CPU, memory, and network usage tracking across all services

#### **User Experience Monitoring**

- **Real-time Analytics**: Track user interactions with visual editor and AI chat
- **Performance Tracking**: Monitor page load times, iframe rendering, and WebSocket latency
- **Feature Usage**: Analytics on which editing tools and AI features are most used
- **Error Reporting**: Client-side error tracking for debugging user issues

#### **Development & Debugging**

- **Structured Logging**: JSON-formatted logs with correlation IDs for request tracing
- **Debug Tools**: Built-in debugging capabilities for development and troubleshooting
- **A/B Testing**: Infrastructure for testing new features with subset of users
- **Rollback Capabilities**: Quick rollback mechanisms for deployment issues

## Key Features

### ✅ Current Features

- Create Next.js apps in seconds (from text/image)
- Visual editing with Figma-like UI
- Real-time preview in iframe
- AI chat for code generation and editing
- Brand asset and token management
- Page creation and navigation
- Real-time code editor with syntax highlighting
- Save/restore from checkpoints
- CLI command execution
- App marketplace integration

### 🚧 In Development

- Deploy apps with shareable links
- Custom domain linking
- Real-time team collaboration
- Comment system
- Component detection and management
- Advanced layer browsing
- Local file editing integration

### 🎯 Planned Features

- Figma import
- GitHub repository integration
- Enhanced template library
- Advanced component libraries
- Multi-framework support

## Contributing

Onlook welcomes contributions! Key areas for contribution organized by technical domain:

### 🎨 **Frontend & Visual Editor**

- **React/Next.js Components**: Build new editing tools, UI components, and visual interfaces
- **Canvas & Selection System**: Enhance the Figma-like editing experience with better selection, drag-and-drop, and manipulation tools
- **Brand Asset Management**: Improve design token and asset management systems
- **Responsive Design Tools**: Add breakpoint management and responsive editing capabilities

### 🤖 **AI & LLM Integration**

- **Prompt Engineering**: Optimize prompts for Anthropic Claude to improve code generation quality
- **Fast Apply Models**: Enhance integration with Morph/Relace for more reliable code merging
- **AI Tool Development**: Create new AI-powered features like automated component generation or code refactoring
- **Provider Fallback**: Improve robustness of multi-provider AI system with better error handling

### 🔧 **Infrastructure & Performance**

- **CodeSandbox Integration**: Optimize container management, file synchronization, and WebSocket communication
- **Fastify Server**: Enhance the control server with better error handling, rate limiting, and performance monitoring
- **Bun Toolchain**: Improve build processes, dependency management, and development workflow
- **Database Optimization**: Enhance Supabase queries, real-time subscriptions, and schema design

### 📝 **Parser & Code Generation**

- **AST Manipulation**: Improve JavaScript/TypeScript/JSX parsing and code transformation (`@onlook/parser`)
- **Template Node Mapping**: Enhance React component analysis and instrumentation
- **Code Preservation**: Better handling of code formatting, comments, and non-visual logic during modifications
- **Multi-Framework Support**: Extend beyond Next.js + TailwindCSS to Vue, Svelte, or other frameworks

### 🚀 **Deployment & Hosting**

- **Freestyle Integration**: Improve deployment pipeline, custom domain management, and DNS configuration
- **Build Optimization**: Enhance production build processes and static asset handling
- **Environment Management**: Better handling of environment variables and deployment configurations
- **CDN & Performance**: Optimize hosting performance and global content delivery

### 🔒 **Security & Reliability**

- **Container Security**: Enhance CodeSandbox isolation and security boundaries
- **API Security**: Improve authentication, authorization, and input validation
- **Error Handling**: Better error recovery, logging, and user feedback systems
- **System Monitoring**: Add comprehensive observability and alerting systems

### 📱 **Cross-Platform & Integrations**

- **Mobile Responsiveness**: Improve mobile editing experience and touch interactions
- **Third-Party Integrations**: Add support for Figma import, GitHub integration, or other design tools
- **Plugin System**: Create extensible architecture for community plugins and extensions
- **Collaboration Features**: Real-time editing, comments, and team management

### 📚 **Documentation & Developer Experience**

- **Architecture Documentation**: Maintain and improve technical documentation
- **API Documentation**: Document tRPC endpoints, WebSocket protocols, and integration points
- **Tutorials & Guides**: Create learning materials for contributors and users
- **Development Tools**: Improve debugging capabilities, testing infrastructure, and development workflow

### Development Guidelines

1. Run `bun format` before committing
2. Run `bun lint` and `bun test` for modified packages
3. Use clear, descriptive commit messages
4. Follow the pull request template
5. Link related issues using GitHub keywords

For detailed contributing guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md) and the [developer documentation](https://docs.onlook.com/docs/developer/contributing).

---

**Last Updated**: January 2025  
**Version**: Based on Onlook Web (post-Electron migration)  
**License**: Apache 2.0
