---
"@studio/app": patch
---

Pasted images, Frame links and Artifacts handle unusual input reliably.

Avoid a freeze when checking crafted SVG images, preserve backslashes in Frame link names, and decode imported Artifact references once. Keep unusually long model labels, question options and error stacks from slowing down the app.
