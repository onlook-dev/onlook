import type { SetupStepGlyphs } from '@studio/chat-ui';
import { IconCircleCheck } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCircleCheck';
import { IconCirclePlaceholderOn } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCirclePlaceholderOn';
import { IconCircleX } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCircleX';
import { IconLoadingCircle } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconLoadingCircle';

export const SETUP_STEP_GLYPHS: SetupStepGlyphs = {
  pending: <IconCirclePlaceholderOn mode="raw" size={16} />,
  running: <span className="setup-step-spin"><IconLoadingCircle mode="raw" size={16} /></span>,
  done: <IconCircleCheck mode="raw" size={16} />,
  failed: <IconCircleX mode="raw" size={16} />,
};
