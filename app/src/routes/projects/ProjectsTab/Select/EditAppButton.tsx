import { useProjectsManager } from '@/components/Context';
import { Button } from '@/components/ui/button';
import { sendAnalytics } from '@/lib/utils';
import { Pencil2Icon } from '@radix-ui/react-icons';
import { motion } from 'framer-motion';
import { ComponentProps } from 'react';
import { Project } from '/common/models/project';

const ButtonMotion = motion(Button);

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
            <Pencil2Icon />
            <p> Edit App </p>
        </ButtonMotion>
    );
}
