# Artifacts

An Artifact is one HTML document, its manifest and its local files under `stateRoot()/artifacts/<id>/`. Canvas nodes carry its id and a page path, never its bytes. Removing a node leaves the Artifact; only an explicit delete removes it, and deleting one shows it as gone everywhere it is placed. Project teardown never touches this store.

## Identity

Every user gesture that places an Artifact (sidebar Add or drag, duplicate, copy and paste within a canvas or into another Tab or Project) places another node with the same id, so an edit shows everywhere. Only the agent's `fork_artifact` copies one under a new id. Main checks every Artifact in a batch before placing any: a missing record, an unlisted page or a manifest from a newer version refuses the whole batch.

The agent reaches Artifacts through `create_artifact`, `read_artifact`, `set_artifact`, `import_artifact`, `place_artifact` and `fork_artifact`, the same implementation on both Harnesses. It can't browse the library: an id has to come from its canvas, an attachment or something its own session created. `read_artifact` returns the markup as untrusted text, never a machine path.

## Writes

`writeFiles` takes an optional `expectedUpdatedAt` and compares it before touching disk. Direct text editing and `set_artifact` both pass the revision they read, so a competing save can't overwrite newer content. Only a committed write broadcasts the change.

Direct text editing works on static HTML only: a script, inline handler, JavaScript URL, embedded document or editable region refuses the whole document. A target is one literal text node whose DOM path and live value match the parsed source. Save rechecks the renderer, workspace, canvas document, node, guest, session, URL and revision after every asynchronous step, then changes only that literal's source range.

A manifest written by a newer version stays listed and readable, but can't be changed, copied or exported. Older records with several documents stay read-only.

## Import and export

Import follows the actual HTML and CSS references inside the registered worktree and accepts one HTML document, classic JavaScript, CSS, PNG and JPEG images and WOFF/WOFF2 fonts. It rejects symlinks and missing, remote, module and dynamic dependencies, and re-encodes images. The size limits are the constants in `files.ts` and `assets.ts`.

Export checks content for private data and unsupported references before the save dialog opens. HTML export writes one self-contained file. PDF export prints full A4 sheets from the sandboxed document, within the limits in `pdf.ts`. An edit, a delete or a closed Tab cancels an export before any file is written, and the final write is atomic.

## Rendering

The Artifacts session has no guest preload, storage or network access, and every document loads in an opaque sandbox origin. `session.ts` is the only module that registers `webRequest` on it. The dev-Frame session has no Artifact protocol handler.

Previews are PNGs that main renders in a hidden offscreen window on the same session and policies, never live guests per row. Captures are deduplicated by Artifact, page and revision and run a few at a time (`preview-cache.ts`). A committed edit or a delete invalidates cached and in-flight previews.
