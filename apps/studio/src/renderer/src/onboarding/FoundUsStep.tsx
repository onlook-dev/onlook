import { useState } from 'react';
import { IconX } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconX';
import { IconGithub } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconGithub';
import { IconLinkedin } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconLinkedin';
import { IconInstagram } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconInstagram';
import { IconTiktok } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconTiktok';
import { IconFacebook } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconFacebook';
import { IconYoutube } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconYoutube';
import { IconReddit } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconReddit';
import { IconGoogle } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconGoogle';
import { IconNewspaper } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconNewspaper';
import { IconPeople2 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPeople2';
import { IconSparkle } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSparkle';
import { IconDotGrid1x3Horizontal } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconDotGrid1x3Horizontal';
import { VStack } from '@astryxdesign/core/Layout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';

import { t } from '@studio/i18n';
import type { StringKey } from '@studio/i18n';
import { FOUND_US_QUESTION, type FoundUsOption, type SurveyAnswer } from '@studio/events';
import { ChoiceChip, MARK_RULES } from './AboutYouStep.js';
import { OnboardingAccount, OnboardingFooter } from './OnboardingParts.js';
import { OnboardingShell } from './OnboardingShell.js';

const COLUMN_WIDTH = 528;

const GROUPS: readonly { label: StringKey; options: readonly FoundUsOption[] }[] = [
  { label: 'onboarding.found.group.social', options: ['x', 'linkedin', 'instagram', 'tiktok', 'facebook', 'youtube', 'reddit'] },
  { label: 'onboarding.found.group.search', options: ['google', 'ai'] },
  { label: 'onboarding.found.group.people', options: ['github', 'friend', 'article', 'other'] },
];

const OPTIONS: Record<FoundUsOption, { label: StringKey; Glyph: React.ComponentType<{ size?: number }> }> = {
  x: { label: 'onboarding.found.x', Glyph: IconX },
  github: { label: 'onboarding.found.github', Glyph: IconGithub },
  linkedin: { label: 'onboarding.found.linkedin', Glyph: IconLinkedin },
  instagram: { label: 'onboarding.found.instagram', Glyph: IconInstagram },
  tiktok: { label: 'onboarding.found.tiktok', Glyph: IconTiktok },
  facebook: { label: 'onboarding.found.facebook', Glyph: IconFacebook },
  youtube: { label: 'onboarding.found.youtube', Glyph: IconYoutube },
  reddit: { label: 'onboarding.found.reddit', Glyph: IconReddit },
  google: { label: 'onboarding.found.google', Glyph: IconGoogle },
  article: { label: 'onboarding.found.article', Glyph: IconNewspaper },
  friend: { label: 'onboarding.found.friend', Glyph: IconPeople2 },
  ai: { label: 'onboarding.found.ai', Glyph: IconSparkle },
  other: { label: 'onboarding.found.other', Glyph: IconDotGrid1x3Horizontal },
};

const GROUP_RULES = `.found-groups{display:flex;flex-direction:column;gap:20px}.found-group{display:flex;flex-direction:column;gap:8px}.found-chips{display:flex;flex-wrap:wrap;gap:8px}@media (max-height:720px),(max-width:900px){.found-groups{flex-direction:row;flex-wrap:wrap;gap:8px}.found-group,.found-chips{display:contents}.found-group-label{display:none}.found-groups{padding-bottom:64px}.found-other{top:auto !important;bottom:0;margin-top:0 !important}}`;

export interface FoundUsStepProps {
  /** Hands back the answer as an option key (`x`, `friend`, `other`), never display copy. */
  onContinue: (answer: SurveyAnswer) => void;
  onBack?: () => void;
  aside?: React.ReactNode;
}

export function FoundUsStep({ onContinue, onBack, aside }: FoundUsStepProps): React.JSX.Element {
  const [source, setSource] = useState<FoundUsOption | null>(null);
  const [otherText, setOtherText] = useState('');
  const isOther = source === 'other';
  const submit = (): void => {
    if (source === null || (isOther && otherText.trim() === '')) return;
    const detail = isOther ? otherText.trim() : undefined;
    onContinue({ question: FOUND_US_QUESTION, answer: source, ...(detail === undefined ? {} : { detail }) });
  };
  return (
    <>
    <style href="about-chip-mark" precedence="medium">{MARK_RULES}</style>
    <style href="found-groups" precedence="medium">{GROUP_RULES}</style>
    <OnboardingShell data-testid="onboarding-found" aside={aside} headerEnd={<OnboardingAccount />}>
      <VStack width="100%" gap={8} align="start" style={{ maxWidth: COLUMN_WIDTH }}>
        <h1 data-testid="onboarding-heading" style={{ margin: 0, textWrap: 'balance', fontSize: 32, lineHeight: 1.15, letterSpacing: '-0.02em', fontWeight: 'var(--font-weight-normal)', color: 'var(--color-text-primary)' }}>
          {t('onboarding.found.title')}
        </h1>
        {/* Grouped under quiet labels; a small window drops the labels and runs every bubble together. */}
        <div className="found-groups" style={{ position: 'relative', width: '100%' }}>
          {GROUPS.map((group) => (
            <div key={group.label} className="found-group">
              <span className="found-group-label"><Text type="supporting" color="secondary">{t(group.label)}</Text></span>
              <div className="found-chips">
                {group.options.map((option) => {
                  const { label, Glyph } = OPTIONS[option];
                  return (
                    <ChoiceChip key={option} label={t(label)} isSelected={source === option} onSelect={() => { setSource(source === option ? null : option); }}
                      leading={<span aria-hidden="true" className="about-chip-mark"><Glyph size={18} /></span>} />
                  );
                })}
              </div>
            </div>
          ))}
          {/* Other opens a field just below, out of the flow, so nothing above it moves. */}
          {isOther ? (
            <div className="found-other" style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 20 }}>
              <TextInput label={t('onboarding.found.otherLabel')} isLabelHidden placeholder={t('onboarding.found.otherPlaceholder')} hasAutoFocus
                value={otherText} onChange={setOtherText} onEnter={submit} data-testid="found-other-input" />
            </div>
          ) : null}
        </div>
      </VStack>
      <OnboardingFooter hasBack={onBack !== undefined} {...(onBack === undefined ? {} : { onBack })} isContinueEnabled={source !== null && (!isOther || otherText.trim() !== '')} onContinue={submit} />
    </OnboardingShell>
    </>
  );
}
