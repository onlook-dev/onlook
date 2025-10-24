# GitHub App Setup for Testing

This guide will help you create a test GitHub App to develop and test the GitHub import functionality.

## Prerequisites

- A GitHub account
- Access to create GitHub Apps (personal account or organization)
- Local development environment running

## Step 1: Create a New GitHub App

1. Go to GitHub Settings:
   - **Personal account**: https://github.com/settings/apps
   - **Organization**: https://github.com/organizations/YOUR_ORG/settings/apps

2. Click **"New GitHub App"**

3. Fill in the basic information:
   - **GitHub App name**: `Onlook Test App` (or similar)
   - **Homepage URL**: `http://localhost:3000` (your local dev URL)
   - **Callback URL**: `http://localhost:3000/callback/github/install`
   - **Setup URL**: Leave blank
   - **Webhook URL**: Leave blank for now (or use ngrok for local testing)
   - **Webhook secret**: Leave blank for testing

## Step 2: Configure Permissions

The app needs the following permissions:

### Repository Permissions
- **Contents**: Read-only (to read repository files and clone)
- **Metadata**: Read-only (automatic, for basic repo info)

### Account Permissions
- **Email addresses**: Read-only (to get user email)

### Where can this GitHub App be installed?
- Select **"Any account"** for testing

## Step 3: Generate Private Key

1. After creating the app, scroll down to **"Private keys"**
2. Click **"Generate a private key"**
3. A `.pem` file will be downloaded - **save this securely**

## Step 4: Note Your App Credentials

You'll need these values:
- **App ID**: Found at the top of your app's settings page
- **Client ID**: Found in the "About" section
- **App Slug**: The URL-friendly name (e.g., `onlook-test-app`)
- **Private Key**: The `.pem` file you downloaded

## Step 5: Convert Private Key (if needed)

The private key needs to be in PKCS#8 format. Check the key format:

```bash
# If the key starts with "-----BEGIN RSA PRIVATE KEY-----", convert it:
cd packages/github
bun run convert-key path/to/your-downloaded-key.pem -out path/to/converted-key.pem
```

## Step 6: Configure Environment Variables

1. Copy the example env file (if you haven't already):
```bash
cp apps/web/client/.env.example apps/web/client/.env.local
```

2. Add your GitHub App credentials to `.env.local`:

```bash
# GitHub App Configuration
GITHUB_APP_ID="123456"
GITHUB_APP_SLUG="onlook-test-app"
GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...
...your full private key here (with newlines)...
-----END PRIVATE KEY-----"
```

**Important**: The private key must include the full multi-line string with BEGIN/END markers.

## Step 7: Install the App

1. Start your local development server:
```bash
bun run dev
```

2. Navigate to the GitHub import flow: `http://localhost:3000/projects/import/github`

3. Click the "Connect GitHub" or "Install GitHub App" button

4. You'll be redirected to GitHub to authorize the app

5. Select which repositories the app can access:
   - **All repositories** (for testing)
   - **Only select repositories** (choose test repos)

6. Click **"Install"**

7. You'll be redirected back to your local app

## Step 8: Verify Installation

Check that the installation worked:

1. The callback page should show success
2. Check your database - the `users` table should have a `githubInstallationId` for your user
3. Try fetching repositories in the import UI

## Troubleshooting

### "Invalid credentials" or "401 Unauthorized"
- Verify your App ID is correct
- Check that the private key is in PKCS#8 format
- Ensure the private key includes BEGIN/END markers

### "Missing state parameter"
- Clear your browser cookies/cache
- Restart your dev server
- Try the installation flow again

### "GitHub App installation required"
- The installation may not have completed
- Check GitHub Settings > Applications > Installed GitHub Apps
- Uninstall and try again

### Private key format issues
```bash
# Check key format:
head -1 your-key.pem

# Should see: -----BEGIN PRIVATE KEY-----
# If you see: -----BEGIN RSA PRIVATE KEY-----
# Then convert it using the convert-key script
```

## Testing Checklist

Once installed, test these scenarios:

- [ ] Connect GitHub account
- [ ] View list of repositories
- [ ] Filter by organization
- [ ] Search repositories
- [ ] Import a small public repository
- [ ] Import a small private repository
- [ ] Handle installation errors
- [ ] Uninstall and reinstall the app

## Production Considerations

When moving to production:

1. Create a separate production GitHub App
2. Update callback URL to production domain
3. Store private key securely (use secrets manager)
4. Enable webhook for future features
5. Review and minimize permissions
6. Set up proper error monitoring
7. Add rate limit handling

## Useful Links

- GitHub Apps Documentation: https://docs.github.com/en/apps
- Testing GitHub Apps: https://docs.github.com/en/apps/creating-github-apps/setting-up-a-github-app/creating-a-github-app
- Octokit SDK (what we use): https://github.com/octokit/octokit.js
