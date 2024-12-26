import { useProjectsManager } from '@/components/Context';
import { sendAnalytics } from '@/lib/utils';
import type { Project } from '@onlook/models/projects';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { motion } from 'motion/react';
import type { ComponentProps } from 'react';

const ButtonMotion = motion.create(Button);

interface EditAppButtonProps extends ComponentProps<typeof ButtonMotion> {
    project: Project;
}

export default function EditAppButton({ project, ...props }: EditAppButtonProps) {
    const projectsManager = useProjectsManager();

    const selectProject = (project: Project) => {
        projectsManager.project = project;
        sendAnalytics('open project', { id: project.id, url: project.url });
    };
    return (
        <ButtonMotion
            size="default"
            variant={'outline'}
            className="gap-2 bg-background-active border-[0.5px] border-border-active w-full lg:w-auto"
            onClick={() => selectProject(project)}
            {...props}
        >
            <Icons.PencilPaper />
            <p> Edit App </p>
        </ButtonMotion>
    );
}
