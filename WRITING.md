# WRITING.md

## Commits

`type(scope): what changed, present tense (ONL-xxxx)` — types `feat|fix|chore|docs|test|style|refactor|perf|build|ci|spike|design`, scope the module directory. A body, if any, says only why, what behaviour changed, and any trap a later reader might wrongly "fix". No narration or verification logs.

## Comments

None by default: the code says what, the commit says why, and the tracker holds the history. Write a comment, doc blocks included, only when one short line prevents a likely mistake, and only if a better name or type can't say it. State the fact, then the ticket in parentheses. A comment claims only what the code beside it keeps true: no counts, callers or lists of things elsewhere, unless that claim is the constraint itself, and then it says why. When you edit a file, remove long explanatory comment blocks you find in it. `@deprecated` and `@parked ONL-xxxx` are single lines.

## Docs

Docs in the tree, including this one and the module READMEs, state present-tense rules and traps: no logs of what was verified, no values measured once, no lists the tree already answers. Update a doc in the same change that makes it wrong.

## What lands in the tree

This repository is public. Nothing personal or internal goes in a file. Third-party products in design or reference material are named by role, not by name; dependencies are named normally. Screenshots are hosted, never committed. Ticket ids are fine.
