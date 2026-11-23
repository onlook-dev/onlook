---
"@studio/app": minor
"@studio/events": minor
---

Add OpenCode and Freebuff as agents. OpenCode is driven over its own ACP mode, so turns, thinking and
tool calls arrive as structured events; Freebuff has no protocol and is driven through a
pseudo-terminal, so it answers in text only.
