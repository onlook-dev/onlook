# Telemetry properties

## Workspace properties

Events about a Workspace carry two properties. Neither contains a repository name, URL, path or account id.

| Property | Definition | Use |
| --- | --- | --- |
| `project_id` | First 16 lowercase hex characters of `sha256(repoIdentity)` | Groups activity by repository across installations. It identifies neither a Project nor an installation. |
| `workspace_instance_id` | First 16 lowercase hex characters of `sha256(installId + repoIdentity)` | Counts distinct Workspaces per installation. Projects in one Workspace on one installation share it; the same repository on another installation gets a different value. |

`repoIdentity` is the Workspace's canonical identity; for a git import, the normalised host, organisation and repository. `installId` is Onlook's persisted `install-id`, not the analytics distinct id, account id or session id, so signing in or out doesn't change it.

Use `workspaceTelemetryProperties(repoIdentity)` when you have the Workspace record, including before registration and after removal, and `resolveWorkspaceTelemetryProperties(workspacePath)` for a registered Project; it returns neither property for an unknown path. Send both on the same event. The renderer sends its worktree reference and main resolves the values; main never accepts either value from the renderer. Events from before `workspace_instance_id` existed are not backfilled.

## Flag properties

Every event captured after flags are resolved carries `$feature/<key>` for every key in `FLAGS` (`packages/events/src/flags.ts`), as this launch resolved it. Events captured earlier, and identity events, carry none. The values are stored with the event when it is queued, so a batch sent on a later launch keeps the launch's own answers.

## Website attribution

`onlook://web-link` and `onlook://attribution` link a website visitor to this installation without merging analytics people: neither changes Onlook's distinct id or identifies, aliases or merges the website id. Cloud sends `onlook://web-link`.

`attribution.ts` validates the query and sets the limits. Each scheme accepts only its own key names: `onlook://web-link` names each value after the person property it sets (`ph_id`, `first_utm_source`, …, `first_landing_page`), while `onlook://attribution` and the sign-in callback use `ph_id`, `utm_*`, `initial_referrer`, `initial_referring_domain` and `landing_page`. Unknown or duplicate keys and malformed values are rejected, and URLs are reduced to origin and path. A sign-in callback carrying a `first_*` key is refused as a whole, and invalid attribution never fails sign-in.

With the `web-attribution-link` flag off, Onlook sends `web_attribution_candidate` with person processing off. With it on, Onlook sets `website_person_id` and the first-touch values once (`$set_once`), then sends `web_attribution_linked`. The first valid website id is kept per installation, and a link bound to a verified account can't be used by another. The receipt is written before the events are queued, so an unwritable state file means no link rather than one per launch.

## Onboarding

`onboarding_screen_shown` and `onboarding_screen_passed` name the screen (`ONBOARDING_SCREENS` in `packages/events/src/onboarding.ts`). A screen counts as shown only while the sign-in prompt isn't covering it. `visit` above 1 means the person came back with Back. `is_first_launch` is the same reading as on `app_opened`.

`onboarding_survey_answered` carries the question key and an option key from `FOUND_US_OPTIONS`; any other answer sends nothing here. Text typed for "other" goes to the provider with the answer and is never sent as usage data; only `has_detail` records that it exists. The person property `found_us` keeps the first answer. The survey screen appears only when the provider declares the `survey` capability, and answers are recorded only for a signed-in account.
