import { useProjectsManager } from '@/components/Context';
import { sendAnalytics } from '@/lib/utils';
import type { Project } from '@onlook/models/projects';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

const ButtonMotion = motion.create(Button);

interface EditAppButtonProps extends ComponentProps<typeof ButtonMotion> {
    project: Project;
}

export const EditAppButton = observer(({ project, ...props }: EditAppButtonProps) => {
    const { t } = useTranslation();
    const projectsManager = useProjectsManager();

    const selectProject = (project: Project) => {
        projectsManager.project = project;
        projectsManager.runner?.start();
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
            <p>{t('projects.actions.editApp')}</p>
        </ButtonMotion>
    );
});
