import Thumbnail from '@/assets/new-yt-thumbnail.png';
import { Button } from '@/components/ui/button';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { StepComponent } from '../withStepProps';
import { Icons } from '@/components/icons';

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
            <CardDescription>
                {'Copy this command and paste it in your command line'}
            </CardDescription>
        </>
    );

    const renderContent = () => (
        <div className="flex flex-col gap-4 w-full">
            <div className="border-[0.5px] bg-background-onlook/50 rounded-lg p-4 flex flex-row gap-2 items-center relative">
                <code className="text-sm overflow-scroll text-nowrap pr-20">{codeContent}</code>
                <div className="absolute right-0 top-0 bottom-0 w-[230px] bg-gradient-to-r from-transparent to-background-onlook pointer-events-none rounded-r-md" />
                <div className="absolute right-0 top-0 bottom-0 w-[130px] bg-gradient-to-r from-transparent to-background-onlook pointer-events-none rounded-r-md" />
                <Button
                    className="ml-auto flex-initial min-w-10 z-10 bg-foreground-onlook/85 text-background-onlook hover:bg-background-hover hover:text-foreground-hover dark:text-teal-100 dark:bg-teal-900 dark:hover:bg-teal-700 border-[0.5px] dark:border-teal-800 dark:hover:border-teal-500"
                    onClick={() => {
                        copyToClipboard(codeContent);
                        setIsRunning(true);
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
                            {isRunning ? <Icons.Check /> : <Icons.ClipboardCopy />}
                        </motion.span>
                    </AnimatePresence>
                </Button>
            </div>
            <div className="bg-gray-800 text-white p-2 rounded-lg flex items-center space-x-4 w-full border border-gray-700">
                <img
                    src={Thumbnail}
                    alt="Thumbnail of a React tutorial video"
                    className="w-24 h-16 rounded-md"
                />
                <div className="flex-1">
                    <p className="text-base font-semibold">{"Don't know how to run a command?"}</p>
                    <a
                        href="https://youtu.be/RjFBUkVfy1E?t=45&feature=shared"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-400 hover:text-white transition-colors flex items-center"
                    >
                        {' Watch this tutorial on YouTube'}
                        <Icons.ExternalLink className="ml-1 w-4 h-4" />
                    </a>
                </div>
            </div>
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
