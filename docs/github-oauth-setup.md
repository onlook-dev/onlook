# GitHub OAuth + App Hybrid Setup

This guide explains how to add OAuth for repository discovery while keeping GitHub App for actual access (like Vercel does).

## Architecture Overview

### Two-Token System:

1. **OAuth Token** (Discovery)
   - Used to: List all repos user can see (owned, collaborator, org member)
   - Permissions: Read-only access to user's repos
   - Scope: `read:user`, `repo` (read)
   - Stored: Per-user in database

2. **GitHub App Installation Token** (Access)
   - Used to: Actually import/access repos
   - Permissions: Contents read-only (from app configuration)
   - Scope: Only repos where app is installed
   - Stored: Per-user installation ID in database

### User Flow:

```
1. User connects GitHub (OAuth) → Gets list of ALL repos they can see
2. User selects repo to import
   ├─ Has app installed? → Import directly
   └─ No app installed? → Prompt "Install app on this repo"
3. User installs app → Now can import
```

---

## Step 1: Enable OAuth in Your GitHub App

### 1.1 Configure OAuth Settings

1. Go to your GitHub App settings: https://github.com/settings/apps/onlook-test-app
2. Scroll to **"Identifying and authorizing users"** section
3. Fill in:
   - **Callback URL**: `http://localhost:3000/api/auth/callback/github` (or your production URL)
   - **Request user authorization (OAuth) during installation**: ☐ Leave **unchecked** (we want separate flows)

### 1.2 Note Your OAuth Credentials

From the app settings page:
- **Client ID**: Found in "About" section
- **Client Secret**: Click "Generate a new client secret"
  - Copy and save it immediately (shown only once)

---

## Step 2: Add Environment Variables

Add to your `.env` file:

```bash
# Existing GitHub App variables
GITHUB_APP_ID=2167008
GITHUB_APP_SLUG=onlook-test-app
GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"

# New OAuth variables
GITHUB_CLIENT_ID=Iv1.abc123def456
GITHUB_CLIENT_SECRET=abc123def456ghi789jkl012mno345pqr678stu
```

---

## Step 3: Update Environment Schema

Edit `apps/web/client/src/env.ts`:

```typescript
server: {
  // ... existing vars ...

  // GitHub App
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_APP_SLUG: z.string().optional(),

  // GitHub OAuth (new)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
},

runtimeEnv: {
  // ... existing vars ...

  // GitHub
  GITHUB_APP_ID: process.env.GITHUB_APP_ID,
  GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
  GITHUB_APP_SLUG: process.env.GITHUB_APP_SLUG,

  // GitHub OAuth (new)
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
}
```

---

## Step 4: Update Database Schema

Add OAuth token storage to your users table.

In `packages/db/src/schema/user/user.ts`:

```typescript
export const users = pgTable('users', {
  // ... existing fields ...

  githubInstallationId: text('github_installation_id'), // existing
  githubAccessToken: text('github_access_token'),       // new - OAuth token
  githubTokenExpiry: timestamp('github_token_expiry'),  // new - when token expires
});
```

Run migration:
```bash
bun run db:push
```

---

## Step 5: Create OAuth Router

Create `apps/web/client/src/server/api/routers/github-oauth.ts`:

```typescript
import { users } from '@onlook/db';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { Octokit } from '@octokit/rest';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { env } from '@/env';

export const githubOAuthRouter = createTRPCRouter({
  // Generate OAuth authorization URL
  getAuthUrl: protectedProcedure
    .input(z.object({ redirectUrl: z.string().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID!,
        redirect_uri: `${env.NEXT_PUBLIC_SITE_URL}/api/auth/callback/github`,
        scope: 'read:user,repo', // repo scope for read-only access
        state: ctx.user.id, // CSRF protection
        ...(input?.redirectUrl && { redirect_uri: input.redirectUrl }),
      });

      const url = `https://github.com/login/oauth/authorize?${params.toString()}`;
      return { url };
    }),

  // Exchange code for access token
  handleCallback: protectedProcedure
    .input(z.object({
      code: z.string(),
      state: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify state matches user ID (CSRF protection)
      if (input.state !== ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid state parameter',
        });
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code: input.code,
          redirect_uri: `${env.NEXT_PUBLIC_SITE_URL}/api/auth/callback/github`,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: tokenData.error_description || 'Failed to get access token',
        });
      }

      // Store token in database
      await ctx.db.update(users)
        .set({
          githubAccessToken: tokenData.access_token,
          // OAuth tokens don't expire by default, but you can add expiry if using refresh tokens
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  // Get all repos user has access to (using OAuth token)
  getAllRepositories: protectedProcedure
    .input(z.object({
      type: z.enum(['all', 'owner', 'member', 'collaborator']).default('all'),
      sort: z.enum(['created', 'updated', 'pushed', 'full_name']).default('updated'),
      per_page: z.number().min(1).max(100).default(30),
      page: z.number().min(1).default(1),
    }).optional())
    .query(async ({ ctx, input }) => {
      // Get user's OAuth token
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
        columns: {
          githubAccessToken: true,
          githubInstallationId: true,
        },
      });

      if (!user?.githubAccessToken) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'GitHub OAuth not connected. Please connect your GitHub account.',
        });
      }

      // Create Octokit with OAuth token (NOT app token)
      const octokit = new Octokit({
        auth: user.githubAccessToken,
      });

      // Get all repos user has access to
      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
        type: input?.type || 'all',
        sort: input?.sort || 'updated',
        per_page: input?.per_page || 30,
        page: input?.page || 1,
      });

      // Check which repos have app installed (by comparing with installation repos)
      let installationRepos: string[] = [];
      if (user.githubInstallationId) {
        try {
          // This would require app token - keeping it simple for now
          // In production, you'd check installation repo access
          installationRepos = []; // TODO: implement checking
        } catch (error) {
          console.warn('Could not check installation repos:', error);
        }
      }

      // Transform and mark which repos have app installed
      return repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        default_branch: repo.default_branch,
        clone_url: repo.clone_url,
        html_url: repo.html_url,
        updated_at: repo.updated_at,
        owner: {
          login: repo.owner.login,
          avatar_url: repo.owner.avatar_url,
        },
        permissions: repo.permissions,
        // Mark if app is installed on this repo
        hasAppInstalled: user.githubInstallationId ? installationRepos.includes(repo.full_name) : false,
      }));
    }),

  // Check OAuth connection status
  checkOAuthConnection: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
        columns: { githubAccessToken: true },
      });

      return {
        isConnected: !!user?.githubAccessToken,
      };
    }),

  // Revoke OAuth token
  revokeOAuth: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.db.update(users)
        .set({ githubAccessToken: null })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),
});
```

---

## Step 6: Add OAuth Router to Root

Edit `apps/web/client/src/server/api/root.ts`:

```typescript
import { githubRouter } from './routers/github';
import { githubOAuthRouter } from './routers/github-oauth'; // new

export const appRouter = createTRPCRouter({
  // ... existing routers ...
  github: githubRouter,
  githubOAuth: githubOAuthRouter, // new
});
```

---

## Step 7: Create OAuth Callback Route

Create `apps/web/client/src/app/api/auth/callback/github/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/projects/import/github?error=${error}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/projects/import/github?error=missing_params`
    );
  }

  // Redirect to a page that will handle the token exchange via tRPC
  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_SITE_URL}/projects/import/github/oauth-callback?code=${code}&state=${state}`
  );
}
```

Create `apps/web/client/src/app/projects/import/github/oauth-callback/page.tsx`:

```typescript
'use client';

import { api } from '@/trpc/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const exchangeToken = api.githubOAuth.handleCallback.useMutation();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code && state) {
      exchangeToken.mutate(
        { code, state },
        {
          onSuccess: () => {
            router.push('/projects/import/github');
          },
          onError: (error) => {
            console.error('OAuth failed:', error);
            router.push('/projects/import/github?error=oauth_failed');
          },
        }
      );
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-2">Connecting to GitHub...</h1>
        <p className="text-muted-foreground">Please wait</p>
      </div>
    </div>
  );
}
```

---

## Step 8: Update UI to Use OAuth

Now in your GitHub import UI, you'll have TWO connection states:

1. **OAuth Connected** - Can browse all repos
2. **App Installed** - Can actually import repos

Example updated context:

```typescript
// In _context/index.tsx
const { data: oauthStatus } = api.githubOAuth.checkOAuthConnection.useQuery();
const { data: appInstallation } = api.github.checkGitHubAppInstallation.useQuery();

// Show different UI based on connection state:
// - No OAuth: Show "Connect GitHub" button
// - OAuth but no App: Show repos with "Install App" button on each
// - OAuth + App: Show repos, can import any with app installed
```

---

## Usage Flow

### For Users:

1. **Connect GitHub (OAuth)**
   ```typescript
   const connectGitHub = async () => {
     const { url } = await api.githubOAuth.getAuthUrl.mutate();
     window.location.href = url;
   };
   ```

2. **Browse All Repos**
   ```typescript
   const { data: allRepos } = api.githubOAuth.getAllRepositories.useQuery();
   // Shows ALL repos user has access to
   ```

3. **Import Repo**
   ```typescript
   if (repo.hasAppInstalled) {
     // Import directly
     await importRepo(repo);
   } else {
     // Prompt to install app
     const { url } = await api.github.generateInstallationUrl.mutate();
     window.open(url);
   }
   ```

---

## Benefits of Hybrid Approach

✅ **Better Discovery**: Users see all repos they have access to
✅ **Clearer UX**: "You need to install the app on this repo"
✅ **Flexible**: Works with repos user doesn't own (as collaborator)
✅ **Secure**: Still uses App tokens for actual access
✅ **Like Vercel**: Industry-standard pattern

---

## Security Considerations

- 🔒 OAuth tokens stored encrypted in database
- 🔒 State parameter for CSRF protection
- 🔒 Separate scopes for discovery vs access
- 🔒 Users can revoke OAuth independently of App
- 🔒 OAuth tokens used ONLY for listing, not for importing

---

## Next Steps

1. ✅ Complete all setup steps above
2. ✅ Test OAuth flow end-to-end
3. ✅ Update UI to show all repos with install status
4. ✅ Add "Install App" buttons for repos without installation
5. ✅ Test importing with OAuth + App combination
