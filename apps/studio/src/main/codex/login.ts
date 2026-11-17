import { checkHealth, resolveCodex } from '../agent-host/appserver/resolve.js';
import { AppServerTransport } from '../agent-host/appserver/transport.js';
import { userEnv } from '../env/shell-env.js';
import { CODEX_CLIENT_NAME } from './validate.js';

const HANDSHAKE_TIMEOUT_MS = 30_000;

/** A tab closed and forgotten is otherwise a notification that never comes. */
const LOGIN_TIMEOUT_MS = 600_000;

export interface LoginOutcome {
  success: boolean;
  error?: string;
}

export interface LoginHandle {
  authUrl: string;
  loginId: string;
  completed: Promise<LoginOutcome>;
  cancel: () => Promise<void>;
}

export async function startChatGptLogin(options: {
  root: string;
  codexHome?: string;
  timeoutMs?: number;
}): Promise<LoginHandle> {
  const resolved = resolveCodex(options.root);
  const health = checkHealth(resolved, options.root);
  if (!health.ok || resolved === null) throw new Error(health.problems.join('; '));

  let settle: (outcome: LoginOutcome) => void = () => undefined;
  const completed = new Promise<LoginOutcome>((resolve) => (settle = resolve));

  const transport = new AppServerTransport(
    {
      bin: resolved.bin,
      env: await userEnv(),
      ...(options.codexHome === undefined ? {} : { codexHome: options.codexHome }),
    },
    {
      onNotification: (method, params) => {
        if (method !== 'account/login/completed') return;
        // A refused login arrives on this same notification; only `success` says which.
        const bag = params as { success?: unknown; error?: unknown };
        settle({
          success: bag.success === true,
          ...(typeof bag.error === 'string' ? { error: bag.error } : {}),
        });
      },
      onServerRequest: (method, id) => transport.respondError(id, `login does not answer ${method}`),
      onExit: () => settle({ success: false, error: 'the ChatGPT agent stopped before sign-in finished' }),
    },
  );

  try {
    await transport.request(
      'initialize',
      {
        clientInfo: { name: CODEX_CLIENT_NAME, title: 'Onlook', version: '0.0.0' },
        capabilities: { experimentalApi: true },
      },
      HANDSHAKE_TIMEOUT_MS,
    );
    transport.notify('initialized');

    const started = (await transport.request(
      'account/login/start',
      { type: 'chatgpt' },
      HANDSHAKE_TIMEOUT_MS,
    )) as {
      authUrl?: string;
      loginId?: string;
    };
    if (typeof started.authUrl !== 'string' || typeof started.loginId !== 'string') {
      throw new Error('the ChatGPT agent did not return a sign-in URL');
    }

    const loginId = started.loginId;

    const abandoned = setTimeout(() => {
      // A cancel codex refuses is already over; the settle below is the outcome either way.
      void transport.request('account/login/cancel', { loginId }).catch(() => undefined);
      settle({ success: false, error: 'sign-in was not completed in time' });
    }, options.timeoutMs ?? LOGIN_TIMEOUT_MS);
    abandoned.unref?.();

    void completed.finally(() => {
      clearTimeout(abandoned);
      void transport.close();
    });

    return {
      authUrl: started.authUrl,
      loginId,
      completed,
      cancel: async () => {
        // A cancel codex refuses is already over; the settle below is the outcome either way.
        await transport.request('account/login/cancel', { loginId }).catch(() => undefined);
        settle({ success: false, error: 'sign-in was cancelled' });
      },
    };
  } catch (error) {
    await transport.close();
    throw error;
  }
}
