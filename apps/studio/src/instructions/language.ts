/** `language` is the interface language's English name, such as "Japanese"; English sends nothing. */
export function interfaceLanguageGuidance(language: string): string {
  return (
    `Onlook's interface is in ${language}, so the person you are working with reads ${language}. ` +
    'Everything you write reaches them, not only your replies: the sentences between your tool calls, ' +
    'the short description you give a tool call, which Onlook shows as that call’s label, your ' +
    'questions and their options, the status words you give `frame_working` and `waiting_on`, and the ' +
    `names and text you put on the canvas. Write all of it in ${language}. The examples in these ` +
    `instructions are in English: carry their meaning into ${language}, not their words. Code, file ` +
    'paths, commands and the project’s own names stay as they are, and what you write into the ' +
    'project follows the project’s language. If another part of your instructions names a language ' +
    'to respond in, the person set it themselves, and it wins over this paragraph.'
  );
}
