interface FlagDef {
  default: boolean;
  removeWhen: string;
  /** `true` answers the renderer under the flag's own key; a name answers under that name, and only while the flag is on. Absent, the flag stays in main. */
  renderer?: true | string;
}

export const FLAGS = {
  'web-attribution-link': {
    default: false,
    removeWhen: 'Website attribution links are available to everyone (ONL-3080)',
  },
  'touched-files': {
    default: false,
    removeWhen: 'The files-changed card is available to everyone (ONL-3039)',
    renderer: 'touchedFiles',
  },
  'github-import': {
    default: false,
    removeWhen: 'GitHub import is available to everyone (ONL-2815)',
    renderer: 'githubImport',
  },
  connectors: {
    default: false,
    removeWhen: 'Connectors and model-menu permissions are available to everyone (ONL-2808)',
    renderer: true,
  },
  /** A frame that can't show its page gets a cover that says what's wrong and what to do, and a frame or an artifact shows the agent's brief while it builds; off keeps main's covers and no brief, and main gives the agent no quote arguments (ONL-2960). */
  'frame-covers': {
    default: false,
    removeWhen: 'The frame covers and the brief on a frame or an artifact have held up with users (ONL-2960)',
    renderer: true,
  },
  /** Sections on the Canvas, in the toolbar and in the Designs list (ONL-2661). */
  sections: {
    default: false,
    removeWhen: 'Sections are available to everyone (ONL-2661)',
    renderer: true,
  },
  /** The notification invite is a tip at the Left Rail foot, never in Project Chat; off draws it in Project Chat after a finished turn. Either way it waits for a returning person (ONL-2995). */
  'invite-tip': {
    default: false,
    removeWhen: 'The notification invite as a tip at the foot of the Left Rail, not a card in Project Chat, has held up with users (ONL-2995)',
    renderer: true,
  },
  /** "Ask for more than edits" at the Left Rail foot, a while after an imported project's next-task cards land unpicked (ONL-2960). */
  'prompt-tip': {
    default: false,
    removeWhen: 'The prompt tip at the Left Rail foot, beside an imported project’s next-task cards, has held up with users (ONL-2960)',
    renderer: true,
  },
  teams: {
    default: false,
    removeWhen: 'The team UI is available to everyone',
  },
  /** The Left Rail foot: the agent status list, setup's step bar, and the Tips pill, out of which the foot's tips grow after a beat. Off, the chat keeps its working row and setup checklist, the pill sits in the canvas corner and the composer, and a tip whose own flag is on draws alone at the foot (ONL-2961, ONL-2973). */
  'rail-foot': {
    default: false,
    removeWhen: 'The Left Rail foot, holding the status list, setup progress and the Tips pill, has held up with users (ONL-2973)',
    renderer: true,
  },
  /** The toolbar's Start hides while a new draft or an import sets up, comes in once the app is first up, and stays; off, it always shows (ONL-2960, ONL-2961). */
  'start-control': {
    default: false,
    removeWhen: 'Start hiding while a new draft or an import sets up, and coming in once the app is up, has held up with users (ONL-2960)',
    renderer: true,
  },
  /** A blank project's first moment: the chat's welcome rows, the idea cards on the empty canvas, the inspiration and scroll tips, the agent speaking first over the inspiration Frame, the flight to the first object, and the one-round asking rule. Off, a blank project opens as on main (ONL-2960). */
  'blank-first-moment': {
    default: false,
    removeWhen: 'A blank project’s first moment, its welcome, ideas and inspiration, has held up with users (ONL-2960)',
    renderer: true,
  },
  /** Window → Task Manager, a window listing what each Tab, Frame, agent and dev server uses; off, the Window menu is the system's own and nothing reads processes for it (ONL-3112). */
  'task-manager': {
    default: false,
    removeWhen: 'Window → Task Manager, listing what each Tab, Frame, agent and dev server is using, has held up with users (ONL-3112)',
  },
  /** Onboarding checks the machine before the first project, shows Check your computer when one needs attention, and names the cause when a later create fails; off, onboarding and a failed create are main's and no check runs (ONL-3111). */
  'machine-check': {
    default: false,
    removeWhen: 'The machine check before the first project has held up with users (ONL-3111)',
    renderer: true,
  },
  'wsl-projects': {
    default: false,
    removeWhen: 'Projects in WSL open, start and pick up edits reliably on Windows (ONL-3395)',
  },
} as const satisfies Record<string, FlagDef>;

/** Keys a release configuration may still bake while it catches up; a retired key decides nothing and is not a build error (ONL-2950). */
export const RETIRED_FLAGS: readonly string[] = ['workos-login', 'system-language', 'frame-scroll', 'question-sheet'];

export type FlagKey = keyof typeof FLAGS;

type Flags = typeof FLAGS;

/** What main answered for this build, resolved from `FLAGS` (ONL-2661). */
export type StudioFlags = {
  [K in FlagKey as Flags[K] extends { renderer: true } ? K : never]: boolean;
} & {
  [K in FlagKey as Flags[K] extends { renderer: infer Name extends string } ? Name : never]?: boolean;
};

/** Each flag the renderer hears of, beside the name it is answered under. */
export const RENDERER_FLAGS: readonly (readonly [key: FlagKey, name: keyof StudioFlags])[] = (Object.entries(FLAGS) as [FlagKey, FlagDef][]).flatMap(
  ([key, { renderer }]) => (renderer === undefined ? [] : [[key, (renderer === true ? key : renderer) as keyof StudioFlags] as const]),
);
