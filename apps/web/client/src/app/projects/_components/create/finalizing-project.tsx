import { MotionConfig } from 'motion/react';

import { CardDescription } from '@onlook/ui/card';
import { CardTitle } from '@onlook/ui/card';
import { AnimatePresence } from 'motion/react';
import { motion } from 'motion/react';
import type { StepComponent } from '../with-step-props';
import { ProgressWithInterval } from '@onlook/ui/progress-with-interval';
import { useProjectCreation } from './project-creation-context';

const FinalizingProject: StepComponent = ({
    variant,
}: {
    variant: 'header' | 'content' | 'footer';
}) => {
    const { isFinalizing } = useProjectCreation();

    const renderHeader = () => {
        return isFinalizing ? (
            <>
                <CardTitle>{'Setting up project...'}</CardTitle>
                <CardDescription>{"We're setting up your project"}</CardDescription>
            </>
        ) : (
            <>
                <CardTitle>{'Project created successfully'}</CardTitle>
                <CardDescription>{'Your project is ready to use'}</CardDescription>
            </>
        );
    };

    const renderContent = () => (
        <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
            <AnimatePresence mode="popLayout">
                <motion.div
                    key="name"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full"
                >
                    {isFinalizing ? (
                        <ProgressWithInterval isLoading={isFinalizing ?? false} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <p>Project created successfully. Redirecting to project...</p>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </MotionConfig>
    );
    const renderFooter = () => <></>;
    switch (variant) {
        case 'header':
            return renderHeader();
        case 'content':
            return renderContent();
        case 'footer':
            return renderFooter();
    }
};

FinalizingProject.Header = () => <FinalizingProject variant="header" />;
FinalizingProject.Content = () => <FinalizingProject variant="content" />;
FinalizingProject.Footer = () => <FinalizingProject variant="footer" />;

FinalizingProject.Header.displayName = 'FinalizingProject.Header';
FinalizingProject.Content.displayName = 'FinalizingProject.Content';
FinalizingProject.Footer.displayName = 'FinalizingProject.Footer';

export { FinalizingProject };
