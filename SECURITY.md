# Security

## Report a vulnerability

To report a vulnerability privately, use **Report a vulnerability** in this repository's **Security** tab. Include the affected version, the steps to reproduce it and its impact. Do not include credentials or personal data, and do not open a public issue.

## Scope

Report issues in the latest version of Onlook, including its desktop app, its packaged dependencies and how it handles project folders. A fix may need an upgrade from an older version.

Onlook runs development tools and code when you ask it to start or work on a project. A project's worktree is not an operating-system sandbox, so only run projects and agent commands you trust.

**The agent is yours.** Onlook runs the agent you connect (Claude or Codex) under your own account, on your own machine. It has the same reach it has in your terminal with full access: it can read and change your project, run commands, and act on the sites your Frames show. For Codex, Onlook turns Codex's own sandbox off. Use the agent in Onlook the way you would anywhere else, and don't point it at anything you wouldn't trust it with there.
