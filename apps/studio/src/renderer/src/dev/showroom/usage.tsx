import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import {
  UsageMeter,
  UsageTooltipBody,
  usageSeverity,
  type UsageLimit,
  type UsageMeterProps,
} from '@studio/chat-ui';

import type { Category, Gallery } from './Showroom.js';

const LIMITS = [
  { id: 'five-hour', label: '5-hour limit', resetLabel: 'Resets in 4 hr 20 min', percentLabel: '32%', percent: 32 },
  { id: 'weekly', label: 'Weekly · all models', resetLabel: 'Resets in 20 hr 20 min', percentLabel: '30%', percent: 30 },
  { id: 'weekly-opus', label: 'Weekly · Opus', resetLabel: 'Resets in 20 hr 20 min', percentLabel: '7%', percent: 7 },
] satisfies UsageLimit[];

const WINDOW_K = 200;

/** Mirrors the catalog's `chat.usage.title.*` / `chat.usage.consequence.*` split. */
const COPY: Record<string, { title: string; consequence?: string }> = {
  calm: { title: 'Context window' },
  warn: { title: 'Context filling up', consequence: 'Start a new chat for higher quality responses.' },
  critical: {
    title: 'Context almost full',
    consequence: 'Start a new chat for higher quality responses.',
  },
};

function reading(percent: number): string {
  return `${percent}% used · ${Math.round((percent / 100) * WINDOW_K)}k of ${WINDOW_K}k tokens`;
}

function meter(percent: number, extra?: Partial<UsageMeterProps>): UsageMeterProps {
  const copy = COPY[usageSeverity(percent)] ?? COPY.calm;
  return {
    percent,
    label: 'Context and plan usage',
    tooltipTitle: copy?.title ?? 'Context window',
    tooltipDetail: reading(percent),
    ...(copy?.consequence ? { tooltipConsequence: copy.consequence } : {}),
    contextTitle: 'Context window',
    contextDetail: reading(percent),
    limitsTitle: 'Plan usage limits',
    limits: [],
    ...extra,
  };
}

/** The composer's own ground, so the ring is judged on the surface it sits on, not the page. */
function Ground({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <HStack
      vAlign="center"
      style={{
        gap: 'var(--spacing-3)',
        padding: 'var(--spacing-3)',
        borderRadius: 'var(--radius-container)',
        background: 'var(--color-background-card)',
      }}
    >
      {children}
    </HStack>
  );
}

function Series({ steps }: { steps: number[] }): React.JSX.Element {
  return (
    <Ground>
      {steps.map((percent) => (
        <VStack key={percent} gap={1} style={{ alignItems: 'center' }}>
          <UsageMeter {...meter(percent)} />
          <Text type="supporting" color="secondary">
            {`${percent}%`}
          </Text>
        </VStack>
      ))}
    </Ground>
  );
}

/** Astryx paints the real tooltip; this is only its ink, on the ground it lands on. */
function TooltipSkin({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <VStack
      gap={0}
      style={{
        padding: 'var(--spacing-1-5) var(--spacing-2)',
        borderRadius: 'var(--radius-element)',
        background: 'var(--color-background-gray)',
        color: 'var(--color-text-primary)',
        width: 'max-content',
      }}
    >
      {children}
    </VStack>
  );
}

function TooltipStory({ percent }: { percent: number }): React.JSX.Element {
  /* The same props the ring below is given, so the hover and the ring cannot drift. */
  const props = meter(percent);
  return (
    <VStack gap={2} style={{ alignItems: 'flex-start' }}>
      <TooltipSkin>
        <UsageTooltipBody
          percent={props.percent}
          title={props.tooltipTitle}
          detail={props.tooltipDetail}
          {...(props.tooltipConsequence ? { consequence: props.tooltipConsequence } : {})}
        />
      </TooltipSkin>
      <Ground>
        <UsageMeter {...meter(percent)} />
        <Text type="supporting" color="secondary">
          {`${percent}% · ${usageSeverity(percent)}`}
        </Text>
      </Ground>
    </VStack>
  );
}

const CATEGORIES: Category[] = [
  {
    id: 'ring',
    title: 'The ring, as context fills',
    stories: [
      {
        id: 'usage-ring-empty',
        title: 'Nothing reported yet',
        note: 'A fresh session: the runtime reports tokens only on a settled turn, so the track is bare rather than a zero we cannot vouch for.',
        render: () => <Series steps={[0]} />,
      },
      {
        id: 'usage-ring-series',
        title: 'The fill, end to end',
        note: 'The low end is the hard one — a few degrees of arc has to read as a start, not a rendering artefact.',
        render: () => <Series steps={[5, 15, 30, 50, 70, 85, 95, 100]} />,
      },
    ],
  },
  {
    id: 'tooltip',
    title: 'The hover, at each state',
    stories: [
      {
        id: 'usage-tooltip-calm',
        title: 'Calm — under 70%',
        note: 'The reading and nothing else. There is nothing to warn about, so the meter stays quiet and grey.',
        render: () => <TooltipStory percent={40} />,
      },
      {
        id: 'usage-tooltip-warn',
        title: 'Filling — 70% and up',
        note: 'The consequence line appears: what the runtime is about to do to the conversation.',
        render: () => <TooltipStory percent={78} />,
      },
      {
        id: 'usage-tooltip-critical',
        title: 'Almost full — 90% and up',
        note: 'Red before the wall, not at it, and the line is now an instruction rather than a description.',
        render: () => <TooltipStory percent={95} />,
      },
    ],
  },
  {
    id: 'panel',
    title: 'The panel',
    stories: [
      {
        id: 'usage-panel-context-only',
        title: 'Context only',
        note: 'What ships today. No backend reports a plan limit, so the section is absent — a lone heading over a gap reads as a panel that failed to load. Press the ring.',
        render: () => (
          <Ground>
            <UsageMeter {...meter(40)} />
          </Ground>
        ),
      },
      {
        id: 'usage-panel-with-limits',
        title: 'With plan limits',
        note: 'The designed target. The rows are fixtures — the Agent SDK reports these windows on `SDKRateLimitEvent`, and nothing is wired to it yet.',
        render: () => (
          <Ground>
            <UsageMeter {...meter(40, { limits: LIMITS })} />
          </Ground>
        ),
      },
      {
        id: 'usage-panel-full',
        title: 'Near the limit',
        note: 'Both readings high at once, which is when a user actually opens this.',
        render: () => (
          <Ground>
            <UsageMeter
              {...meter(92, {
                limits: LIMITS.map((l) => ({
                  ...l,
                  percent: Math.min(100, l.percent + 60),
                  percentLabel: `${Math.min(100, l.percent + 60)}%`,
                })),
              })}
            />
          </Ground>
        ),
      },
    ],
  },
];

export const USAGE_GALLERY: Gallery = {
  id: 'usage',
  title: 'Usage meter',
  subtitle: 'The composer ring — props in, pixels out. No session, no SDK, no plan.',
  categories: CATEGORIES,
};
