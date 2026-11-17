const SAY_FIRST =
  'Before your first tool call, tell me in one short line what you are about to do: look through ' +
  'the code to work out how to run it, then put it on the canvas. Someone new to Onlook cannot ' +
  'tell that reading files means you are setting up their app.';

const FRAME_FIRST =
  'If list_frames shows no frame yet, put one on the canvas early, before the setup runs: ' +
  'create_frame with pending set to true and a url on the port you expect. Then tell me in a line ' +
  'that my app will appear in that frame once it is running. When run_project_setup succeeds, ' +
  'Onlook points that frame at the app, so ' +
  'never create a second frame for it.';

const REPAIR_PROPOSED =
  'On failure, find the cause in the retained actual result. Running the same commands again needs ' +
  'no question. A repair that changes how the project installs or runs is a proposal: a different ' +
  'command or package, a flag such as --ignore-scripts, or an edit to its code or config. Tell me ' +
  'what failed and what you would change, your pick first, and ask me before you save or run it; ' +
  'once I agree, save with the current expectedRevision and run again.';

function generic(pendingFrame: boolean): string {
  return [
    SAY_FIRST,
    'First call get_project_setup. Reuse saved setup with run_project_setup. If none exists, ' +
      'detect runtime, package manager, install inputs/outputs and environment prerequisites, ' +
      'save_project_setup with repeatable preparation and foreground server commands, then ' +
      'run_project_setup.',
    REPAIR_PROPOSED,
    'A user Stop cancels this request and is not a failure to repair. Do not launch a ' +
      'session-owned background server. Get this project running so I can design against it on ' +
      'the canvas, live in a browser frame. Onlook measures readiness and places the app when ' +
      'run_project_setup succeeds. Use server_running only for an already-existing server outside ' +
      'the saved setup runtime.',
    ...(pendingFrame ? [FRAME_FIRST] : []),
    'Before you finish, make sure the app is in a frame.',
  ].join(' ');
}

/** `pendingFrame` is the `frame-covers` flag, read by the caller: only there does `create_frame` take `pending` (ONL-2960). */
export function startPrompt(folders: readonly string[] = [], { pendingFrame = false }: { pendingFrame?: boolean } = {}): string {
  if (folders.length === 0) return generic(pendingFrame);
  return (
    `${SAY_FIRST} ` +
    'First call get_project_setup and reuse run_project_setup for saved commands. If missing, ' +
    'detect and save_project_setup for the required stack, then run_project_setup. ' +
    'A user Stop cancels this request and is not a failure to repair. ' +
    'Get this project running so I can design against it on the canvas, live in browser frames. ' +
    `These folders each need to be running: ${folders.join(', ')}. ` +
    'Include each in the saved definition with its own cwd and fixed port. Onlook measures ' +
    'readiness and places each app when run_project_setup succeeds. Use server_running only ' +
    'for an already-existing server outside the saved setup runtime. Before you finish, ' +
    'make sure every app is in a frame.'
  );
}

export const DURING_SETUP_CONTEXT =
  'I sent this while my project is still being set up. Before your next tool call, reply to me ' +
  'in one short sentence. Answer a question right away. If I asked for a change to the app, tell ' +
  'me you will make it once the app is up, finish getting the app running first, then make ' +
  'the change.';
