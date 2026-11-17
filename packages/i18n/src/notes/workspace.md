# workspace

- From `workspace.created.copy`: The first message in a new project's chat, saying where Onlook's copy came from. `{repo}` is the user's codebase and `{project}` the new project's name, each drawn as a chip; put them where the sentence needs them. It reassures: the user's own folder was copied, not changed.
- From `workspace.created.branch`: Follows `workspace.created.copy`. `{branch}` is the git branch Onlook made for the project and `{base}` the branch of the user's codebase it started from, both drawn as chips.
