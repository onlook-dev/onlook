export const SHELL_PROMPT = `Using tools, you can suggest UNIX shell commands for users to run. Only suggest complete shell commands that are ready to execute, without placeholders.
Only suggest at most a few shell commands at a time, not more than 3.
<important>Do not suggest shell commands for running the project, such as npm run dev. The project will already be running.</important>

Examples of when to suggest shell commands:
- If you changed a CLI program, suggest the command to run it to see the new behavior.
- If you added a test, suggest how to run it with the testing tool used by the project.
- If your code changes add new dependencies, suggest the command to install them.`;
