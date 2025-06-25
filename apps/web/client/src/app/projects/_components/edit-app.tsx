import { transKeys } from '@/i18n/keys';
import { sendAnalytics } from '@/utils/analytics';
import { Routes } from '@/utils/constants';
import type { Project } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { redirect } from 'next/navigation';
import type { ComponentProps } from 'react';
import { useState } from 'react';

const ButtonMotion = motion.create(Button);

interface EditAppButtonProps extends ComponentProps<typeof ButtonMotion> {
    project: Project;
}

export const EditAppButton = observer(({ project, ...props }: EditAppButtonProps) => {
    const t = useTranslations();
    const [isLoading, setIsLoading] = useState(false);

    const selectProject = (project: Project) => {
        setIsLoading(true);
        sendAnalytics('open project', { id: project.id });
        redirect(`${Routes.PROJECT}/${project.id}`);
    };

    return (
        <ButtonMotion
            size="default"
            variant={'outline'}
            className="gap-2 bg-background-active border-[0.5px] border-border-active w-auto hover:bg-background-onlook cursor-pointer"
            onClick={() => selectProject(project)}
            disabled={isLoading}
            {...props}
        >
            {isLoading ? (
                <Icons.LoadingSpinner className="w-4 h-4 animate-spin" />
            ) : (
                <Icons.PencilPaper />
            )}
            <p>{t(transKeys.projects.actions.editApp)}</p>
        </ButtonMotion>
    );
});
