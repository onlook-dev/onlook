import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { CheckIcon, ClipboardCopyIcon } from '@radix-ui/react-icons';
import { AnimatePresence, motion } from 'framer-motion';
import { StepProps } from '..';
import { StepComponent } from '../withStepProps';
import { CardTitle, CardDescription } from '@/components/ui/card';

const NewRunProject: StepComponent = ({ props, variant }) => {
    const { projectData, setProjectData, nextStep } = props;
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [hasCopied, setHasCopied] = useState<boolean>(false);
    const codeContent = `cd ${projectData.folderPath} && npm run dev`;

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
    }

    const iconVariants = {
        initial: { scale: 0.5, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0.5, opacity: 0 },
    };

    const renderHeader = () => (
        <>
            <CardTitle>{'Run your project'}</CardTitle>
            <CardDescription>
                {'Copy this command and paste it in your command line'}
            </CardDescription>
        </>
    );

    const renderContent = () => (
        <div className="border-[0.5px] bg-background-onlook/50 w-full rounded-lg p-4 flex flex-row gap-2 items-center relative">
            <code className="text-sm overflow-scroll text-nowrap pr-20">{codeContent}</code>
            <div className="absolute right-0 top-0 bottom-0 w-[230px] bg-gradient-to-r from-transparent to-background-onlook pointer-events-none rounded-r-md" />
            <div className="absolute right-0 top-0 bottom-0 w-[130px] bg-gradient-to-r from-transparent to-background-onlook pointer-events-none rounded-r-md" />
            <Button
                className="ml-auto flex-initial min-w-10 z-10 bg-foreground-onlook/85 text-background-onlook hover:bg-background-hover hover:text-foreground-hover dark:text-teal-100 dark:bg-teal-900 dark:hover:bg-teal-700 border-[0.5px] dark:border-teal-800 dark:hover:border-teal-500"
                onClick={() => {
                    copyToClipboard(codeContent);
                    setIsRunning(true);
                    setHasCopied(true);
                    setProjectData({ ...projectData, hasCopied: true });
                    toast({ title: 'Copied to clipboard' });
                    setTimeout(() => setIsRunning(false), 2000);
                }}
                variant={'secondary'}
                size={'icon'}
            >
                <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                        key={isRunning ? 'checkmark' : 'copy'}
                        variants={iconVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.1 }}
                    >
                        {isRunning ? <CheckIcon /> : <ClipboardCopyIcon />}
                    </motion.span>
                </AnimatePresence>
            </Button>
        </div>
    );

    const renderFooter = () => (
        <Button
            disabled={!projectData.hasCopied}
            type="button"
            onClick={nextStep}
            variant="outline"
        >
            Complete Setup
        </Button>
    );

    switch (variant) {
        case 'header':
            return renderHeader();
        case 'content':
            return renderContent();
        case 'footer':
            return renderFooter();
    }
};

NewRunProject.Header = (props) => <NewRunProject props={props} variant="header" />;
NewRunProject.Content = (props) => <NewRunProject props={props} variant="content" />;
NewRunProject.Footer = (props) => <NewRunProject props={props} variant="footer" />;

export { NewRunProject };
