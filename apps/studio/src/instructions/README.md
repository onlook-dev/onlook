# Instructions

Every sentence Onlook sends to the agent's model lives in this directory, apart from two: the descriptions of Onlook's tools (`main/agent-host/studio-tools.ts`) and each starter's briefing (`main/starter/adapters/`).

Text reaches the model in one of three ways:

- **The briefing.** `briefing()` in `context.ts` composes it from the modules it imports. It is appended to the system prompt: the Claude SDK's `systemPrompt.append`, Codex's `developer_instructions`.
- **Context on a prompt.** Text attached to one message, which only the model sees; `main/agent-host/index.ts` decides when.
- **A prompt Onlook sends** on the user's behalf, with `origin: 'studio'`.

These are plain string modules. Nothing here imports from `main/` or `renderer/`, so both processes can use them.

## Rules for the text

**Say what the user wants, not how to do it.** A prompt states what should be true and leaves the method to the agent, which can read the repository and Onlook can't. Method in a prompt once sent the agent into a loop (ONL-2065).

**Add to the user's setup; don't replace it.** Onlook's instructions sit beside the project's own conventions. Claude reads the project's instructions, skills, commands and agent prompts as text, but not its settings, hooks, MCP launch settings or executable frontmatter, and project commands don't run shell preprocessors. Codex starts with the project marked untrusted. Opening a folder never runs its programs.

**Every question comes with a recommendation.** A question the agent asks leads with what it would do, so a user in a hurry can answer with one tap. A playbook `ask` has a `recommend` field. The two Harnesses' wording differs only in the asking line from `harness.ts`.
