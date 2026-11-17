# Scripts

The root `package.json` names every command, and this file says what each one is for. Packaging commands (`build:dmg`, `build:dmg:dir`, `build:windows`) have their notes beside them in `package.json`.

## Checks

### `verify`

Run this before you open a pull request. It runs the Node version check, `check:secrets`, `check:publication`, `typecheck`, `test:unit`, `test:pty`, `check:strings`, `check:imports`, `check:unused`, `check:scratch`, `check:lint`, `check:react` and `build`, in that order, and stops at the first failure. It needs Node 24 on `PATH`.

CI runs the same scripts as named steps in `.github/workflows/ci.yml`. A check added to one and not the other leaves them out of step.

### `check:secrets`

Scans tracked files and Git history for credentials with Gitleaks. It downloads the scanner version pinned in `secrets.ts` and checks the archive's SHA-256 before extracting it. Network, checksum, scanner and incomplete-history errors fail the check. Only counts and redacted locations are printed, and no key is sent anywhere for verification.

The scan covers tracked working files, the messages of annotated tags, and history including deleted files, merge diffs and commit messages. Which history depends on `PREVIOUS_PRODUCT_LAST_COMMIT`, the full SHA in `secrets.ts` where the previous product's history ends:

- When that commit is an ancestor of `HEAD`, the scan covers `<that commit>..HEAD`. Other branches are not scanned; check each one out to scan it.
- Otherwise it covers all fetched history on every branch and tag.

A shallow checkout passes only when that commit is an ancestor of `HEAD` and every commit after it is fetched; any other shallow checkout fails. Ignored and untracked files are not scanned, so add new files to Git first.

`.gitleaks.toml` extends the scanner's standard rules. Its exceptions match both path and value: sequential test tokens, keyboard accelerators, the public RFC 6455 handshake nonce, and analytics ingest keys at the telemetry call site. Ingest keys can submit events but not read data or manage the account. Inline suppression comments and `.gitleaksignore` are not honoured. A key no specific rule recognises falls to the generic rule, which skips any value containing one of its stopwords (such as `dead` or `feed`), so about one random hex key in 500 passes.

A passing scan doesn't make a leaked credential safe: revoke or rotate it, even after deleting the file.

### `hooks:install`

Sets this clone's `core.hooksPath` to `.githooks`, whose `pre-push` hook runs `check:secrets`, refuses direct pushes to `main`, and refuses to push a revision other than the checked-out `HEAD`. It refuses to replace another hook setup; add the check to that setup instead. To uninstall, run `git config --local --unset core.hooksPath`.

### `check:publication`

Reads tracked files, including hidden files, symlink targets and asset bytes, and fails on personal home paths and private links to team tools. It also catches percent-encoded paths, JSON escapes and UTF-16 metadata. `check-publication.ts` lists the fictional usernames allowed in privacy-test fixtures, by exact path. The public Figma connector origin and its `/mcp` endpoint are allowed. Failures show locations and classes, never the matched values. Untracked and ignored files are not checked.

It also counts the names of hosted-service vendors (`VENDOR_NAMES`), in any case, in tracked paths and text. `check-publication.vendors.txt` lists today's uses as `file → name count`. A use that isn't listed fails, and so does a listed line whose uses are gone, until `bun run check:publication --prune-vendors` lowers or drops it. Pruning never adds a line or raises a count. `bun.lock`, `NOTICE` and the generated `compliance/dependencies.json` are not counted.

The check doesn't read Git history, GitHub discussions, compressed asset metadata or the meaning of prose.

### `check:strings`

Lints the string catalog. It fails when an English key has no reference in a source file, or is filed in the wrong area file. It lists, without failing, every translated value whose placeholders differ from English; such a value shows English until the next `translate`. A key counts as referenced when its bare text appears in a source file, in any kind of quotes.

### `check:imports`

Lints source boundaries. It keeps the Claude Agent SDK inside the agent host and direct React effects out of the canvas shell, keeps renderer imports along their layers ([CODING.md](../CODING.md), Renderer layers), and stops main's leaves from importing anything above them (Main leaves). A renderer file that uses a class from a component sheet must import that sheet (Component sheets). `check-imports.layers.txt`, `check-imports.leaves.txt` and `check-imports.styles.txt` list the files that break each rule today, and these lists only shrink.

`--layers` counts the entries. `--prune-baseline` drops lines whose import is gone. The check matches text, so it can miss an import built at run time, but it never reports a legal static import.

### `check:unused`

Lints for unused code with knip. It fails on a source file nothing imports, an export or exported type no other file reads, and a dependency nothing uses. `knip.jsonc` names the entry points and gives the reason for each exception. A test file is an entry point, so an export only its tests use counts as used. Code that is kept but not called carries `@parked ONL-xxxx` ([CODING.md](../CODING.md)) and isn't reported.

### `check:scratch`

Lints for throwaway scripts. It fails on a tracked `.scratch/` path or `.scratch.*` name anywhere, and on a script file under `tests/e2e` or `tests/live` that no test runner there collects. It reads only tracked files and only checks those locations.

### `check:lint`

oxlint. Errors fail; warnings are a visible backlog. Suppressions are in `.oxlintrc.json`, each with its reason.

### `check:react`

A React quality scan with react-doctor. `doctor.config.jsonc` holds its scope and every non-default choice. It runs offline: `--no-telemetry` turns off the tool's own telemetry, and `CI=1` keeps it from waiting for input. The version is pinned exactly, and raising it means reviewing the new rules.

## Tests

### `test`

`test:unit`, then `test:pty`, run one after the other so a failure names the runner it came from.

### `test:unit`

Unit tests, one Bun process per file across min(cores, 4) slots. `--jobs N` sets the slot count, and other arguments filter by path substring. A failure names its file and test.

It sets `GIT_CONFIG_GLOBAL=/dev/null`: the fixtures build real git repositories, and a global `core.hooksPath` would override their hooks and slow every commit.

### `test:report`

The unit tests with results written as one JUnit report, to `$JUNIT_REPORT_PATH` or `.test-results/unit.xml`. `--junit <path>` on `test:unit` does the same.

### `test:focused`

`test:unit` filtered to the paths you name, for quick iteration. It doesn't replace `test`.

### `test:pty`

Tests that must run under Node, because Bun doesn't model some runtime behaviour the app depends on. Where the two disagree, Node is right. It sets `GIT_CONFIG_GLOBAL=/dev/null` like `test:unit`.

### `test:windows`

The Windows dev-server tests, under Node. CI runs them on a Windows runner.

### `test:wide`

The unit, Node and browser tests and the build at once, then the core-flow end-to-end tests (`tests/e2e/spine.e2e.ts`) on one launched app. Every child process writes under one private `TMPDIR`, and the run fails naming any process, port or path it leaves behind. It loads the whole machine, so run it on its own.

### `test:sdk`

Tests against the real model. They spend tokens, so run them only on purpose; no other command runs them. Without a login the suite skips and says what is missing.

### `test:e2e`

Builds the app, then drives the built app (not the dev server) with Playwright. It runs headless.

### `test:e2e:only`

`test:e2e` without the build, for working on the specs themselves.

### `test:e2e:packaged`

The same specs against the packaged app from `build:dmg`. Hardened-runtime and asar-unpacking failures show up only here.

## Developer tools

### `showroom`

One developer tool on scratch state and a scratch Chromium profile: `showroom <name>[:<category|scenario>]`. `--list` names the galleries, which live in `apps/studio/src/renderer/src/dev/showroom/`.

### `scenario`

Opens the app in a named first-run state on scratch state, with a visible window: `scenario <name>`, `--list`, `--stop`. Running a name again resets it. Scripts call `openScenario` from `@studio/fixtures` instead.

### `dev:lab`

The design lab: the app's chrome in a browser on `http://localhost:5273`, or the next free port, with `window.studio` faked. `LAB_PORT` sets the port. See `apps/studio/src/renderer/lab/`.

### `reset:identity`

Removes every account record and session file that the signed app and a development build can write, always together, so the next launch asks you to sign in again. It honours `STUDIO_STATE_ROOT`.

### `translate`

Translates new or changed English strings into every language that has a guide in `packages/i18n/src/translate/`, sending `shared.md` before each guide. It calls the Anthropic API directly and needs `ANTHROPIC_API_KEY`; `--dry-run` needs no key. `i18n.lock` records, per language and key, a hash of the English each translation came from. A key whose placeholders come back broken is retried once, then left as it was.

### `codex:schema`

Regenerates the committed snapshot of the Codex app-server protocol from a Codex binary: `--bin <path> --out <file>`. `verify` doesn't run it, since the repository doesn't include the binary. Experimental fields are always included, so the snapshot shows what the binary accepts, not which fields need `experimentalApi: true`.

### `codex:drift`

Compares two protocol snapshots, to check a Codex version change. It exits 1 on any difference, so a version change always gets read. The committed drift-control file beside the snapshots is its known-different input.
