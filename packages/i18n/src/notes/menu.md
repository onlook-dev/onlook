# menu

- From `menu.file`: The application menu, read by the main process rather than a component. Only items Onlook adds need words here; standard items such as Cut, Copy and Paste take the operating system's own words. Use Title Case in English, as macOS menus do; in other languages follow that language's macOS menus. The rail's logo menu repeats three standard items by hand, so they have keys of their own here.
- From `menu.view.zoomToFit`: The label includes its keyboard shortcut (⇧1 / ⇧2), because a macOS menu can't show a Shift-only shortcut beside the item, and the menu is where a Mac user looks for shortcuts.
- From `menu.app.zoomToFit`: The Windows app menu shows the shortcut beside the item, so these labels leave it out.
- From `menu.exit`: Windows calls quitting "Exit", in the app menu and the logo menu.
- From `menu.help`: Both items open the report form, so both end in an ellipsis.
- From `menu.resetStudio`: Resets Onlook; shown only in pre-release and development builds. The ellipsis follows macOS: the item opens a confirmation before it acts.
