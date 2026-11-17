# ANTIPATTERNS.md

Mistakes that keep happening in this codebase, and why each one hurts here. No script catches them; review does. If you find yourself doing one, undo it.

## Long explanatory comments

**What:** a comment block longer than two lines of prose, or a comment that states a rule, whatever its syntax, doc blocks included.
**Why:** the code says what, the commit says why and the tracker holds the history. Prose in a file goes unread and falls out of date without anyone noticing. See `WRITING.md`, Comments.

## A rendered string built in `main/`

**What:** a string built in `main/` that crosses IPC into a field a component renders.
**Why:** it is a rendered string that skipped the catalog, so it ships untranslated, and `check:strings` can't see it: the check only finds orphaned catalog keys. Call `t()` in main instead, as `main/reset/` does. See `CODING.md`, Guardrails.

## A sentence assembled from catalog pieces

**What:** one line on screen built from more than one key, or from a key plus something placed beside it in JSX: a name chip, a link, a count or a verb before or after a translated phrase, in English word order.
**Why:** each key is translated on its own, so a translation can't move the piece outside it. Japanese ends on the verb, so the line ships as 起動できませんでした companion-app, with stray spaces around its links. Use one key per sentence with every piece as a placeholder, and pass a link's label in as its own key. `sentenceParts()` in `packages/chat-ui/src/fill.ts` renders each placeholder as its own element wherever the translation put it.

## One placeholder for two kinds of text

**What:** a template whose placeholder holds a name in one call and a phrase in the reader's language in another, such as `{target}` filled with a file name in one row and "2 commands" in the next.
**Why:** a translation spaces and inflects a placeholder according to what it holds, so one template is wrong for half its calls (2 個のコマンド を実行しました). Give each kind of text its own key, and say in its translator note what the placeholder holds.

## An ignored bridge refusal

**What:** `.catch(() => undefined)` on a `window.studio` call.
**Why:** it hides a refused request, and nobody can count how many there are. Use the shared `ignoreRefusal()` (`renderer/src/refusal.ts`), so ignoring a refusal is visible and deliberate.

## A double cast to reach `window.studio`

**What:** `(window as unknown as { studio: StudioBridge }).studio` written at a new call site instead of using `studio()` from `renderer/src/bridge.ts`.
**Why:** each cast restates the bridge's shape, so when the bridge changes, nothing fails to compile and every cast is silently wrong.

## A reference nobody can look up

**What:** an id in a test title, comment or doc that names nothing defined in the repository: `R12`, a chat shorthand, a spec item number. Ticket ids (`ONL-xxxx`) are the one outside reference allowed.
**Why:** a reader can't look it up, so the sentence it qualifies sounds authoritative but can't be checked.
