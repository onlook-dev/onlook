# Cloud provider

Onlook's account, teams and other hosted services come from a provider module that is built separately and plugged in at build time. A source build plugs in `local.ts`, which does nothing and asks for no sign-in.

## The provider API

`provider-api.ts` is the only module under `main/` a provider may import. It re-exports by name the contract types, the state publisher, the report error, and the state-folder and file services, and nothing else; everything else under `main/` can change without notice. The editor itself never imports it (`check:imports`).

`PROVIDER_API_VERSION` goes up whenever a change would break a provider built against the previous version: a name removed or renamed, or a signature changed. Adding a name doesn't raise it. A provider compares it with the version it was written for and fails its own build on a mismatch. `provider-api.test.ts` pins the exported names and the files the module bundles.

`provider-fake.ts` implements the contract in memory for tests: `createFakeProvider()` answers as a test sets it up and records every call.

## What a provider exports

The `@onlook/cloud-provider` slot resolves at build time; there is no runtime choice. `createStudioConfig({ providerEntry, edition, defines })` in `apps/studio/electron.vite.config.ts` builds Onlook around a provider, and with no options it is the source build.

- `createOnlookClient(options)` returns an `OnlookClient` (`client.ts`), with a token-free `session` and a live `me` snapshot. Main owns one instance; Tabs subscribe over the bridge. Frames get no cloud bridge or credentials.
- `identity: CloudIdentity` owns browser sign-in, session restore, refresh and credential storage. Main receives identity metadata, whether a session exists, and change notifications, never tokens. `signIn(method)`, `signOut()` and `deleteAccount()` are backend-neutral.
- `capabilities` names what the provider can do: `account`, `teams`, `github`, `report`, `survey`, `updates`, `links`. A missing name is a capability it lacks. Main reads them once per view and passes them in the view's load query (`packages/events/src/tab-birth.ts`), and the renderer reads them through `capable()` (`renderer/src/capabilities.ts`), so a surface the provider can't serve is never drawn. A provider with no `capabilities` export gets the defaults in `capabilities.ts`.
- `flag(key)` optionally answers feature flags. Main asks once per key in `FLAGS` before any renderer mounts and keeps the answer for the launch. `flagOn` resolves `STUDIO_FLAGS` (`key` on, `-key` off), then the provider's answer, then the build default. A retired key decides nothing (`RETIRED_FLAGS`).
- `checkLaunchSession(signal)` optionally reports whether the stored session is `valid`, `unavailable` or `ended` (`expired`, `revoked` or `ended`). Only a definitive answer may be `ended`; a network failure, timeout or bad response is `unavailable`. The check never deletes credentials. On `ended`, main records `session_ended_at_launch` and clears the stored identity (`launch-session.ts`).
- `onSignInFailure` reports a sign-in failure the provider absorbed. It carries a method and a code from `SIGN_IN_FAILURE_CODES`, nothing else, and main checks both on arrival.
- `submitReport` sends the report form with one validated image.

## Identity and the stored account

Onlook's identity names no vendor: `{ email, name?, source, subject?, previousSubject?, pictureUrl? }`. `subject` is the provider's id for the account and is the telemetry distinct id. Older providers hand over vendor-named fields; only `main/identity/store.ts` and `main/identity/provider-shape.ts` read those and turn them into the neutral names.

The record is `account.json` (`account-development.json` for an unpackaged macOS build). Older builds read and write only `identity.json`, so:

- A write writes the legacy file first, then `account.json` with `mirrored: true`.
- A read never writes. A readable legacy record that differs from `account.json` wins, because only an older build writes that file alone. A `mirrored` record whose legacy file is gone was signed out by an older build.
- Sign-out and account deletion erase both, the legacy file first.
- A file written by a newer build is never replaced or erased.

A stored record is only a claim. It names the session's account only while the server's `me` agrees, and a deletion needs a current answer from the server. Telemetry waits the same way: events queue with no distinct id until the server names the account, and if nothing answers by the first flush they go out under the launch's own id. An `unreadable` session change is not a sign-out, so the metadata survives it.

## Old builds

Main passes the build's commit count (from `scripts/version.ts`) to the provider. When the service no longer supports that build, the client publishes `updateRequired`, and the renderer covers the editor with an update screen. Nothing local is reset.
