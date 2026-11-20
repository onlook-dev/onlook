import { useState } from 'react';
import { IconBrush } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBrush';
import { IconCompassRound } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCompassRound';
import { IconCode } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCode';
import { IconRocket } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconRocket';
import { IconGraduateCap } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconGraduateCap';
import { IconDotGrid1x3Horizontal } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconDotGrid1x3Horizontal';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Layout';
import { TextInput } from '@astryxdesign/core/TextInput';

import { t } from '@studio/i18n';
import type { StringKey } from '@studio/i18n';
import { ROLE_QUESTION, isRoleOption, type RoleOption, type SurveyAnswer } from '@studio/events';
import { ChoiceChip, MARK_RULES } from './AboutYouStep.js';
import { GROUP_RULES } from './FoundUsStep.js';
import { OnboardingAccount, OnboardingFooter } from './OnboardingParts.js';
import { OnboardingShell } from './OnboardingShell.js';

const COLUMN_WIDTH = 528;

const GROUPS: readonly { label: StringKey; options: readonly RoleOption[] }[] = [
  { label: 'onboarding.role.group.team', options: ['designer', 'pm', 'engineer'] },
  { label: 'onboarding.role.group.else', options: ['founder', 'student', 'other'] },
];

const OPTIONS: Record<RoleOption, { label: StringKey; Glyph: React.ComponentType<{ size?: number }> }> = {
  designer: { label: 'onboarding.role.designer', Glyph: IconBrush },
  pm: { label: 'onboarding.role.pm', Glyph: IconCompassRound },
  engineer: { label: 'onboarding.role.engineer', Glyph: IconCode },
  founder: { label: 'onboarding.role.founder', Glyph: IconRocket },
  student: { label: 'onboarding.role.student', Glyph: IconGraduateCap },
  other: { label: 'onboarding.role.other', Glyph: IconDotGrid1x3Horizontal },
};

export interface RoleStepProps {
  /** Hands back an option key (`designer`, `other`), never display copy. */
  onContinue: (answer: SurveyAnswer) => void;
  onBack?: () => void;
  aside?: React.ReactNode;
  /** The answer already given, so Back returns to it rather than to a blank screen. */
  initial?: SurveyAnswer;
}

export function RoleStep({ onContinue, onBack, aside, initial }: RoleStepProps): React.JSX.Element {
  const [role, setRole] = useState<RoleOption | null>(initial !== undefined && isRoleOption(initial.answer) ? initial.answer : null);
  const [otherText, setOtherText] = useState(initial?.detail ?? '');
  const isOther = role === 'other';
  const submit = (): void => {
    if (role === null || (isOther && otherText.trim() === '')) return;
    const detail = isOther ? otherText.trim() : undefined;
    onContinue({ question: ROLE_QUESTION, answer: role, ...(detail === undefined ? {} : { detail }) });
  };
  return (
    <>
      <style href="about-chip-mark" precedence="medium">{MARK_RULES}</style>
      <style href="found-groups" precedence="medium">{GROUP_RULES}</style>
      <OnboardingShell data-testid="onboarding-role" aside={aside} headerEnd={<OnboardingAccount />}>
        <VStack width="100%" gap={8} align="start" className="survey-block" style={{ maxWidth: COLUMN_WIDTH }}>
          <h1 data-testid="onboarding-heading" style={{ margin: 0, textWrap: 'balance', fontSize: 32, lineHeight: 1.15, letterSpacing: '-0.02em', fontWeight: 'var(--font-weight-normal)', color: 'var(--color-text-primary)' }}>
            {t('onboarding.role.title')}
          </h1>
          <div role="group" aria-label={t('onboarding.role.title')} className="found-groups" style={{ position: 'relative', width: '100%' }}>
            {GROUPS.map((group) => (
              <div key={group.label} className="found-group">
                <span className="found-group-label"><Text type="supporting" color="secondary">{t(group.label)}</Text></span>
                <div className="found-chips">
                  {group.options.map((option) => {
                    const { label, Glyph } = OPTIONS[option];
                    return (
                      <ChoiceChip key={option} label={t(label)} isSelected={role === option} onSelect={() => { setRole(role === option ? null : option); }}
                        leading={<span aria-hidden="true" className="about-chip-mark"><Glyph size={18} /></span>} />
                    );
                  })}
                </div>
              </div>
            ))}
            {isOther ? (
              <div className="found-other" style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 20 }}>
                <TextInput label={t('onboarding.role.otherLabel')} isLabelHidden placeholder={t('onboarding.role.otherPlaceholder')} hasAutoFocus
                  value={otherText} onChange={setOtherText} onEnter={submit} data-testid="role-other-input" />
              </div>
            ) : null}
          </div>
        </VStack>
        <OnboardingFooter hasBack={onBack !== undefined} {...(onBack === undefined ? {} : { onBack })} isContinueEnabled={role !== null && (!isOther || otherText.trim() !== '')} onContinue={submit} />
      </OnboardingShell>
    </>
  );
}
