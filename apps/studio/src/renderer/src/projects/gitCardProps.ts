import type { GitPillDefaults, GitSnapshotRow } from '@studio/events';
import { cardStateFor, derivePillState, restOf } from '@studio/git-ui/derive';
import { prOf } from '@studio/git-ui/state';
import type { ProjectCardProps } from './ProjectCard.js';

type GitCardProps = Pick<ProjectCardProps, 'gitState' | 'gitPill'>;

export function gitCardPropsFor(
  row: GitSnapshotRow | undefined,
  defaults: GitPillDefaults,
  isReceded: boolean,
): GitCardProps {
  if (isReceded || row === undefined) return {};
  const pillState = derivePillState(row, defaults);
  const state = cardStateFor(pillState);
  const pill = restOf(pillState);
  return {
    ...(state === 'none' ? {} : { gitState: state }),
    ...(prOf(pill) === undefined ? {} : { gitPill: pill }),
  };
}
