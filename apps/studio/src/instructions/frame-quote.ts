export interface QuotedFrameContext {
  link: string;
  frameId: string;
  url: string;
  liftsAtTurnEnd: boolean;
}

/** What the agent is told about when its quote comes down, so it never believes the user still sees one (ONL-2960). */
export function quoteLiftWords(liftsAtTurnEnd: boolean, on: 'frame' | 'artifact' | 'either' = 'frame'): string {
  if (liftsAtTurnEnd) return 'the first time `capture_frame` shows you what is under it, or when your turn ends, unless that turn ends on a question for the user';
  if (on === 'artifact') return 'once your first set_artifact on it reaches the canvas';
  return on === 'either' ? 'once your edits reach the page or your first set_artifact reaches the artifact' : 'once your edits reach the page';
}

export function quotedFrameInstruction(frame: QuotedFrameContext): string {
  return (
    `Onlook has put a frame on the canvas for this request: ${frame.link} (id ${frame.frameId}), ` +
    `loading ${frame.url}. It shows the request as a quote, and Onlook takes it down ${quoteLiftWords(frame.liftsAtTurnEnd)}. ` +
    'Build the page there, in the starter’s files, and do not create another frame for it.'
  );
}

/** The quote names the thing being made with every choice filled in, never an echo of the user's answers (ONL-2960). */
export function quoteBriefWords(on: 'page' | 'artifact', maxLength: number): string {
  return (
    `What you are making for this ${on}, in one sentence, with every choice settled, including the ones the user left to you. ` +
    'Name the actual thing as if it already had its title and its one telling detail: who it is for, what it covers, what it is used for. ' +
    'Never repeat their answers back. When they said to make it up, or that you choose, the quote says what you chose, ' +
    'and the user should feel the vague idea they gave you turned into something real. ' +
    `At most ${String(maxLength)} characters.`
  );
}

/** A page built in place shows each file as it lands, so the order decides what the user catches mid-build (ONL-2960). */
export const BUILD_INTO_FRAME_GUIDANCE =
  'Building a page into a frame that is already on the canvas, such as one Onlook placed for the request or one ' +
  'the user asked you to build in, goes in this order, because the frame shows the page live as each file lands. ' +
  'First size it with `move_frame` to what the page needs. ' +
  'Then write the styles, and the markup after them, so whatever the page shows while you work is already styled.';

/** Only where `move_frame` takes a `quote` (ONL-2960). */
export function quoteOnPlacedFrameGuidance(liftsAtTurnEnd: boolean): string {
  return (
    'When you size a frame already on the canvas for a page you are about to build there, give `move_frame` the page’s brief ' +
    'as its `quote`, once the brief is settled and your questions are answered: the frame shows your quote instead of a page that ' +
    `is still being written, and Onlook takes it down ${quoteLiftWords(liftsAtTurnEnd)}. When Onlook already put a quote on that ` +
    'frame for this page, keep it and only size the frame.'
  );
}
