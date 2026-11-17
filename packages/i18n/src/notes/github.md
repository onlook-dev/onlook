# github

- From `github.waiting.body`: The organization approves access on GitHub, in the browser. When the person comes back to this screen, Onlook checks again by itself.
- From `github.approval.body`: One dialog, one word for GitHub's access: the same word in every `github.*` sentence that mentions access or permissions.
- From `github.tokenLifetime`: GitHub did not hand Onlook the short-lived access it needs; to the person this is a connection to GitHub that did not work, worth trying again later.
- From `github.existing`: The subject is the repository the person chose: it is already cloned on this computer, so the existing Workspace opens instead.
- From `github.error.destination`: The picker offers no place to save, so the folder is Onlook's own, and the person's only move is to try again.
- From `github.error.existing`: Onlook could not read which projects are already on this computer, so it cannot say whether this repository is one of them. Nothing was cloned.
- From `github.error.cleanup`: The clone failed and its half-finished copy could not be removed. Nothing is asked of the person: Onlook removes it the next time it opens.
- From `github.repositories`: The name of the repository list itself, read aloud when the keyboard reaches it. Not a heading on screen.
- From `github.cloneProgress`: The name of the progress bar, read aloud and never shown. It names what the bar measures, since “Cloning…” is already on screen above it.
- From `github.access`: The button opens GitHub in the browser, where the person chooses which repositories Onlook can see. The same button appears on the connection screen, after a failed clone and at the end of the list.
- From `github.connect.body` and `github.noConnection`: Someone may read these after leaving the import half-finished, so they say where the person stands and what pressing the button does.
- From `github.slow`: The clone is healthy, only big. It appears after a few seconds and never replaces a failure message.
- From `github.blocked.sso` and `github.blocked.approval`: Organization policy blocks the clone itself, unlike `github.archived`, which only warns. The labels sit at a row's right edge and stay short.
- From `github.import`: The dialog's title.
- From `github.archived.body`: Archived repositories remain cloneable. GitHub prevents pushing changes; this is not an import failure.
- From `github.open`: The action is "Open project" for a repository already on this computer, not another clone.
- From `github.ready`: A notification names the repository when its new Project has finished getting started. Keep `{repository}` unchanged.
