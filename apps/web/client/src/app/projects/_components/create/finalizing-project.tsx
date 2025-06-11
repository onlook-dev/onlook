import { MotionConfig } from 'motion/react';

import { CardDescription } from '@onlook/ui/card';
import { CardTitle } from '@onlook/ui/card';
import { AnimatePresence } from 'motion/react';
import type { StepProps } from '../../constants';
import { motion } from 'motion/react';
import type { StepComponent } from '../with-step-props';
import { ProgressWithInterval } from '@onlook/ui/progress-with-interval';

const FinalizingProject: StepComponent = ({
    props,
    variant,
}: {
    props: StepProps;
    variant: 'header' | 'content' | 'footer';
}) => {
    const { isFinalizing } = props;

    const renderHeader = () => {
            return (
                isFinalizing ?
                <>
                    <CardTitle>{'Setting up project...'}</CardTitle>
                    <CardDescription>
                        {'We’re setting up your project'}
                    </CardDescription>
                </>
                :
                <>
                    <CardTitle>{'Project created successfully'}</CardTitle>
                    <CardDescription>
                        {'Your project is ready to use'}
                    </CardDescription>
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
                    <ProgressWithInterval isLoading={isFinalizing ?? false} onComplete={() => {
                        console.log('progress complete');
                    }} />

                </motion.div>
            </AnimatePresence>
        </MotionConfig>
    );
    const renderFooter = () => <></>
    switch (variant) {
        case 'header':
            return renderHeader();
        case 'content':
            return renderContent();
        case 'footer':
            return renderFooter();
    }
};

FinalizingProject.Header = (props: StepProps) => <FinalizingProject props={props} variant="header" />;
FinalizingProject.Content = (props: StepProps) => <FinalizingProject props={props} variant="content" />;
FinalizingProject.Footer = (props: StepProps) => <FinalizingProject props={props} variant="footer" />;

FinalizingProject.Header.displayName = 'FinalizingProject.Header';
FinalizingProject.Content.displayName = 'FinalizingProject.Content';
FinalizingProject.Footer.displayName = 'FinalizingProject.Footer';

export { FinalizingProject };
