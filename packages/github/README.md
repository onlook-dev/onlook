# @onlook/github

GitHub integration package for Onlook.

## Setup

### GitHub App Configuration

You need to set these environment variables:

- `GITHUB_APP_ID` - Your GitHub App's ID
- `GITHUB_APP_PRIVATE_KEY` - Your GitHub App's private key (PKCS#8 format)
- `GITHUB_APP_SLUG` - Your GitHub App's slug name

### Private Key Format

The GitHub App private key must be in PKCS#8 format. If you have a PKCS#1 key (starts with `-----BEGIN RSA PRIVATE KEY-----`), convert it using:

```bash
bun run convert-key path/to/your-key.pem -out path/to/converted-key.pem
```

Then use the contents of the converted key for the `GITHUB_APP_PRIVATE_KEY` environment variable.