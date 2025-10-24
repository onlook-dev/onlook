# GitHub Import Functionality - Production Readiness Plan

## Recent Updates

### ✅ All-Scopes-Upfront OAuth (Completed)
**Implementation Date**: 2025-01-23

Implemented Vercel-style OAuth pattern - request all needed scopes during login:

**Changes Made**:
1. **Updated Login OAuth** (`apps/web/client/src/app/login/actions.tsx:30-31`):
   - GitHub login now requests: `repo read:user user:email` scopes upfront
   - Simpler flow - only one OAuth approval needed
   - User sees all permissions at signup/login

2. **Simplified Connect UI** (`apps/web/client/src/app/projects/import/github/_components/connect.tsx`):
   - Only shows GitHub App installation step (OAuth already done at login)
   - Clean, straightforward flow: Install App → Continue

**Benefits**:
- ✅ Simpler user flow - one OAuth approval
- ✅ All permissions visible upfront at login
- ✅ Matches Vercel/industry pattern
- ✅ No separate OAuth step needed during import

**Next Steps**:
- Consider implementing OAuth-based repository listing (see `docs/github-oauth-setup.md` for guide)
- This would allow users to see all repos they have access to (not just installed ones)

---

## Phase 1: Critical Fixes & Stability (High Priority)

### 1.1 Pagination & Scalability
**Issue**: Only fetches first 100 repos (hardcoded limit)
- Implement pagination for `getRepositoriesWithApp` endpoint
- Add infinite scroll or "Load More" in UI (`setup.tsx:244`)
- Handle users with 100+ repositories
- **Files**: `github.ts:144-183`, `setup.tsx:59-66`

### 1.2 Environment Configuration Validation
**Issue**: GitHub env vars are optional, can cause runtime failures
- Make GitHub App env vars required when feature is enabled
- Add startup validation in `config.ts:22-34`
- Provide clear error messages when misconfigured
- **Files**: `env.ts:60-62`, `config.ts`

### 1.3 Timeout & Large Repository Handling
**Issue**: 30s timeout may be insufficient for large repos
- Increase timeout or make configurable
- Add progress feedback during import
- Implement streaming status updates
- **Files**: `codesandbox/index.ts:176-201`, `sandbox.ts:182-226`

### 1.4 Error Handling & Logging
**Issue**: Console.error usage, poor error context
- Replace console.error with proper logging/telemetry
- Add structured error tracking (PostHog/Sentry integration)
- Improve error messages for user troubleshooting
- **Files**: All `_hooks/*.ts` files, `github.ts`

## Phase 2: Feature Enhancements (Medium Priority)

### 2.1 Branch Selection
**Issue**: Always imports default branch
- Add branch selector in setup UI
- Fetch available branches via GitHub API
- Store selected branch in context
- **Files**: `setup.tsx`, `github.ts` (add `getBranches` endpoint)

### 2.2 Repository Validation & Preview
**Issue**: No pre-import validation
- Validate repo size before import
- Check for required files (package.json, etc.)
- Show repository structure preview
- Warn about large repositories
- **Files**: New `use-repo-preview.ts`, `github.ts` (add validation endpoint)

### 2.3 Import State Tracking
**Issue**: No history of imports
- Track imported repositories in database
- Show import history in UI
- Enable re-sync/update functionality
- Detect duplicate imports
- **Files**: New DB schema, new tRPC router

### 2.4 Search Improvements
**Issue**: Client-side only, fetches all repos first
- Add server-side search via GitHub API
- Debounce search queries
- Cache repository list with TTL
- **Files**: `github.ts` (modify getRepositoriesWithApp), `use-data.ts`

## Phase 3: Polish & Optimization (Lower Priority)

### 3.1 Installation State Management
**Issue**: Refetches on every window focus
- Implement smart caching with TTL
- Reduce unnecessary API calls
- Add manual refresh button
- **Files**: `use-installation.ts:18-20`

### 3.2 UX Improvements
- Extend callback page auto-close from 3s to 5s
- Add "Close manually" button
- Improve loading states with skeleton screens
- Add progress indicators during import
- **Files**: `install/page.tsx:60-63`, `finalizing.tsx`

### 3.3 Advanced Features
- Monorepo support (select specific packages)
- Commit/tag selection (not just branches)
- Bulk import multiple repos
- Private repo access verification
- Organization-wide settings

## Phase 4: Testing & Monitoring

### 4.1 Automated Testing
- Unit tests for GitHub API integration
- Integration tests for import flow
- E2E tests for complete user journey
- Edge case testing (large repos, rate limits, network failures)

### 4.2 Monitoring & Observability
- Track import success/failure rates
- Monitor API latency and timeouts
- Alert on elevated error rates
- Dashboard for GitHub App health

### 4.3 Documentation
- User-facing: How to set up GitHub App
- Developer docs: Architecture overview
- Troubleshooting guide
- Security & permissions documentation

## Implementation Order (Suggested)

1. **Week 1-2**: Phase 1 (Critical Fixes)
2. **Week 3-4**: Phase 2.1-2.2 (Branch selection, validation)
3. **Week 5**: Phase 2.3-2.4 (Tracking, search)
4. **Week 6**: Phase 3 (Polish)
5. **Week 7-8**: Phase 4 (Testing, monitoring)

## Key Files to Modify

- `apps/web/client/src/server/api/routers/github.ts` - API logic
- `apps/web/client/src/server/api/routers/project/sandbox.ts` - Import logic
- `apps/web/client/src/app/projects/import/github/_components/setup.tsx` - UI
- `apps/web/client/src/app/projects/import/github/_hooks/*` - State management
- `packages/github/src/*` - GitHub integration
- `packages/code-provider/src/providers/codesandbox/index.ts` - CodeSandbox integration

---

## Code Quality Issues (To Refactor)

### Critical Priority 🔴

#### 1. Hardcoded Pagination Limit (`github.ts:158-159`)
```typescript
per_page: 100,
page: 1,
```
**Problem**: Users with 100+ repositories will never see them all.
**Impact**: Feature completely broken for power users/large orgs.
**Fix**: Implement pagination with cursor-based pagination or fetch all pages.

#### 2. CSRF Validation Bug (`github.ts:196`)
```typescript
if (input.state && input.state !== ctx.user.id) {
```
**Problem**: If `input.state` is empty string/falsy, validation passes!
**Impact**: Security vulnerability - CSRF protection can be bypassed.
**Fix**: Change to `if (!input.state || input.state !== ctx.user.id)`

#### 3. Excessive API Refetching (`use-installation.ts:19`)
```typescript
refetchOnWindowFocus: true,
```
**Problem**: Refetches every time user switches tabs/windows.
**Impact**: Hammers API unnecessarily, poor performance.
**Fix**: Remove or add `staleTime: 5 * 60 * 1000` (5 minutes).

### High Priority 🟡

#### 4. getUserGitHubInstallation Design Flaw (`github.ts:11-27`)
```typescript
if (!user?.githubInstallationId) {
    throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'GitHub App installation required',
    });
}
```
**Problem**: Forces every caller to handle exceptions for normal "not installed" case.
**Impact**: Awkward error handling, checkGitHubAppInstallation hack needed.
**Fix**: Return `null` or use Result type: `{ ok: true, data } | { ok: false, error }`

#### 5. Unnecessary GitHub API Call (`github.ts:128-131`)
```typescript
const { octokit, installationId } = await getUserGitHubInstallation(ctx.db, ctx.user.id);
await octokit.rest.apps.getInstallation({
    installation_id: parseInt(installationId, 10),
});
```
**Problem**: Wastes GitHub API rate limit just to validate installation exists.
**Impact**: Rate limit exhaustion, slower response times.
**Fix**: Just return installationId from database without validation call.

#### 6. No Rate Limit Handling
**Problem**: No handling for GitHub API rate limits (5000/hour).
**Impact**: Will fail catastrophically when rate limited.
**Fix**:
- Catch 429 responses
- Implement exponential backoff
- Show user-friendly error messages
- Cache responses

#### 7. No Caching Strategy
**Problem**: Every query hits DB + GitHub API, even for stable data.
**Impact**: Poor performance, rate limit waste.
**Fix**: Cache organizations/repos list for 5-10 minutes.

### Medium Priority 🟠

#### 8. Redundant Error State (`use-installation.ts:21-26`)
```typescript
const [error, setError] = useState<string | null>(null);
useEffect(() => {
    setError(checkInstallationError?.message || null);
}, [checkInstallationError]);
```
**Problem**: Duplicates React Query's built-in error state.
**Impact**: Unnecessary complexity, potential state sync issues.
**Fix**: Use `checkInstallationError?.message` directly in return statement.

#### 9. Silent Error Swallowing (`use-installation.ts:42-44`)
```typescript
catch (error) {
    console.error('Error generating GitHub App installation URL:', error);
}
```
**Problem**: Errors logged but never shown to user.
**Impact**: User has no feedback when installation flow fails.
**Fix**: Set error state or show toast notification.

#### 10. Unused Parameter (`github.ts:149`)
```typescript
username: z.string().optional(),
```
**Problem**: Accepted in schema but never used in function.
**Impact**: Misleading API, confusing for developers.
**Fix**: Remove parameter or implement filtering by username.

#### 11. Type Casting with `as any` (`github.ts:75`)
```typescript
login: 'login' in installation.data.account ? installation.data.account.login : (installation.data.account as any).name || '',
```
**Problem**: Type safety bypass indicates upstream type issues.
**Impact**: Will break if GitHub API changes, runtime errors.
**Fix**: Properly type GitHub API responses or use type guards.

#### 12. console.log/error/warn Throughout
**Locations**: `github.ts:84, 140, 179, 197, 210` and all `_hooks/*.ts`
**Problem**: Unstructured logging, no correlation IDs, hard to debug production.
**Impact**: Poor observability, can't track issues in production.
**Fix**: Use structured logging (PostHog events, Sentry, or logging library).

### Low Priority 🟢

#### 13. Dead Code (`use-installation.ts:34`)
```typescript
const finalRedirectUrl = redirectUrl;
```
**Problem**: Useless variable assignment.
**Impact**: Code clutter.
**Fix**: Remove variable, use `redirectUrl` directly.

#### 14. Redundant Null Coalescing (`use-installation.ts:49`)
```typescript
installationId: installationId || null,
```
**Problem**: `installationId` is already `string | null` type.
**Impact**: Unnecessary operation.
**Fix**: Just return `installationId`.

#### 15. Repeated Try-Catch Patterns
**Problem**: Same error handling boilerplate in multiple endpoints.
**Impact**: Code duplication, maintenance burden.
**Fix**: Extract to middleware or helper function.

---

## Refactoring Priority Order

1. **🔴 Critical** (Must fix before production):
   - Fix pagination (Issue #1)
   - Fix CSRF bug (Issue #2)
   - Remove excessive refetching (Issue #3)

2. **🟡 High** (Should fix soon):
   - Refactor getUserGitHubInstallation (Issue #4)
   - Remove unnecessary API call (Issue #5)
   - Add rate limit handling (Issue #6)
   - Add caching layer (Issue #7)

3. **🟠 Medium** (Technical debt):
   - Clean up hook error handling (Issues #8, #9)
   - Fix unused parameters/types (Issues #10, #11)
   - Replace console.* with structured logging (Issue #12)

4. **🟢 Low** (Polish):
   - Remove dead code (Issues #13, #14)
   - Extract common patterns (Issue #15)
