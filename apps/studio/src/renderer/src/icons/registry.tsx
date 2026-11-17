import { registerIcons, type IconRegistry } from '@astryxdesign/core/Icon';

import { IconArrowDown } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconArrowDown';
import { IconArrowUp } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconArrowUp';
import { IconBarsThree } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBarsThree';
import { IconCalendar1 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCalendar1';
import { IconCheckmark1 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCheckmark1';
import { IconChevronBottom } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronBottom';
import { IconChevronLeft } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronLeft';
import { IconChevronRight } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronRight';
import { IconCircleCheck } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCircleCheck';
import { IconCircleInfo } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCircleInfo';
import { IconCircleX } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCircleX';
import { IconClock } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconClock';
import { IconColumns3 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconColumns3';
import { IconCrossMedium } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCrossMedium';
import { IconDotGrid1x3Horizontal } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconDotGrid1x3Horizontal';
import { IconDoupleCheckmark1 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconDoupleCheckmark1';
import { IconExclamationTriangle } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconExclamationTriangle';
import { IconEyeSlash } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconEyeSlash';
import { IconFilter1 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconFilter1';
import { IconMagnifyingGlass } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconMagnifyingGlass';
import { IconMicrophone } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconMicrophone';
import { IconSortArrowUpDown } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSortArrowUpDown';
import { IconSquareArrowTopRight } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSquareArrowTopRight';
import { IconSquareBehindSquare1 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSquareBehindSquare1';
import { IconStop } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconStop';
import { IconToolbox } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconToolbox';

// Elements sized `1em`, not components: string-mode `Icon` passes the node no props, so a bare `<IconX />` draws 24px in a 16px box.
// `mode="raw"` for the reason `glyph()` in ./glyphs.tsx gives: the default `masked` shares one hardcoded mask id
// across every copy, and a copy whose first twin is hidden paints that id's unmasked square (ONL-3069).
const studioIcons: IconRegistry = {
  arrowDown: <IconArrowDown size="1em" mode="raw" />,
  arrowUp: <IconArrowUp size="1em" mode="raw" />,
  arrowsUpDown: <IconSortArrowUpDown size="1em" mode="raw" />,
  calendar: <IconCalendar1 size="1em" mode="raw" />,
  check: <IconCheckmark1 size="1em" mode="raw" />,
  checkDouble: <IconDoupleCheckmark1 size="1em" mode="raw" />,
  chevronDown: <IconChevronBottom size="1em" mode="raw" />,
  chevronLeft: <IconChevronLeft size="1em" mode="raw" />,
  chevronRight: <IconChevronRight size="1em" mode="raw" />,
  clock: <IconClock size="1em" mode="raw" />,
  close: <IconCrossMedium size="1em" mode="raw" />,
  copy: <IconSquareBehindSquare1 size="1em" mode="raw" />,
  error: <IconCircleX size="1em" mode="raw" />,
  externalLink: <IconSquareArrowTopRight size="1em" mode="raw" />,
  eyeSlash: <IconEyeSlash size="1em" mode="raw" />,
  funnel: <IconFilter1 size="1em" mode="raw" />,
  info: <IconCircleInfo size="1em" mode="raw" />,
  menu: <IconBarsThree size="1em" mode="raw" />,
  microphone: <IconMicrophone size="1em" mode="raw" />,
  moreHorizontal: <IconDotGrid1x3Horizontal size="1em" mode="raw" />,
  search: <IconMagnifyingGlass size="1em" mode="raw" />,
  stop: <IconStop size="1em" mode="raw" />,
  success: <IconCircleCheck size="1em" mode="raw" />,
  viewColumns: <IconColumns3 size="1em" mode="raw" />,
  warning: <IconExclamationTriangle size="1em" mode="raw" />,
  wrench: <IconToolbox size="1em" mode="raw" />,
};

export function registerStudioIcons(): void {
  registerIcons(studioIcons);
}
