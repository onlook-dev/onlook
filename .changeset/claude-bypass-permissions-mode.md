---
"@studio/app": minor
---

Project Chat's Permissions menu adds Bypass permissions for Claude. In this mode Claude runs commands and edits files without asking, including on Windows, where Onlook otherwise asks before every shell command. It still asks before git commands that force-push, delete a branch, hard-reset or publish. Chats still start in Auto.
