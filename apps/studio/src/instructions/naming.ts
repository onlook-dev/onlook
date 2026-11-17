export function renameInstruction(): string {
  return (
    'This project has no name yet. Before anything else, call `rename_project` once ' +
    'with a name of at most three words that describes what the user asked for — ' +
    'derived from their words, never invented from a list. Do not call it again ' +
    'later, and do not ask the user to confirm.'
  );
}
