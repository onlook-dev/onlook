import { transKeys } from '@/i18n/keys';
import { Routes } from '@/utils/constants';
import type { Project } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { redirect } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import type { ComponentProps } from 'react';
import { useState } from 'react';

const ButtonMotion = motion.create(Button);

interface EditAppButtonProps extends ComponentProps<typeof ButtonMotion> {
    project: Project;
}

export const EditAppButton = observer(({ project, onClick, ...props }: EditAppButtonProps) => {
    const t = useTranslations();
    const posthog = usePostHog();
    const [isLoading, setIsLoading] = useState(false);

    const selectProject = (project: Project) => {
        setIsLoading(true);
        posthog.capture('open_project', { id: project.id });
        redirect(`${Routes.PROJECT}/${project.id}`);
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (onClick) {
            onClick(e);
        }
        selectProject(project);
    };

    return (
        <ButtonMotion
            size="default"
            className="gap-2 bg-white text-black border border-gray-300 w-auto hover:bg-gray-100 cursor-pointer"
            {...props}

            // Prevent consumer from overriding these props
            onClick={handleClick}
            disabled={isLoading}
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
