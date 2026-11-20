/**
 * The design lab — the desktop app's frame, in a browser tab.
 *
 * ⚠️ `./bridge.js` IS IMPORTED FIRST AND THAT IS LOAD-BEARING. It installs
 * `window.studio` as a module side effect, and ES imports evaluate in order —
 * every import below it reaches a renderer that already has a bridge.
 *
 * It mounts the editor directly rather than through `Root`, deliberately: the
 * launch decision (login → onboarding → projects → editor) is not what this
 * harness is for, and routing through it would put a fake auth answer in charge
 * of which surface appears.
 */

import './bridge.js';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@renderer/styles.css';
import { App } from '@renderer/App.js';
import { registerStudioIcons } from '@renderer/icons/registry.js';
import { useWorkspaceStore } from '@renderer/workspace/store.js';
import { LAB_WORKSPACE } from './transcript.js';
import { trackInputModality } from '@renderer/inputModality.js';
import { WindowFrame } from '@renderer/topbar/WindowFrame.js';
import { Showroom } from '@renderer/dev/showroom/Showroom.js';
import { GALLERIES } from '@renderer/dev/showroom/registry.js';
import { SetupDialogHost } from '@renderer/agent-setup/SetupDialogHost.js';
import { primeFlags } from '@renderer/flags/store.js';
import { GettingStarted } from '@renderer/cloud/GettingStarted.js';
import { OnboardingFlow } from '@renderer/onboarding/OnboardingFlow.js';
import { AboutYouStep } from '@renderer/onboarding/AboutYouStep.js';
import { FoundUsStep } from '@renderer/onboarding/FoundUsStep.js';
import { LoginAside } from '@renderer/login/LoginAside.js';
import { seedAgentSetupForShowroom } from '@renderer/agent-setup/store.js';
import { CLAUDE_LOGIN_COMMAND } from '@studio/events';
import { htmlLang } from '@studio/i18n';
import { AstryxLanguage } from '@renderer/AstryxLanguage.js';
import { seedCapabilities } from '@renderer/capabilities.js';

document.documentElement.lang = htmlLang();
// The lab draws a build whose provider has accounts: no view is born here to carry that.
seedCapabilities({ account: true, teams: true, github: true, report: true, survey: true });

registerStudioIcons();
void primeFlags();
useWorkspaceStore.getState().setWorkspace({
  ...LAB_WORKSPACE,
  workspacePath: '/workspaces/skylark',
  sourcePath: '/lab/react-project-v1',
  sourceRepoRoot: '/lab/react-project-v1',
  repoIdentity: 'lab',
  displayName: 'Checkout redesign',
  copiedEnvFiles: [],
});
trackInputModality();

const container = document.getElementById('root');
if (!container) throw new Error('#root missing from index.html');

/**
 * `#showroom:<gallery>` reaches the still lifes here too. In the app the hash
 * is appended by main behind an env gate; the lab has no main process, and a
 * gallery is fixtures only, so the hash alone is the gate.
 */
const hash = window.location.hash;
const LAB_PARAMS = new URLSearchParams(window.location.search);
const LAB_SETUP = LAB_PARAMS.get('setup');
const LAB_SCREEN = LAB_PARAMS.get('screen');

// `&agents=claude` opens the agent step with Claude already connected, as after a sign-in.
// `&agents=both` connects ChatGPT too, so a row can offer "Make preferred".
const LAB_AGENTS = LAB_PARAMS.get('agents');
if (LAB_AGENTS === 'claude' || LAB_AGENTS === 'both') {
  seedAgentSetupForShowroom({
    claude: { status: 'signed-in', email: 'designer@example.com', plan: 'max', command: CLAUDE_LOGIN_COMMAND },
    ...(LAB_AGENTS === 'both' ? { codex: { status: 'ready' as const, email: 'designer@example.com', plan: 'plus' } } : {}),
    touched: { claude: true, codex: LAB_AGENTS === 'both' },
  });
}

const showroomTarget = hash.startsWith('#showroom')
  ? hash.slice('#showroom'.length).replace(/^:/, '') || undefined
  : undefined;

createRoot(container).render(
  <StrictMode>
    <AstryxLanguage>
      {hash.startsWith('#showroom') ? (
        <Showroom galleries={GALLERIES} initial={showroomTarget} />
      ) : (
        <WindowFrame>
          {/* `?screen=login` shows the sign-in page on its own. */}
          {LAB_SCREEN === 'login' ? (
            <GettingStarted
              onSignIn={() => {}}
              onCancel={() => {}}
              aside={<LoginAside />}
            />
          ) : LAB_SCREEN === 'found' ? (
            /* `?screen=found` is the how-did-you-hear question on its own page. */
            <FoundUsStep onContinue={() => {}} onBack={() => {}} aside={<LoginAside />} />
          ) : LAB_SCREEN === 'about' ? (
            /* `?screen=about` is a variant of the agent step that also asks who the person is. */
            <AboutYouStep onContinue={() => {}} onBack={() => {}} aside={<LoginAside />} />
          ) : LAB_SCREEN === 'onboarding' ? (
            /* `?screen=onboarding` is the first-run flow a new account lands on after signing in; `&step=agent` opens it at the agent step. */
            <OnboardingFlow startAt={LAB_PARAMS.get('step') === 'agent' ? 'agent' : 'role'} onComplete={() => {}} onCreateBlank={() => {}} aside={<LoginAside />} />
          ) : (
            /* Nowhere to exit to — the projects surface is not part of this
               harness, and a fake list would be a second thing to keep true. */
            <App onExitToProjects={() => {}} />
          )}
          {/* `?setup=claude|codex` opens the real sign-in dialog over the editor. */}
          {LAB_SETUP === 'claude' || LAB_SETUP === 'codex' ? (
            <SetupDialogHost harness={LAB_SETUP} entryPoint="editor" onClose={() => {}} />
          ) : null}
        </WindowFrame>
      )}
    </AstryxLanguage>
  </StrictMode>,
);
