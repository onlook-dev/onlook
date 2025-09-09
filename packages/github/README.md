# @onlook/github

Simple GitHub App installation utilities.

## Installation

```bash
bun add @onlook/github
```

## Usage

### Generate Installation URL

```typescript
import { generateInstallationUrl } from '@onlook/github';

const installUrl = generateInstallationUrl('your-app-slug', {
    state: 'user-123',
    repositoryIds: [12345, 67890], // optional
});

// Redirect user to install the GitHub App
window.location.href = installUrl;
```

### Handle Installation Callback

```typescript
import { handleInstallationCallback } from '@onlook/github';

// Parse URL parameters from GitHub callback
const params = {
    installation_id: '12345',
    setup_action: 'install' as const,
    state: 'user-123', // optional
};

const result = handleInstallationCallback(params);
console.log(result.installationId); // 12345
console.log(result.isNewInstallation); // true
```

That's it! Simple GitHub App installation flow with just two functions.
