import Thumbnail from '@/assets/new-yt-thumbnail.png';
import { Icons } from '@onlook/ui/icons';
import { Button } from '@onlook/ui/button';
import { CardDescription, CardTitle } from '@onlook/ui/card';
import { toast } from '@onlook/ui/use-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { StepComponent } from '../withStepProps';

const NewRunProject: StepComponent = ({ props, variant }) => {
    const { projectData, setProjectData, nextStep } = props;
    const [isRunning, setIsRunning] = useState<boolean>(false);

    const platformCommand = process.platform === 'win32' ? 'cd /d' : 'cd';
    const codeContent = `${platformCommand} ${projectData.folderPath} && npm run dev`;

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
            <CardDescription>{'Copy this command and paste it in your Terminal'}</CardDescription>
        </>
    );

    const renderContent = () => (
        <div className="flex flex-col gap-4 w-full">
            <div className="border-[0.5px] bg-background-onlook/50 rounded-lg p-4 flex flex-row gap-2 items-center relative">
                <code className="text-sm overflow-scroll text-nowrap pr-20 select-all cursor-text [&::selection]:text-teal-500 [&::selection]:bg-teal-500/20">
                    {codeContent}
                </code>
                <div className="absolute right-0 top-0 bottom-0 w-[230px] bg-gradient-to-r from-transparent to-background-onlook pointer-events-none rounded-r-md" />
                <div className="absolute right-0 top-0 bottom-0 w-[130px] bg-gradient-to-r from-transparent to-background-onlook pointer-events-none rounded-r-md" />
                <Button
                    className="ml-auto flex-initial w-fit z-10 bg-foreground-onlook/85 text-background-onlook hover:bg-teal-500 hover:border-teal-200 hover:text-teal-100 dark:text-teal-100 dark:bg-teal-900 dark:hover:bg-teal-700 border-[0.5px] dark:border-teal-800 dark:hover:border-teal-500 px-10"
                    onClick={() => {
                        copyToClipboard(codeContent);
                        setIsRunning(true);
                        setProjectData({ ...projectData, hasCopied: true });
                        toast({
                            title: 'Copied to clipboard',
                            description: <code>{codeContent}</code>,
                        });
                        setTimeout(() => setIsRunning(false), 2000);
                    }}
                    variant={'secondary'}
                    size={'lg'}
                >
                    <div className="flex items-center justify-center gap-2 w-6">
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                                key={isRunning ? 'checkmark' : 'copy'}
                                variants={iconVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.1 }}
                            >
                                {isRunning ? <Icons.Check /> : <Icons.ClipboardCopy />}
                            </motion.span>
                        </AnimatePresence>
                        <span className="w-[50px]">{isRunning ? 'Copied' : 'Copy'}</span>
                    </div>
                </Button>
            </div>
            <a
                href="https://youtu.be/RjFBUkVfy1E?t=45&feature=shared"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-gray-800 text-white p-2 rounded-lg flex items-center space-x-4 w-full border border-gray-700 hover:shadow-lg hover:shadow-gray-900/50 transition-all hover:scale-[1.01]"
            >
                <img
                    src={Thumbnail}
                    alt="Thumbnail of a React tutorial video"
                    className="w-24 h-16 rounded-md"
                />
                <div className="flex-1 group-hover:text-active">
                    <p className="text-base font-semibold">{"Don't know how to run a command?"}</p>
                    <span className="text-small text-gray-200 flex items-center">
                        {' Watch this tutorial on YouTube'}
                        <Icons.ExternalLink className="ml-1 w-4 h-4" />
                    </span>
                </div>
            </a>
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
NewRunProject.Header.displayName = 'NewRunProject.Header';
NewRunProject.Content.displayName = 'NewRunProject.Content';
NewRunProject.Footer.displayName = 'NewRunProject.Footer';

export { NewRunProject };
