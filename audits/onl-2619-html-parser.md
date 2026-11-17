# Artifact text-editing parser review

Reviewed November 4, 2026 for ONL-2619. This is engineering evidence for the dependency delta, not publication clearance.

## Purpose and surface

Studio uses parse5 8.0.1 in Electron main to parse an Artifact's bounded local HTML with source locations. It identifies one unchanged literal text range without serializing or rewriting the rest of the file. The parser does not execute document scripts or make network requests. It is a bundled devDependency, not a new unbundleable runtime external. Its runtime dependency is entities 8.1.0. No package manager scripts or parser code run in an Artifact's privileged context; Artifact guests retain their existing no-preload sandbox.

## Dependency and notice evidence

The exact installed package manifests and original notice files were read through the repository's `packageRecord` helper. The inventory and generated NOTICE add only these records:

| Package | Declared license | Inventory classification | Preserved evidence SHA-256 |
| --- | --- | --- | --- |
| parse5 8.0.1 | MIT | permissive | fbd4e20e3ef1e93c951aee3b76549c9c4c6ab337d6e08ad230237a195adfc889 |
| entities 8.1.0 | BSD-2-Clause | permissive | 8df8742ebfcdf745c1ddb2e82030a7f9b425ba2503e6a448d60164cb036c7f91 |

Package metadata sources are the exact npm registry records retained in `compliance/dependencies.json`. Upstream license and attribution text is preserved verbatim in both that inventory and NOTICE. Existing inventory entries are retained. The new parser and dependency are confined to the main build surface.

## Risk and validation

Input is bounded by the existing 5 MB Artifact file budget. Source mapping further bounds tree depth, node visits, path length and edited text length. Scripts, event attributes, JavaScript URLs, embedded documents and mixed text/markup are refused rather than guessed. Runtime ownership and revision checks precede the synchronous compare-and-write operation.

The November 4 full-lockfile `bun audit --json` returned existing advisory entries for nine package names and exit 1. It returned no entries for parse5 or entities. Existing dependency advisories are not claimed fixed by this change. The raw response, stderr and original exit code are retained with this card's check artifacts.

The canonical publication-audit generator refreshed the exact lockfile hash and inventoried package versions in `compliance/advisories.json`. Its 61 existing advisory range entries and affected-package classifications remain unchanged.

Focused Artifact tests cover source locations, entities, repeated text, invalid bytes, exact escaping, read-only and stale writes, guest admission and detached targets. Normal production-build notice validation remains mandatory; collection mode is not a final gate.
