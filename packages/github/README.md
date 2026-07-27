# @onlook/github

GitHub integration package for Onlook that enables importing repositories from GitHub.

## Creating a GitHub App

### Step 1: Create New GitHub App

1. Go to GitHub Settings:
   - **Personal account**: https://github.com/settings/apps
   - **Organization**: https://github.com/organizations/YOUR_ORG/settings/apps

2. Click **"New GitHub App"**

3. Fill in basic information:
   - **GitHub App name**: `Onlook` (or `Onlook Dev` for testing)
   - **Homepage URL**: Your production URL or `http://localhost:3000` for local dev
   - **Callback URL**: `https://yourdomain.com/callback/github/install` (or `http://localhost:3000/callback/github/install` for local)
   - **Setup URL**: `https://yourdomain.com/callback/github/install` (or `http://localhost:3000/callback/github/install` for local)
   - ✅ **Check** "Redirect on update"
   - **Webhook**: Leave unchecked/inactive for now
   - **Webhook URL**: Leave blank
   - **Webhook secret**: Leave blank

### Step 2: Configure Permissions

Set these permissions (all others should be "No access"):

#### Repository Permissions
- ✅ **Contents**: **Read-only**
- ✅ **Metadata**: **Read-only** (automatic)

#### Organization Permissions
- ❌ All: **No access**

#### Account Permissions
- ❌ All: **No access**

### Step 3: Configure Installation

- **Where can this GitHub App be installed?**
  - Select **"Any account"** (recommended)
  - Or **"Only on this account"** for testing

### Step 4: Post-Installation Settings

- ☑️ **Expire user authorization tokens**: Checked (recommended)
- ☐ **Request user authorization (OAuth) during installation**: Unchecked
- ☐ **Enable Device Flow**: Unchecked

### Step 5: Webhooks & Events

- ☐ **Active**: Unchecked (no webhooks needed for basic import)
- **Subscribe to events**: Leave all unchecked

### Step 6: Generate Private Key

1. After creating the app, scroll to **"Private keys"** section
2. Click **"Generate a private key"**
3. Save the downloaded `.pem` file securely

### Step 7: Note Your Credentials

From the GitHub App settings page, copy:
- **App ID** (at the top of the page)
- **App Slug** (in the URL: `github.com/apps/YOUR-SLUG-HERE`)
- **Private Key** (the `.pem` file you downloaded)

---

## Environment Configuration

### Step 1: Convert Private Key

The private key must be in PKCS#8 format. Check the format:

```bash
head -1 /path/to/your-key.pem
```

If it shows `-----BEGIN RSA PRIVATE KEY-----`, convert it:

```bash
cd packages/github
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
  -in /path/to/your-key.pem \
  -out /path/to/converted-key.pem
```

Verify the converted key shows `-----BEGIN PRIVATE KEY-----`:

```bash
head -1 /path/to/converted-key.pem
```

### Step 2: Add to Environment Variables

Add these to your `.env` or `.env.local` file:

```bash
# GitHub App Configuration
GITHUB_APP_ID="123456"
GITHUB_APP_SLUG="your-app-slug"
GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...
...your full private key here (with newlines)...
-----END PRIVATE KEY-----"
```

**Important**:
- The private key must include the full multi-line string with BEGIN/END markers
- Keep the quotes around the key value
- Delete the `.pem` files after adding to environment variables

## Architecture

This package uses GitHub App authentication (installation tokens), not OAuth user tokens:

- **Installation Authentication**: App authenticates as itself to access repositories
- **Installation ID**: Stored per-user in the database
- **Octokit**: GitHub REST API client with App authentication
- **Permissions**: Scoped to only what the app needs (read-only repository contents)

Key files:
- `src/auth.ts` - Creates authenticated Octokit instances
- `src/config.ts` - Validates GitHub App configuration
- `src/installation.ts` - Handles installation URL generation and callbacks
- `src/types.ts` - TypeScript types for GitHub resources

---

## Security Notes

- 🔒 Private keys should never be committed to source control
- 🔒 Use environment variables or secrets managers for credentials
- 🔒 The app uses installation authentication, not user OAuth tokens
- 🔒 State parameter is used for CSRF protection in callbacks
- 🔒 Minimum permissions principle (only read-only repository contents)
- 🔒 Installation can be revoked at any time by the user on GitHub

---

## Useful Links

- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [Creating a GitHub App](https://docs.github.com/en/apps/creating-github-apps)
- [Octokit SDK](https://github.com/octokit/octokit.js)
- [GitHub App Authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app)