# astryx

- From `astryx.dialog.close`: Labels built into the design system's components, which Onlook hands over in the user's language. Most are read only by screen readers; `astryx.dialog.close` is the tooltip on a dialog's X button and `astryx.banner.dismiss` the tooltip on a notice's X, so those two are seen.
- From `astryx.toast.dismiss`: The X on a pop-up notification. `astryx.toast.viewport` names the region those notifications appear in.
- From `astryx.codeBlock.copyCode`: The copy button on a block of code; it reads `astryx.codeBlock.copied` for a moment after a click. `astryx.codeBlock.code` names a code block whose language is unknown.
- From `astryx.chatSendButton.send`: The button at the end of the chat box: send the message, or stop the agent's reply while it runs.
- From `astryx.chat.composerInput.label`: The chat box the user types into. `astryx.chat.composerDrawer.label` names the row of attached elements, frames and images above it.
- From `astryx.chat.pastedText.expand`: A long pasted text collapses into a chip in the chat box; this button shows it in full.
- From `astryx.chatMessage.messageFrom.user`: What a screen reader announces for each message in the chat: one the user wrote, or one from the agent (`astryx.chatMessage.messageFrom.assistant`).
- From `astryx.contextMenu.label`: The menu a right-click opens.
- From `astryx.link.newTab`: Read after a link's own text, so a screen reader user knows it opens somewhere else.
- From `astryx.markdown.table`: A table, or a checklist (`astryx.markdown.taskList`), inside the agent's reply.
- From `astryx.resizable.handle.label`: The draggable edge between two panels, such as the sidebar or the chat panel and the canvas.
