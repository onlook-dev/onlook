import { formatReset } from '../chat/limitCopy.js';
import { t } from '@studio/i18n';
import type { AgentSetupStrings } from '../agents/mapping.js';

/** Keys are literals: `check:strings` matches key text in source. */
export function agentSetupStrings(): AgentSetupStrings {
  return {
    claudeDetail: {
      'invalid-code': t('onboarding.setup.claude.detail.invalidCode'),
      'server-rejected': t('onboarding.setup.claude.detail.serverRejected'),
      spawn: t('onboarding.setup.claude.detail.spawn'),
      'did-not-answer': t('onboarding.setup.claude.detail.didNotAnswer'),
      'took-too-long': t('onboarding.setup.claude.detail.tookTooLong'),
      exited: t('onboarding.setup.claude.detail.exited'),
      'turn-signed-out': t('onboarding.setup.claude.detail.turnSignedOut'),
      'turn-sign-in-rejected': t('onboarding.setup.claude.detail.turnSignInRejected'),
    },
    claudeSheet: {
      usageLimit: { title: t('onboarding.setup.claude.usageLimit.title'), body: t('onboarding.setup.claude.usageLimit.body') },
      usageLimitUntil: {
        session: t('onboarding.setup.claude.usageLimit.session'),
        weekly: t('onboarding.setup.claude.usageLimit.weekly'),
        unknown: t('onboarding.setup.claude.usageLimit.until'),
      },
      rateLimited: { title: t('onboarding.setup.claude.rateLimited.title'), body: t('onboarding.setup.claude.rateLimited.body') },
      billing: { title: t('onboarding.setup.claude.billing.title'), body: t('onboarding.setup.claude.billing.body') },
      noAnswer: { title: t('onboarding.setup.claude.noAnswer.title'), body: t('onboarding.setup.claude.noAnswer.body') },
      serviceError: { title: t('onboarding.setup.claude.serviceError.title'), body: t('onboarding.setup.claude.serviceError.body') },
      agentError: { title: t('onboarding.setup.claude.agentError.title'), body: t('onboarding.setup.claude.agentError.body') },
      agentErrorSilent: t('onboarding.setup.claude.agentError.silent'),
      signInRejected: { title: t('onboarding.setup.claude.signInRejected.title'), body: t('onboarding.setup.claude.signInRejected.body'), signIn: t('onboarding.action.signInAgain') },
      // `{when}` and `{status}` are filled by the mapping; `t()` leaves a param it was not given.
      checkAgainAt: t('onboarding.action.checkAgainAt'),
      diagnosticStatus: t('onboarding.setup.diagnostic.status'),
    },
    formatWhen: (at, now, weekday) => formatReset(at, now, undefined, weekday),
    claudePlan: {
      max: t('onboarding.setup.plan.max'),
      pro: t('onboarding.setup.plan.pro'),
      team: t('onboarding.setup.plan.team'),
      enterprise: t('onboarding.setup.plan.enterprise'),
      'api-key': t('onboarding.setup.plan.apiKey'),
      bedrock: t('onboarding.setup.plan.bedrock'),
      'custom-endpoint': t('onboarding.setup.plan.customEndpoint'),
      unknown: t('onboarding.setup.plan.unknown'),
    },
    // `{plan}` is filled by the mapping; `t()` leaves a param it was not given.
    claudePlanLine: t('onboarding.setup.plan'),
    codexPlan: t('onboarding.setup.codex.connected.plan'),
    codexPlanLine: t('onboarding.setup.codex.planLine'),
    codexApiKeyPlan: t('onboarding.setup.codex.connected.apiKey'),
  };
}
