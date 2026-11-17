import { useState } from 'react';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Divider } from '@astryxdesign/core/Divider';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Popover } from '@astryxdesign/core/Popover';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';

export interface UsageLimit {
  id: string;
  label: string;
  resetLabel: string;
  percentLabel: string;
  percent?: number;
}

export interface UsageMeterProps {
  percent: number;
  label: string;
  // Resolved by the app from `usageSeverity(percent)`, so the words and the arc agree.
  tooltipTitle: string;
  tooltipDetail: string;
  tooltipConsequence?: string;
  contextTitle: string;
  contextDetail: string;
  limitsTitle: string;
  limits: UsageLimit[];
}

export type UsageSeverity = 'calm' | 'warn' | 'critical';

// 70 is where summarisation starts dropping early turns; 90 warns before the wall.
export const USAGE_WARN_AT = 70;
export const USAGE_CRITICAL_AT = 90;

export function usageSeverity(percent: number): UsageSeverity {
  if (percent >= USAGE_CRITICAL_AT) return 'critical';
  if (percent >= USAGE_WARN_AT) return 'warn';
  return 'calm';
}

// No accent ink: teal reads as healthy at 95%.
const ARC_INK: Record<UsageSeverity, string> = {
  calm: 'var(--color-icon-secondary)',
  // Raw `--color-warning` shouts louder than `--color-error`; mixed toward error it sits between.
  warn: 'color-mix(in srgb, var(--color-warning) 45%, var(--color-error))',
  critical: 'var(--color-error)',
};

const RING_SIZE = 18;
const RING_RADIUS = 6.5;
const RING_STROKE = 2.5;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function Ring({ percent }: { percent: number }): React.JSX.Element {
  const filled = (Math.min(100, Math.max(0, percent)) / 100) * CIRCUMFERENCE;
  const ink = ARC_INK[usageSeverity(percent)];
  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={RING_STROKE}
      />
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke={ink}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${CIRCUMFERENCE - filled}`}
        transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
      />
    </svg>
  );
}

function StateDot({ percent }: { percent: number }): React.JSX.Element {
  return (
    <svg width={8} height={8} viewBox="0 0 8 8" aria-hidden="true" focusable="false">
      <circle cx={4} cy={4} r={3} fill={ARC_INK[usageSeverity(percent)]} />
    </svg>
  );
}

// Exported for the showroom's still life.
export function UsageTooltipBody({
  percent,
  title,
  detail,
  consequence,
}: {
  percent: number;
  title: string;
  detail: string;
  consequence?: string;
}): React.JSX.Element {
  return (
    <VStack gap={0} style={{ alignItems: 'flex-start', textAlign: 'left' }}>
      <HStack vAlign="center" style={{ gap: 'var(--spacing-1-5)' }}>
        <StateDot percent={percent} />
        <Text type="body" color="inherit" style={{ lineHeight: 1.35 }}>
          {title}
        </Text>
      </HStack>
      <Text type="supporting" color="inherit" style={{ lineHeight: 1.35 }}>
        {detail}
      </Text>
      {consequence === undefined ? null : (
        <Text type="supporting" color="inherit" style={{ lineHeight: 1.35, opacity: 0.75 }}>
          {consequence}
        </Text>
      )}
    </VStack>
  );
}

function LimitRow({ limit }: { limit: UsageLimit }): React.JSX.Element {
  return (
    <VStack gap={1} style={{ width: '100%' }}>
      <HStack vAlign="center" style={{ width: '100%', gap: 'var(--spacing-2)' }}>
        <Text type="body" style={{ flex: 1, minWidth: 0 }}>
          {limit.label}
        </Text>
        <Text type="supporting" color="secondary">
          {limit.percentLabel}
        </Text>
      </HStack>
      {limit.resetLabel === '' ? null : <Text type="supporting" color="secondary">{limit.resetLabel}</Text>}
      {limit.percent === undefined ? null : <ProgressBar value={limit.percent} label={limit.label} isLabelHidden />}
    </VStack>
  );
}

export function UsageMeter({
  percent,
  label,
  tooltipTitle,
  tooltipDetail,
  tooltipConsequence,
  contextTitle,
  contextDetail,
  limitsTitle,
  limits,
}: UsageMeterProps): React.JSX.Element {
  const [isOpen, setOpen] = useState(false);

  const panel = (
    <VStack
      gap={2}
      style={{ width: 216, padding: 'var(--spacing-1-5) var(--spacing-2)' }}
    >
      <VStack gap={1}>
        <Text type="supporting" color="secondary">
          {contextTitle}
        </Text>
        <Text type="body">{contextDetail}</Text>
      </VStack>
      {limits.length === 0 ? null : (
        <>
          <Divider />
          <HStack vAlign="center" style={{ width: '100%', gap: 'var(--spacing-2)' }}>
            <Text type="supporting" color="secondary" style={{ flex: 1, minWidth: 0 }}>
              {limitsTitle}
            </Text>
          </HStack>
          <VStack gap={2} style={{ width: '100%' }}>
            {limits.map((limit) => (
              <LimitRow key={limit.id} limit={limit} />
            ))}
          </VStack>
        </>
      )}
    </VStack>
  );

  const trigger = (
    <IconButton
      label={label}
      icon={<Ring percent={percent} />}
      variant="ghost"
      size="sm"
      data-testid="chat-usage-meter"
      style={isOpen ? { backgroundColor: 'var(--color-overlay-pressed)' } : undefined}
    />
  );

  return (
    <Popover
      content={panel}
      placement="above"
      alignment="end"
      isOpen={isOpen}
      onOpenChange={setOpen}
      hasCloseButton={false}
      // The dialog's name; Astryx warns without it.
      label={label}
    >
      {/* `Tooltip` has no disabled state; while the panel is open it is not rendered. */}
      {isOpen ? (
        trigger
      ) : (
        <Tooltip
          content={
            <VStack gap={2} style={{ width: limits.length ? 216 : undefined }}>
              <UsageTooltipBody
                percent={percent}
                title={tooltipTitle}
                detail={tooltipDetail}
                {...(tooltipConsequence === undefined ? {} : { consequence: tooltipConsequence })}
              />
              {limits.length ? <Text type="supporting" color="inherit">{limitsTitle}</Text> : null}
              {limits.map((limit) => <LimitRow key={limit.id} limit={limit} />)}
            </VStack>
          }
          placement="above"
        >
          {trigger}
        </Tooltip>
      )}
    </Popover>
  );
}
