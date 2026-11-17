import type { ComponentType, SVGProps } from 'react';
import type { IconType } from '@astryxdesign/core/Icon';
import type { HarnessId } from '@studio/events';
import type { CentralIconBaseProps } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/CentralIconBase';

import { IconArrowRotateClockwise } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconArrowRotateClockwise';
import { IconArrowUpRight } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconArrowUpRight';
import { IconCircleInfo } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCircleInfo';
import { IconBubbleQuestion } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBubbleQuestion';
import { IconAddImage } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconAddImage';
import { IconArrowRightSquare } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconArrowRightSquare';
import { IconCircleQuestionmark } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCircleQuestionmark';
import { IconChevronLeftMedium } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronLeftMedium';
import { IconChevronRightMedium } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronRightMedium';
import { IconCrossMedium } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCrossMedium';
import { IconPencil } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPencil';
import { IconTrashCan } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconTrashCan';
import { IconCrossSmall } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCrossSmall';
import { IconMouseScrollDown } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconMouseScrollDown';
import { IconCursor1 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCursor1';
import { IconCursorClick } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCursorClick';
import { IconClock } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconClock';
import { IconDotGrid1x3Horizontal } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconDotGrid1x3Horizontal';
import { IconFolder2 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconFolder2';
import { IconFolderAddLeft } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconFolderAddLeft';
import { IconPlusLarge } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPlusLarge';
import { IconPlugin1 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPlugin1';
import { IconHand5Finger } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconHand5Finger';
import { IconSquareCursor } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSquareCursor';
import { IconPlay } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPlay';
import { IconPause } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPause';
import { IconVolumeFull } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconVolumeFull';
import { IconVolumeOff } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconVolumeOff';
import { IconPlayCircle } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPlayCircle';
import { IconPlayground } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPlayground';
import { IconStopCircle } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconStopCircle';
import { IconFolder1 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconFolder1';
import { IconProjects } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconProjects';
import { IconSidebarSimpleLeftSquare } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSidebarSimpleLeftSquare';
import { IconSidebarSimpleRightSquare } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSidebarSimpleRightSquare';
import { IconLayoutAlignLeft } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconLayoutAlignLeft';
import { IconLayoutAlignRight } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconLayoutAlignRight';
import { IconArrowRight } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconArrowRight';
import { IconBell } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBell';
import { IconPaperclip2 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPaperclip2';
import { IconGithub } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconGithub';
import { IconStar } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconStar';
import { IconEditSmall1 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconEditSmall1';
import { IconBranch } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBranch';
import { IconRunShortcut } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconRunShortcut';
import { IconCloudDownload } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCloudDownload';
import { IconArrowOutOfBox } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconArrowOutOfBox';
import { IconCloudUpload } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCloudUpload';
import { IconMerged } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconMerged';
import { IconAiTokens } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconAiTokens';
import { IconClaudeai } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconClaudeai';
import { IconFileSparkle } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconFileSparkle';
import { IconOpenai } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconOpenai';
import { IconOpencode } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconOpencode';
import { IconPlusMedium } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPlusMedium';
import { IconWindow2 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconWindow2';
import { IconServer1 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconServer1';
import { IconChipSimple } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChipSimple';
import { IconSquareBehindSquare1 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSquareBehindSquare1';
import { IconSquarePlaceholderDashed } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSquarePlaceholderDashed';
import { IconCheckmark1Small } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCheckmark1Small';
import { IconCircleCheck } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCircleCheck';
import { IconChevronDownMedium } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronDownMedium';
import { IconLoadingCircle } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconLoadingCircle';
import { IconPhone } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPhone';
import { IconTablet } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconTablet';
import { IconImages3 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconImages3';
import { IconText1 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconText1';
import { IconFocusSquare } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconFocusSquare';
import { IconImac } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconImac';
import { IconSparklesTwo2 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSparklesTwo2';
import { IconExclamationTriangle } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconExclamationTriangle';
import { IconExclamationCircle } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconExclamationCircle';
import { IconConsole } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconConsole';
import { IconSubscriptionTick2 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSubscriptionTick2';
import { IconLightBulbSimple } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconLightBulbSimple';
import { IconSparklesTwo } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSparklesTwo';
import { IconCmdBox } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCmdBox';
import { IconBrowserTabs } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBrowserTabs';
import { IconArrowUndoUp } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconArrowUndoUp';
import { IconArrowRedoDown } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconArrowRedoDown';
import { IconSquareBehindSquare4 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSquareBehindSquare4';
import { IconSquareBehindSquare2 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSquareBehindSquare2';
import { IconZoomIn } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconZoomIn';
import { IconZoomOut } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconZoomOut';
import { IconFullscreen1 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconFullscreen1';
import { IconMinusMedium } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconMinusMedium';
import { IconMagnifyingGlass } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconMagnifyingGlass';
import { IconRuler } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconRuler';
import { IconSettingsGear2 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSettingsGear2';
import { IconCode } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCode';
import { IconCodeBrackets } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCodeBrackets';
import { IconFiles } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconFiles';

/**
 * Per-icon deep imports only, never the package root: the family's licence forbids shipping the complete set, and a root import bundles it.
 * One style, `round-outlined-radius-1-stroke-1.5`: a second package puts two families in one row.
 * The design system's registry slots are mapped in `registry.tsx` and do not route through here.
 */

/**
 * Wraps a family glyph into the shape the design system expects. Three things, all load-bearing:
 * A plain function: the family ships each glyph as `React.memo(...)`, an object with no `render`, which `renderIconSlot` returns as a child, so React throws and blanks the tree.
 * `mode="raw"`: `masked` clips with an SVG `<mask>` whose id is hardcoded per module, so hiding one instance hides every glyph of that kind in the app. A glyph needing `masked` needs a per-instance `maskId` (`useId()`).
 * `mode` is dropped at the boundary, with no cast: React declares `mode?: string` on SVG elements, so the family's narrower type is non-assignable. Nothing in the app sets it.
 */
function glyph(Base: ComponentType<CentralIconBaseProps>, name: string): IconType {
  const Glyph = ({ mode: _mode, ...rest }: SVGProps<SVGSVGElement>) => (
    <Base {...rest} mode="raw" />
  );
  Glyph.displayName = name;
  return Glyph;
}

// Retired glyphs are deleted: every deep import ships a module into a licence-capped bundle.
export const PlusIcon = glyph(IconPlusMedium, 'PlusIcon');
export const ReloadIcon = glyph(IconArrowRotateClockwise, 'ReloadIcon');
/** The sidebar's designs-row glyph. `IconWindow2`, not `IconWindow`: the design draws the three-dot one. */
export const WindowGlyph = glyph(IconWindow2, 'WindowGlyph');
export const ServerGlyph = glyph(IconServer1, 'ServerGlyph');
export const ChipGlyph = glyph(IconChipSimple, 'ChipGlyph');
/** The designs-row glyph for an artifact (`sidebar/designRow.ts`). */
export const PlaygroundGlyph = glyph(IconPlayground, 'PlaygroundGlyph');
export const MinusIcon = glyph(IconMinusMedium, 'MinusIcon');
export const QuestionWaitingGlyph = glyph(IconBubbleQuestion, 'QuestionWaitingGlyph');
export const AddInspirationGlyph = glyph(IconAddImage, 'AddInspirationGlyph');
export const ScrollKeyGlyph = glyph(IconMouseScrollDown, 'ScrollKeyGlyph');
export const PromptsTipGlyph = glyph(IconSparklesTwo, 'PromptsTipGlyph');
export const PlayGlyph = glyph(IconPlay, 'PlayGlyph');
/** The sound picker's card auditions, and the Mute control beside them. */
export const PauseIcon = glyph(IconPause, 'PauseIcon');
export const VolumeOnIcon = glyph(IconVolumeFull, 'VolumeOnIcon');
export const VolumeOffIcon = glyph(IconVolumeOff, 'VolumeOffIcon');
export const SquareCursorGlyph = glyph(IconSquareCursor, 'SquareCursorGlyph');
/** The composer's chips for the canvas's other kinds — slot props, where `GlyphText`
 *  and `GlyphImage` below are the same drawings raw, for the toolbar's elements (ONL-2486). */
export const TextGlyph = glyph(IconText1, 'TextGlyph');
export const ImageGlyph = glyph(IconImages3, 'ImageGlyph');
/** The browser frame's back control: the design draws the Medium chevron. Not the registry's `chevronLeft` slot, which would change every library-drawn left chevron in the app. */
export const BackIcon = glyph(IconChevronLeftMedium, 'BackIcon');
/** Its mirror. `Medium` to match `BackIcon`: a pair on different chevron weights is visibly mismatched. */
export const ForwardIcon = glyph(IconChevronRightMedium, 'ForwardIcon');
/** The browser frame's overflow control. */
export const MoreIcon = glyph(IconDotGrid1x3Horizontal, 'MoreIcon');
/** The address bar's open-externally affordance, revealed on hover. Matched to the design by its path data, not by name. */
export const OpenExternalIcon = glyph(IconArrowUpRight, 'OpenExternalIcon');
/** The top bar's folder: `IconFolder1`, the closed folder, not `IconFolderOpen`. */
export const FolderIcon = glyph(IconFolder1, 'FolderIcon');

/** The band's left cluster and its rail toggles (ONL-2236). Open is the square with a divider; closed is the filled align bar. */
export const ProjectsIcon = glyph(IconProjects, 'ProjectsIcon');
export const RailLeftOpenIcon = glyph(IconSidebarSimpleLeftSquare, 'RailLeftOpenIcon');
export const RailRightOpenIcon = glyph(IconSidebarSimpleRightSquare, 'RailRightOpenIcon');
export const RailLeftClosedIcon = glyph(IconLayoutAlignLeft, 'RailLeftClosedIcon');
export const RailRightClosedIcon = glyph(IconLayoutAlignRight, 'RailRightClosedIcon');

/** The mark on the top bar's Create PR control. */
export const GithubIcon = glyph(IconGithub, 'GithubIcon');
export const StarIcon = glyph(IconStar, 'StarIcon');
/** The git-status pill's glyphs (ONL-2172): the right segment, and the per-state leading marks. */
export const BranchIcon = glyph(IconBranch, 'BranchIcon');
export const CloudUploadIcon = glyph(IconCloudUpload, 'CloudUploadIcon');
export const CloudDownloadIcon = glyph(IconCloudDownload, 'CloudDownloadIcon');
/** The selected artifact's export control beside its title (ONL-2744). */
export const ExportIcon = glyph(IconArrowOutOfBox, 'ExportIcon');
export const MergedIcon = glyph(IconMerged, 'MergedIcon');
/** The chat header's way into the sound picker (ONL-2084). */
export const BellIcon = glyph(IconBell, 'BellIcon');

/** The composer's attach control: the design's `IconPaperclip2`, by name and by glyph. */
export const PaperclipIcon = glyph(IconPaperclip2, 'PaperclipIcon');
/** The chat's "+" menu: slash commands. */
export const RunShortcutIcon = glyph(IconRunShortcut, 'RunShortcutIcon');
export const EditIcon = glyph(IconPencil, 'EditIcon');
export const TrashIcon = glyph(IconTrashCan, 'TrashIcon');
export const CloseIcon = glyph(IconCrossMedium, 'CloseIcon');
/** The tab strip's ✕ — the design's `IconCrossSmall`, a smaller drawing than
 *  `CloseIcon`, not the same glyph at a smaller size. */
export const CloseSmallIcon = glyph(IconCrossSmall, 'CloseSmallIcon');
export const ConnectorsIcon = glyph(IconPlugin1, 'ConnectorsIcon');
/** The send control's arrow, passed through `ChatSendButton`'s `sendIcon` slot: re-pointing the registry's `arrowUp` would change every library-drawn up arrow in the app. */
export const SendArrowIcon = glyph(IconArrowRight, 'SendArrowIcon');
/** The model/effort menu's checkmark — the running model and its effort level. */
export const CheckIcon = glyph(IconCheckmark1Small, 'CheckIcon');
/** A settled check on the onboarding machine list — the ringed tick of the design (ONL-3111). */
export const CircleCheckIcon = glyph(IconCircleCheck, 'CircleCheckIcon');

/** The frame's device-size presets. `IconImac` for Desktop: the family carries no `Monitor`. */
export const PhoneIcon = glyph(IconPhone, 'PhoneIcon');
export const TabletIcon = glyph(IconTablet, 'TabletIcon');
export const DesktopIcon = glyph(IconImac, 'DesktopIcon');
/** The response row's copy control: the registry's own `copy` glyph is illegible at the row's size. */
export const CopyIcon = glyph(IconSquareBehindSquare1, 'CopyIcon');
export const ElementSelectionIcon = glyph(
  IconSquarePlaceholderDashed,
  'ElementSelectionIcon',
);
export const ElementPickerIcon = glyph(IconCursorClick, 'ElementPickerIcon');

// ONBOARDING — the agent row, in the design's own order, and the import-source row.
export const ClaudeMarkIcon = glyph(IconClaudeai, 'ClaudeMarkIcon');
export const OpenAiMarkIcon = glyph(IconOpenai, 'OpenAiMarkIcon');
export const OpenCodeMarkIcon = glyph(IconOpencode, 'OpenCodeMarkIcon');

/** The mark for the runtime this session runs. Each arm returns a module-level glyph, so slot props do not see a new component per render. Absence reads as Claude, matching `SessionState.harnessId`. */
export function modelMarkIcon(harnessId: HarnessId | undefined): IconType {
  return harnessId === 'codex' ? OpenAiMarkIcon : ClaudeMarkIcon;
}

/** "Other AI providers": a generic glyph the design names directly (`IconAiTokens`), not a brand mark. */
export const AiProvidersIcon = glyph(IconAiTokens, 'AiProvidersIcon');

/** The import-source row's second tile. The design's `IconFileSparkle`. */
export const BlankProjectIcon = glyph(IconFileSparkle, 'BlankProjectIcon');

/*
 * Raw glyphs, rendered as elements rather than handed to an `icon` slot prop: the canvas toolbar sets size and state ink itself, which `glyph()`'s `IconType` does not carry.
 * ⚠️ CHOSEN BY RENDERING, NOT BY READING A NAME: `IconCursor` is a 3D cube and `IconPan` is a frying pan. Search the family's `iconAliases` index, not the filenames.
 * The hand and the cursor are at equal optical size; the gap is width, and sizing the hand up would make it taller than the cursor.
 */

/** The select tool: Cursor1's plain arrow. */
export const GlyphSelect = IconCursor1;

/** The pan tool — the open hand. NOT `IconPan`, which is cookware. */
export const GlyphPan = IconHand5Finger;

/** The frame tool: the same drawing as `WindowGlyph`, raw because the toolbar builds its glyphs as elements. */
export const GlyphFrame = IconWindow2;
export const GlyphSection = IconSquarePlaceholderDashed;
export const SectionGlyph = glyph(IconSquarePlaceholderDashed, 'SectionGlyph');

/** The text tool — the family's serifed T, chosen by rendering: `IconText2` drops the foot and reads as a table column. */
export const GlyphText = IconText1;

/** The image chip — the family's plain photo: a frame with one sun and one ridge. `IconImages1` fills the frame with a curve and reads as a wave. */
export const GlyphImage = IconImages3;

/** The artifact tool — the same drawing the Designs row and the chat chip wear (`PlaygroundGlyph`), raw here because the toolbar builds its glyphs as elements (ONL-2568). */
export const GlyphArtifact = IconPlayground;

/** The idle run control — solid triangle in a circle. */
export const GlyphPlayCircle = IconPlayCircle;

/** The starting run control — rounded square in a circle. */
export const GlyphStopCircle = IconStopCircle;

/** The in-flight run control. Takes a `size` like its two siblings above, so
 *  the three states of one control are drawn identically. */
export const GlyphLoadingCircle = IconLoadingCircle;

/** The card's attention marks, RAW so it can set 14 — `Icon` has no 14 rung.
 *  `CloseIcon` above is the same cross for slot props. */
export const GlyphCross = IconCrossMedium;
export const GlyphCircleInfo = IconCircleInfo;

// The projects view's sidebar (ONL-1908), under the design file's own icon names.

/** `Recent Projects`. Not `HistoryIcon` — the design draws a plain clock face. */
export const ClockIcon = glyph(IconClock, 'ClockIcon');
/** The sidebar's blank-project door (ONL-2152), a row beside Recent. */
export const NewDraftIcon = glyph(IconEditSmall1, 'NewDraftIcon');
/** The sidebar's `Settings` row (ONL-2115). Gear 2 of the family's four; the registry has no gear slot. */
export const SettingsIcon = glyph(IconSettingsGear2, 'SettingsIcon');

/** A workspace row. The CLOSED folder, matching the top bar's `FolderIcon`. */
export const Folder2Icon = glyph(IconFolder2, 'Folder2Icon');

/** The trailing `add` control on the `Workspaces` and `Archive` headers. */
export const FolderAddIcon = glyph(IconFolderAddLeft, 'FolderAddIcon');

/** The collapse caret on a section header, and on the archive disclosure. */
export const ChevronDownIcon = glyph(IconChevronDownMedium, 'ChevronDownIcon');

/** `New Project`: the large plus, not `PlusIcon` (`IconPlusMedium`); they are different drawings. */
export const PlusLargeIcon = glyph(IconPlusLarge, 'PlusLargeIcon');

/** The canvas recenter pill (ONL-1979): four corner brackets. Not `IconTarget`: rings read as aiming at a point, and the gesture pulls a scattered set back into view. */
export const RecenterIcon = glyph(IconFocusSquare, 'RecenterIcon');

export const HelpIcon = glyph(IconCircleQuestionmark, 'HelpIcon');

/** The account menu's last row (ONL-2701). */
export const SignOutIcon = glyph(IconArrowRightSquare, 'SignOutIcon');

// The icon rail's two panel views (ONL-2563): raw, so the rail's items set their
// own size and state ink as the canvas toolbar's do.
/** The two the mock draws, by its own import names. */
export const GlyphFiles = IconFiles;
export const FileGlyph = glyph(IconFiles, 'FileGlyph');
export const GlyphCode = IconCode;
/** The machine checklist's developer-tools row. `IconCodeBrackets`, not `GlyphCode`: `IconCode` frames the `</>` in the rounded square the helper row's terminal already uses (ONL-3111). */
export const CodeBracketsGlyph = IconCodeBrackets;

/** The collapsed inline chat's ball (ONL-2455): two sparkles, the prompt one press away. */
export const SparkleIcon = glyph(IconSparklesTwo2, 'SparkleIcon');
export const WarningTriangleIcon = glyph(IconExclamationTriangle, 'WarningTriangleIcon');
export const ExclamationCircleIcon = glyph(IconExclamationCircle, 'ExclamationCircleIcon');
export const ConsoleIcon = glyph(IconConsole, 'ConsoleIcon');
export const SubscriptionTickIcon = glyph(IconSubscriptionTick2, 'SubscriptionTickIcon');

// The Tips guide (ONL-2468): raw, so a row or a pill sets its own size.
export const GlyphTips = IconLightBulbSimple;
export const GlyphTipsPrompts = IconSparklesTwo;
export const GlyphTipsHotkeys = IconCmdBox;
export const GlyphOpenPrompt = IconArrowUpRight;
export const GlyphSearch = IconMagnifyingGlass;
export const GlyphTryPrompt = IconArrowRight;
export const GlyphBack = IconChevronLeftMedium;
/** One drawing per hotkey row, chosen against the canvas's own tool glyphs where one exists. */
export const HOTKEY_GLYPHS = {
  openTips: IconLightBulbSimple,
  hidePanels: IconSidebarSimpleLeftSquare,
  switchTab: IconBrowserTabs,
  select: IconCursor1,
  pan: IconHand5Finger,
  addBrowser: IconWindow2,
  addText: IconText1,
  addImage: IconImages3,
  design: IconSquareCursor,
  preview: IconPlay,
  undo: IconArrowUndoUp,
  redo: IconArrowRedoDown,
  duplicate: IconSquareBehindSquare1,
  front: IconSquareBehindSquare4,
  back: IconSquareBehindSquare2,
  zoomIn: IconZoomIn,
  zoomOut: IconZoomOut,
  fit: IconFullscreen1,
  selection: IconFocusSquare,
  actual: IconMagnifyingGlass,
  measure: IconRuler,
  scrollPage: IconMouseScrollDown,
  saveCode: IconCode,
} as const;
