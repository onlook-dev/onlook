# gitStatus

- From `gitStatus.label.no-access`: The git status pill. Labels for work in progress end in three periods. The prompts state what the user wants; the agent finds the repository's own conventions.
- From `gitStatus.noAccessSsoLine`: The first line of the GitHub button's tooltip when the person has no access to the Project's repository. `{repo}` holds a repository slug, `{account}` a GitHub login shown after an `@`. The `Nameless` siblings render when no account name is known, so they name no account. SSO and an organization's approval are worded as in `github.*`.
- From `gitStatus.queued.label`: An action waiting for the agent's current turn to end. The label names the wait, the hover says what pressing it does, and the hint says what it is waiting for.
