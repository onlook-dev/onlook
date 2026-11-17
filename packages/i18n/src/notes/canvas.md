# canvas

- From `canvas.toolbar.label`: The canvas tool group. `toolbar` and `tools` are read by screen readers only, never shown.
- From `canvas.text.editor.label`: The accessible label of a text box placed on the canvas; the canvas draws the text itself.
- From `canvas.page.first`: The name of the first page every project starts with.
- From `canvas.text.size.label`: The size bar above a selection of text only. `label` names the bar for a screen reader; the three names are the sizes a text box can have.
- From `canvas.image.pastedName`: Images on the canvas. When several files are dropped at once, each invalid file is refused on its own while the valid ones are placed.
- From `canvas.artifact.untitled`: Artifacts (sketches) on the canvas. Removing the node and deleting the Artifact are different actions, and the copy for each says which one it does.
- From `canvas.artifact.sharedTitle`: Shown only where another sketch has the same title, so the tag is the only thing that differs.
- From `canvas.run.start`: Ends in three periods on purpose, as in the design, not the single ellipsis character.
- From `canvas.run.stopping`: The pending half of Stop; its ellipsis and tone match `canvas.run.starting`.
- From `canvas.mode.label`: The Design / Preview mode switch. `label` names the group for a screen reader and is never shown.
- From `canvas.region.label`: The canvas area's accessible name. An empty canvas shows nothing, so this is the only name it has.
- From `canvas.recenter`: Not an empty state: this button appears only when the canvas has frames and none of them is in view.
- From `canvas.help`: The floating help button's accessible name and its tooltip. The button shows no text, so this is its only name.
- From `canvas.node.menu.label`: One menu of actions for anything on the canvas, opened from the canvas or the Designs list. The actions say "design", not "frame", because the canvas also holds text and images.
- From `canvas.node.menu.openElement`: Above the Frame's own actions. "element" and "component" are the words the designer sees in the panel's label, so the menu uses the same two words.
- From `canvas.run.preview.start.everywhere`: The hover card over the toolbar's Run button, shown when the canvas has frames. One sentence drawn as two lines, broken at the `\n`; put the break where the language reads naturally, each line short (about 9 full-width characters).
- From `canvas.tool.text.sample`: The word the Text tool's hover card types into a small box (about 96px wide at 16px). At most 5 full-width characters, or the end is cut off. It need not be a translation of "Inspiration": any short, everyday word for an idea a designer might type works.
- From `canvas.setupFailure.install.body`: The card over a canvas whose app did not set up. The agent investigates, then either fixes it or reports what is in the way; say both plainly, in the agent's own action, with no humble or honorific form.
