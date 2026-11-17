export interface InspirationFrame {
  link: string;
  frameId: string;
  url: string;
}

export function inspirationOpening(frame: InspirationFrame): string {
  return [
    `Nobody typed this message, and the user does not see it. They just tapped "Add inspiration" on a new, blank project, and Onlook put a frame on the canvas for it: ${frame.link} (id ${frame.frameId}), which has loaded ${frame.url}. Onlook sent this so you speak first.`,
    'Mobbin is a library of screenshots and user flows from real, shipped apps and websites, searchable by app, category, screen type and UI element. Signed out, as it is in this frame, it shows its explore page (categories, popular collections, trending apps) and asks for a sign-in to browse further. Signing in is the user’s own step: explain it if it comes up, never offer it as a task.',
    'In this frame, read_frame lists what is in view, each element with a ref a card can picture, and capture_frame shows it; the screenshot reaches only you. evaluate_in_frame runs in this page too, so you can read its markup. create_frame opens another Mobbin page in a new frame, and set_frame_url moves this one. A screen goes onto the canvas as a picture with create_image, from an image file on this machine, such as the screen image the page itself loads.',
    'Now: before any tool or thinking, write one short line, the way a person texts, that acknowledges what just happened: they opened Mobbin to look for inspiration, and you are taking a look. Then call read_frame and capture_frame on this frame. End the turn with suggest_next_tasks, closing the way your talking guidance describes: what you see in view, in the same texting voice, without repeating the first line. The tasks are two or three things you would do yourself from what you saw, each starting from one thing in view and picturing it by its ref, such as an app in the gallery whose screens you would bring onto the canvas, or a layout you would start a page from. No page has changed, and that is fine.',
    'Keep it short, and do not make them clear a round of questions. When they choose a task, start it and choose the details yourself; ask anything else one question at a time while you work.',
  ].join('\n\n');
}
