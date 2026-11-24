import { Icon, type IconType } from '@astryxdesign/core/Icon';
import { IconStar } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconStar';
import type { CardGlyphs, TileGlyphs } from '@studio/onboarding-ui';
import {
  AiProvidersIcon,
  ClaudeMarkIcon,
  CloudDownloadIcon,
  ConsoleIcon,
  GlyphLoadingCircle,
  OpenAiMarkIcon,
  OpenCodeMarkIcon,
  SubscriptionTickIcon,
  WarningTriangleIcon,
  WindowGlyph,
} from '../icons/glyphs.js';

const glyph = (icon: IconType, size: 'sm' | 'md' = 'md'): React.ReactNode => <Icon icon={icon} size={size} color="inherit" />;

// The icon's ring is static; the keyframe in styles.css turns it.
const SPIN = { display: 'flex', animation: 'frame-reload-turn 900ms linear infinite' } as const;

export const TILE_GLYPHS: TileGlyphs = {
  claude: glyph(ClaudeMarkIcon),
  codex: glyph(OpenAiMarkIcon),
  opencode: glyph(OpenCodeMarkIcon),
  freebuff: glyph(AiProvidersIcon),
  other: glyph(AiProvidersIcon),
  star: <IconStar size={16} />,
  // Central's star draws through a mask with a fixed id, shared by every star on the page, so filling one filled
  // them all. The solid star is its own shape: the same outline path, filled, with no mask.
  starFilled: (
    <svg aria-hidden="true" width={16} height={16} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round">
      <path d="M11.5497 2.03292C11.7307 1.65569 12.2693 1.65569 12.4503 2.03292L15.0189 7.38732C15.0918 7.53919 15.2367 7.64404 15.4041 7.66599L21.3154 8.44106C21.732 8.49569 21.8986 9.0078 21.5935 9.29588L17.2708 13.3775C17.1479 13.4935 17.0924 13.6637 17.1232 13.8297L18.2087 19.6603C18.2853 20.0717 17.8494 20.388 17.4803 20.1888L12.2376 17.3585C12.0894 17.2785 11.9106 17.2785 11.7624 17.3585L6.51969 20.1888C6.15063 20.388 5.71473 20.0717 5.79132 19.6603L6.87675 13.8297C6.90764 13.6637 6.8521 13.4935 6.7292 13.3775L2.40651 9.29588C2.10142 9.0078 2.26803 8.49569 2.68463 8.44106L8.5959 7.66599C8.7633 7.64404 8.90823 7.53919 8.98108 7.38732L11.5497 2.03292Z" />
    </svg>
  ),
  spinner: (
    <span style={SPIN}>
      <GlyphLoadingCircle size={14} />
    </span>
  ),
};

export const CARD_GLYPHS: CardGlyphs = {
  claude: glyph(ClaudeMarkIcon, 'sm'),
  codex: glyph(OpenAiMarkIcon, 'sm'),
  opencode: glyph(OpenCodeMarkIcon, 'sm'),
  freebuff: glyph(AiProvidersIcon, 'sm'),
  spinner: (
    <span style={SPIN}>
      <GlyphLoadingCircle width={18} height={18} />
    </span>
  ),
  browser: glyph(WindowGlyph, 'sm'),
  check: glyph(SubscriptionTickIcon, 'sm'),
  warning: glyph(WarningTriangleIcon, 'sm'),
  console: glyph(ConsoleIcon, 'sm'),
  download: glyph(CloudDownloadIcon, 'sm'),
};
