# Onlook Admin App

A lightweight admin dashboard for Onlook, built with the same architecture as the main web client.

## Architecture

- **Next.js 15** (App Router)
- **tRPC** for type-safe API routes
- **Drizzle ORM** via shared `@onlook/db` package
- **Supabase Auth** for authentication
- **TailwindCSS** for styling
- **Bun** as package manager

## Planned Directory Structure

```
apps/admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with providers
│   │   ├── page.tsx                # Homepage/Dashboard
│   │   └── api/
│   │       └── trpc/
│   │           └── [trpc]/
│   │               └── route.ts    # tRPC API handler
│   ├── server/
│   │   └── api/
│   │       ├── root.ts             # Main tRPC router
│   │       ├── trpc.ts             # tRPC context & procedures
│   │       └── routers/            # Feature-specific routers
│   │           └── admin.ts        # Admin-specific endpoints
│   ├── trpc/
│   │   ├── react.tsx               # Client-side tRPC provider
│   │   ├── helpers.ts              # tRPC configuration helpers
│   │   └── query-client.ts         # React Query client setup
│   ├── utils/
│   │   └── supabase/
│   │       ├── server.ts           # Server-side Supabase client
│   │       └── client/
│   │           └── index.ts        # Browser Supabase client
│   ├── components/                 # Admin UI components
│   ├── env.ts                      # Environment validation (via @t3-oss/env-nextjs)
│   └── styles/
│       └── globals.css             # Global styles + Tailwind imports
├── public/                         # Static assets
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript config
├── next.config.ts                  # Next.js configuration
├── tailwind.config.ts              # Tailwind configuration
├── postcss.config.js               # PostCSS configuration
└── .env.local                      # Local environment variables (gitignored)
```

## Shared Packages

This app reuses existing monorepo packages:

- `@onlook/db` - Drizzle schema & database client
- `@onlook/ui` - Shared UI components
- `@onlook/utility` - Shared utilities
- `@onlook/constants` - Shared constants
- `@onlook/typescript` - Shared TypeScript config
- `@onlook/eslint` - Shared ESLint config

## Key Features

### tRPC Setup

Following the same pattern as `apps/web/client`:

- **Context**: Database connection, Supabase auth, user session
- **Procedures**:
  - `publicProcedure` - No authentication required
  - `protectedProcedure` - Requires authenticated user
  - `adminProcedure` - Requires admin privileges (uses Supabase service role)
- **Validation**: Zod schemas for all inputs
- **Serialization**: SuperJSON for handling dates, etc.

### Environment Variables

Required environment variables (configure in `.env.local`):

#### Server-side
```env
# Database
SUPABASE_DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=...

# Node
NODE_ENV=development
```

#### Client-side (NEXT_PUBLIC_*)
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### TypeScript Path Aliases

- `@/*` → `src/*`
- `~/*` → `src/*`

## Scripts

```bash
# Development
bun dev                 # Start dev server (default: localhost:3001)

# Production
bun build               # Build for production
bun start               # Start production server

# Type checking & linting
bun typecheck           # Run TypeScript type checking
bun lint                # Run ESLint
bun format              # Format code with ESLint --fix
```

## Development Workflow

1. **Install dependencies**: `bun install` (from repo root)
2. **Set up environment**: Copy `.env.local.example` to `.env.local` and fill in values
3. **Run dev server**: `bun --filter @onlook/admin dev`
4. **Access**: http://localhost:3001

## Authentication

- Uses Supabase Auth (same setup as main web client)
- Server-side auth: `createClient()` from `@/utils/supabase/server`
- Client-side auth: `createClient()` from `@/utils/supabase/client`
- Admin routes should use `adminProcedure` for service role access

## Deployment Considerations

### As Git Submodule (Separate Private Repo)

This admin app is designed to be extracted into a separate private repository and included as a git submodule:

```bash
# In a new private repo
git init
git remote add origin <private-repo-url>

# Copy apps/admin/* to the new repo
# Commit and push

# Back in main repo, add as submodule
git submodule add <private-repo-url> apps/admin
git commit -m "Add admin app as submodule"
```

### Environment Variables

- Use Vercel/deployment platform environment variables
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set (required for admin operations)
- Set `NEXT_PUBLIC_SITE_URL` to production URL

### Database Access

- Reuses the same Supabase database as main app via `@onlook/db`
- Admin routes have elevated permissions via service role key
- Consider implementing additional RBAC checks in tRPC procedures

## Security Considerations

- **Admin procedures**: Always verify user permissions before granting admin access
- **Service role key**: Never expose to client, only use in `adminProcedure`
- **RLS policies**: Admin client bypasses RLS, so implement checks in application layer
- **CORS**: Configure appropriately if admin is on separate domain

## Next Steps

1. ✅ Create directory structure
2. ✅ Add README with plan
3. ⬜ Set up package.json with dependencies
4. ⬜ Configure Next.js & TypeScript
5. ⬜ Set up tRPC router structure
6. ⬜ Create environment configuration
7. ⬜ Build basic layout & auth flow
8. ⬜ Add admin-specific routes/features
9. ⬜ Extract to separate private repo
10. ⬜ Configure as git submodule

## Contributing

This is an internal admin tool. Follow the same code standards as the main web client:

- Use Server Components by default
- Add `use client` only when needed (events, state, browser APIs)
- Validate all inputs with Zod
- Export new tRPC routers in `src/server/api/root.ts`
- Use path aliases (`@/*` or `~/*`)

## Questions?

Refer to the main web client (`apps/web/client`) for examples of:
- tRPC router patterns
- Supabase auth setup
- Next.js App Router usage
- Component patterns
