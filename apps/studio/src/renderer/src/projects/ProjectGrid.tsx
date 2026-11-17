import { useState } from 'react';
import { ContextMenu } from '@astryxdesign/core/ContextMenu';
import { Grid } from '@astryxdesign/core/Grid';
import { Stack } from '@astryxdesign/core/Stack';
import { CELL, GUTTER, RESPONSIVE_COLUMNS } from './gridTrack.js';
import { ProjectCard, type ProjectCardProps } from './ProjectCard.js';
import { MENU_SURFACE } from '../menu/surface.js';
import { ProjectMenuItems } from './menus.js';

export interface ProjectGridItem extends ProjectCardProps {
  id: string;
  menu?: React.ReactNode;
}

export interface ProjectGridProps {
  projects: ProjectGridItem[];
}

export function ProjectGrid({ projects }: ProjectGridProps): React.JSX.Element {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  /* Separate from hover because the chip needs both: opening the menu moves the
     pointer onto it, so hover drops and the chip vanishes, leaving the panel
     anchored to nothing. */
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <Grid columns={RESPONSIVE_COLUMNS} gap={GUTTER} data-testid="project-grid">
      {projects.map(({ id, menu, ...card }) => (
        /* `ContextMenu` owns the list and has no imperative handle, so the `⋯`
           re-dispatches a `contextmenu` from its own position below rather than
           mounting a second implementation of the same list. */
        <ContextMenu
          key={id}
          menuContent={menu ?? <ProjectMenuItems />}
          menuWidth={200}
          style={MENU_SURFACE}
          onOpenChange={(isOpen) =>
            setOpenMenuId((current) => (isOpen ? id : current === id ? null : current))
          }
        >
          <Stack
            style={CELL}
            /* The one per-project DOM handle: the testids inside repeat on every
               card, so a driver scopes through this to ask about ONE. */
            data-project-id={id}
            onMouseEnter={() => setHoveredId(id)}
            onMouseLeave={() => setHoveredId((current) => (current === id ? null : current))}
          >
            <ProjectCard
              {...card}
              showMenu={hoveredId === id || openMenuId === id}
              isHovered={hoveredId === id || openMenuId === id}
              onMenu={(event) => {
                event.currentTarget.dispatchEvent(
                  new MouseEvent('contextmenu', {
                    bubbles: true,
                    clientX: event.clientX,
                    clientY: event.clientY,
                  }),
                );
              }}
            />
          </Stack>
        </ContextMenu>
      ))}
    </Grid>
  );
}
