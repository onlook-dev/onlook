import { create } from 'zustand';
import {
  IDLE_CLAUDE_SETUP_STATE,
  IDLE_CODEX_SETUP_STATE,
  type ClaudeSetupState,
  type ClaudeStatusRequest,
  type CodexSetupState,
  type HarnessId,
  type SetupEntryPoint,
  CODE_MAX_LENGTH,
  sanitizeCode,
} from '@studio/events';
import { isClaudeConnected, isCodexConnected } from '../agents/mapping.js';
import { studio } from '../bridge.js';

export interface HarnessFlight {
  detect: boolean;
  submit: boolean;
  check: boolean;
  signIn: boolean;
}

interface SetupRequest {
  action: keyof HarnessFlight | undefined;
  revision: number;
}

interface HarnessRequests {
  latest: SetupRequest | undefined;
  revision: number;
  pending: readonly SetupRequest[];
}

export interface AgentSetupState {
  claude: ClaudeSetupState;
  claudeSettled: ClaudeSetupState | undefined;
  codex: CodexSetupState;
  code: string;
  codexSignInAttempted: boolean;
  touched: Record<HarnessId, boolean>;
  lastConnected: HarnessId | null;
  requests: Record<HarnessId, HarnessRequests>;
  inFlight: Record<HarnessId, HarnessFlight>;
}

interface AgentSetupStore extends AgentSetupState {
  applyClaude: (next: ClaudeSetupState, viaTap?: boolean) => void;
  applyCodex: (next: CodexSetupState, viaTap?: boolean) => void;
  tapClaude: (entryPoint: SetupEntryPoint) => Promise<void>;
  signInClaude: (entryPoint: SetupEntryPoint, browserId?: string) => Promise<void>;
  openPageAgain: () => Promise<void>;
  pasteCode: (raw: string) => void;
  typeCode: (raw: string) => void;
  submitCode: () => Promise<void>;
  cancelClaude: () => Promise<void>;
  checkClaude: (entryPoint?: SetupEntryPoint) => Promise<void>;
  tapCodex: () => Promise<void>;
  installCodex: () => Promise<void>;
  signInCodex: (entryPoint?: SetupEntryPoint, browserId?: string) => Promise<void>;
  cancelCodex: () => Promise<void>;
  checkCodex: () => Promise<void>;
  resetTouched: () => void;
  prime: () => Promise<void>;
}

const IDLE_FLIGHT: HarnessFlight = { detect: false, submit: false, check: false, signIn: false };
const IDLE_REQUESTS: HarnessRequests = { latest: undefined, revision: 0, pending: [] };

function requestFlight({ pending }: HarnessRequests): HarnessFlight {
  return {
    detect: pending.some((request) => request.action === 'detect'),
    submit: pending.some((request) => request.action === 'submit'),
    check: pending.some((request) => request.action === 'check'),
    signIn: pending.some((request) => request.action === 'signIn'),
  };
}

const INITIAL: AgentSetupState = {
  claude: IDLE_CLAUDE_SETUP_STATE,
  claudeSettled: undefined,
  codex: IDLE_CODEX_SETUP_STATE,
  code: '',
  codexSignInAttempted: false,
  touched: { claude: false, codex: false },
  lastConnected: null,
  requests: { claude: IDLE_REQUESTS, codex: IDLE_REQUESTS },
  inFlight: { claude: IDLE_FLIGHT, codex: IDLE_FLIGHT },
};

function nextLastConnected(
  state: AgentSetupState,
  harness: HarnessId,
  wasConnected: boolean,
  isNowConnected: boolean,
  viaTap: boolean,
): HarnessId | null {
  if (!state.touched[harness] || !isNowConnected) return state.lastConnected;
  return !wasConnected || viaTap ? harness : state.lastConnected;
}

export const useAgentSetupStore = create<AgentSetupStore>()((set, get) => {
  const updateRequests = (harness: HarnessId, update: (requests: HarnessRequests) => HarnessRequests): void => {
    set((state) => {
      const requests = update(state.requests[harness]);
      return {
        requests: { ...state.requests, [harness]: requests },
        inFlight: { ...state.inFlight, [harness]: requestFlight(requests) },
      };
    });
  };

  const start = (harness: HarnessId, action?: keyof HarnessFlight): SetupRequest => {
    const request: SetupRequest = { action, revision: get().requests[harness].revision };
    updateRequests(harness, (requests) => ({ ...requests, latest: request, pending: [...requests.pending, request] }));
    return request;
  };

  const finish = (harness: HarnessId, request: SetupRequest): void => {
    updateRequests(harness, (requests) => ({ ...requests, pending: requests.pending.filter((pending) => pending !== request) }));
  };

  const ownsReply = (harness: HarnessId, request: SetupRequest): boolean => {
    const { latest, revision } = get().requests[harness];
    return latest === request && revision === request.revision;
  };

  const invalidate = (harness: HarnessId): void => {
    updateRequests(harness, (requests) => ({ ...requests, latest: undefined }));
  };

  const detectClaude = async (req: ClaudeStatusRequest, flag: 'detect' | 'check' | undefined, viaTap: boolean): Promise<void> => {
    const request = start('claude', flag);
    try {
      const next = await studio().claudeStatus(req);
      if ((flag !== undefined || request.revision === 0) && ownsReply('claude', request)) get().applyClaude(next, viaTap);
    } catch {
      return;
    } finally {
      finish('claude', request);
    }
  };

  const invokeClaude = async (call: () => Promise<unknown>, flag: 'submit' | 'signIn' = 'submit'): Promise<void> => {
    const request = start('claude', flag);
    try {
      await call();
    } catch {
      return;
    } finally {
      finish('claude', request);
    }
  };

  const detectCodex = async (flag: 'detect' | undefined, viaTap: boolean): Promise<void> => {
    const request = start('codex', flag);
    try {
      const next = await studio().codexStatus();
      if ((flag !== undefined || request.revision === 0) && ownsReply('codex', request)) get().applyCodex(next, viaTap);
    } catch {
      return;
    } finally {
      finish('codex', request);
    }
  };

  const installCodex = async (flag: 'submit' | 'check'): Promise<void> => {
    const request = start('codex', flag);
    try {
      await studio().codexInstall();
    } catch {
      return;
    } finally {
      finish('codex', request);
    }
  };

  return {
    ...INITIAL,

    applyClaude: (next, viaTap = false) => {
      set((state) => {
        const settled = next.status === 'idle' || next.status === 'checking' || next.status === 'verifying' ? state.claudeSettled : next;
        const keepsCode = next.status === 'awaiting-code' || next.status === 'checking' || next.status === 'verifying';
        return {
          claude: next,
          claudeSettled: settled,
          requests: { ...state.requests, claude: { ...state.requests.claude, revision: state.requests.claude.revision + 1 } },
          code: keepsCode ? state.code : '',
          lastConnected: nextLastConnected(state, 'claude', isClaudeConnected(state.claude), isClaudeConnected(next), viaTap),
        };
      });
    },

    applyCodex: (next, viaTap = false) => {
      set((state) => ({
        codex: next,
        requests: {
          ...state.requests,
          codex: { ...state.requests.codex, revision: state.requests.codex.revision + 1, latest: next.status === 'ready' ? undefined : state.requests.codex.latest },
        },
        codexSignInAttempted: next.status === 'ready' ? false : state.codexSignInAttempted,
        lastConnected: nextLastConnected(state, 'codex', isCodexConnected(state.codex), isCodexConnected(next), viaTap),
      }));
    },

    tapClaude: async (entryPoint) => {
      set((state) => ({ touched: { ...state.touched, claude: true } }));
      await detectClaude({ fresh: true, entryPoint }, 'detect', true);
    },

    signInClaude: (entryPoint, browserId) => invokeClaude(() => studio().claudeSignIn({ entryPoint, ...(browserId === undefined ? {} : { browserId }) }), 'signIn'),

    openPageAgain: () => invokeClaude(() => studio().claudeOpenPageAgain()),

    pasteCode: (raw) => {
      set({ code: sanitizeCode(raw) ?? '' });
    },

    typeCode: (raw) => {
      set({ code: raw.replace(/\p{Cc}/gu, '').slice(0, CODE_MAX_LENGTH) });
    },

    submitCode: async () => {
      const { inFlight } = get();
      const code = sanitizeCode(get().code);
      if (code === undefined || inFlight.claude.submit) return;
      await invokeClaude(() => studio().claudeSubmitCode({ code }));
    },

    cancelClaude: async () => {
      set({ code: '' });
      const request = start('claude');
      try {
        await studio().claudeSignInCancel();
      } catch {
        return;
      } finally {
        finish('claude', request);
      }
    },

    checkClaude: (entryPoint) => detectClaude({ fresh: true, ...(entryPoint === undefined ? {} : { entryPoint }) }, 'check', false),

    tapCodex: async () => {
      set((state) => ({ touched: { ...state.touched, codex: true } }));
      await detectCodex('detect', true);
    },

    installCodex: () => installCodex('submit'),

    signInCodex: async (entryPoint, browserId) => {
      const request = start('codex', 'submit');
      try {
        const result = await studio().codexSignIn({ ...(entryPoint === undefined ? {} : { entryPoint }), ...(browserId === undefined ? {} : { browserId }) });
        if (result.accepted && get().requests.codex.latest === request && get().codex.status !== 'ready') {
          set({ codexSignInAttempted: true });
        }
      } catch {
        return;
      } finally {
        finish('codex', request);
      }
    },

    cancelCodex: async () => {
      const request = start('codex');
      try {
        await studio().codexSignInCancel();
      } catch {
        return;
      } finally {
        finish('codex', request);
      }
    },

    checkCodex: () => {
      set({ codexSignInAttempted: false });
      return installCodex('check');
    },

    resetTouched: () => {
      invalidate('claude');
      invalidate('codex');
      set({ touched: { claude: false, codex: false }, lastConnected: null, code: '', codexSignInAttempted: false });
    },

    prime: async () => {
      await Promise.all([detectClaude({}, undefined, false), detectCodex(undefined, false)]);
    },
  };
});

let priming: Promise<void> | undefined;

export function primeAgentSetup(): Promise<void> {
  priming ??= useAgentSetupStore.getState().prime();
  return priming;
}

export function subscribeToAgentSetup(): () => void {
  const { applyClaude, applyCodex } = useAgentSetupStore.getState();
  const offClaude = studio().onClaudeState((state) => {
    applyClaude(state);
  });
  const offCodex = studio().onCodexState((state) => {
    applyCodex(state);
  });
  return () => {
    offClaude();
    offCodex();
  };
}

export function seedAgentSetupForShowroom(facts: Partial<AgentSetupState>): void {
  useAgentSetupStore.setState({ ...INITIAL, ...facts });
}

export function resetAgentSetupForTesting(): void {
  priming = undefined;
  useAgentSetupStore.setState(INITIAL);
}
