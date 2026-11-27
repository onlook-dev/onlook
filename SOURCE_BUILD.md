# Build Onlook Source on a Mac

Onlook Source runs locally without an Onlook account, email address, cloud keys or `.env` file. To chat, connect your own Claude Code or Codex account during setup. Those providers have their own account and subscription requirements.

## Prerequisites

- macOS on Apple silicon or Intel.
- Xcode Command Line Tools: run `xcode-select --install` if they aren’t installed.
- Git, Node.js 24 and Bun 1.4.2 or newer on `PATH`. The repository pins 1.4.2 for reproducible checks; newer Bun versions can also build it. Node is needed by packaging tools even though Bun runs the build scripts.
- Internet access to download dependencies and connect your coding agent.

Check your tools with `git --version`, `node --version` and `bun --version`.

If compiling a native dependency reports `unknown architecture arm64e.x1` in a Mac SDK, point the build at a compatible installed SDK before installing or packaging, for example:

```sh
export SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk
```

Use that path only if that SDK is installed; otherwise install compatible Xcode Command Line Tools.

## Clone, install and open

```sh
git clone https://github.com/onlook-dev/onlook.git
cd onlook
bun install --frozen-lockfile --cpu='*'
bun run build
bun dev
```

The install includes both Mac architectures for packaging. The build needs no keys; leave `STUDIO_CLOUD_BUILD` unset. Every checkout, including a Git worktree, needs its own dependency install.

Installing Electron and rebuilding native dependencies can take several minutes, especially on a slow connection. The install reports progress for those steps. For troubleshooting, add `--verbose` to the install command for detailed output.

On first launch, choose whether to share usage data. Either choice continues to setup, where you connect Claude Code or Codex and create a Project. You can change the choice later in Settings.

## Package an app

```sh
bun run build:dmg
```

This builds both Mac architectures and creates `Onlook Source` apps, DMGs and ZIPs under `release/`. It needs no Onlook signing credentials. Without a Developer ID, the result is for your own Mac, not a trusted download for other people. To build app bundles without installers, use `bun run build:dmg --dir`.

Allow about 2.3 GB for `release/` in addition to the checkout and installed dependencies. Packaging also needs temporary space, and output size varies by version. You can delete `release/` when you no longer need the packaged apps and installers.

Installer filenames use the app version in `apps/studio/package.json`, which the packaging command prints. The root `package.json` version belongs to the workspace, not the app.

Open the app matching your Mac:

```sh
# Apple silicon
open 'release/mac-arm64/Onlook Source.app'
# Intel
open 'release/mac/Onlook Source.app'
```

If macOS blocks an unsigned app you built, follow macOS’s Privacy & Security guidance. Don’t disable Gatekeeper globally.

## Separate from official Onlook

Onlook Source uses bundle ID `com.onlook.studio.source` and stores its data in `~/Library/Application Support/Onlook Studio Source`. It doesn’t read official Onlook’s data or install its updates. To update your source build, pull the repository, install dependencies again, and rebuild.

Official builds use a separate cloud build configuration, which adds sign-in, cloud services and updates. Signing or packaging a source build doesn't make it an official build.

## Usage data

Source builds ask before sending any usage data. Choose **Yes, share usage data** to share usage events and basic device information, or **Don’t share** to continue without sharing. Change your answer at any time in **Settings → Global → Privacy → Share usage data**. Source events are marked `build_kind: source` in the same analytics project as official events, and never include session recordings, diagnostic logs, error reports, code, file paths, or chat messages. To leave telemetry out entirely, build with `STUDIO_TELEMETRY=0 bun run build`. That build has no telemetry question, ingestion key, analytics code or replay SDK, and sends nothing even if a key is supplied at runtime.
