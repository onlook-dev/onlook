# GitHub import

Behind the `github-import` flag, off by default. With it off, nothing here runs: no connection requests, clones, cleanup or events.

## Credentials

A provider with the `github` capability supplies the broker in `backend.ts`: `start`, `status`, `repositories` and `credential`. The provider's service owns the OAuth grant and its refresh. Onlook holds a short-lived credential in main only while it lists branches or clones. It is never a renderer prop, SDK input, environment variable or saved setting.

Git gets the credential through the operating system's curl over a loopback socket protected by a nonce, matched to an exact HTTPS host and path. The helper configuration holds the nonce, not the token, and curl ignores user configuration and proxies. The helper does not run the app executable, so packaged security fuses can keep Node mode disabled. Git runs with credential helpers, hooks, redirects, templates and inherited Git overrides turned off.

## Cloning

A clone goes into a directory created exclusively for it. A journal and an ownership marker let the next startup remove only interrupted clones it owns, and cancelling waits for that cleanup. A finished clone continues through the normal copy-and-Project-branch flow. A repository whose remote is already registered opens its existing Workspace instead.

The service owns one import phase: idle, loading, ready, cloning, done or failed. `GithubImportState` is the snapshot sent to the renderer, derived from that phase. A newer selection replaces an older one's pending work in both processes. Clone requires the repository id to match main's current selection and asks for a fresh credential only after the press. Open project (`open`) checks only the workspace registry and never clones or asks for a credential.

## Analytics

Import events carry only bounded source, entry point, outcome, next-action and step values, plus the hashed `project_id`. Repository names, owners, URLs, branch names, paths and credentials never go in them.
