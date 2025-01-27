import { useProjectsManager } from '@/components/Context';
import { CreateState } from '@/lib/projects/create';
import { Button } from '@onlook/ui/button';
import { CardContent, CardHeader } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { MotionCard } from '@onlook/ui/motion-card';
import { Progress } from '@onlook/ui/progress';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { motion, MotionConfig } from 'motion/react';
import useResizeObserver from 'use-resize-observer';

export const CreateLoadingCard = observer(() => {
    const projectsManager = useProjectsManager();
    const { ref: diffRef, height: diffHeight } = useResizeObserver();

    return (
        <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
            <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ height: diffHeight, opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={cn('w-[600px] mb-32 backdrop-blur-md bg-background/30 overflow-hidden')}
            >
                <motion.div ref={diffRef} layout="position" className="flex flex-col">
                    <CardHeader>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-2xl text-foreground-primary"
                        >
                            Setting up your new Onlook app...
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-sm text-foreground-secondary"
                        >
                            {projectsManager.create.message || 'This may take a few seconds'}
                        </motion.p>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-3 rounded p-0 transition-colors duration-200 cursor-text">
                            <Progress value={projectsManager.create.progress} className="w-full" />
                            <div className="flex flex-row w-full justify-between m-2">
                                <Button
                                    variant="outline"
                                    className="text-foreground-tertiary"
                                    onClick={() =>
                                        (projectsManager.create.state = CreateState.PROMPT)
                                    }
                                >
                                    <Icons.CircleBackslash className="w-4 h-4 mr-2" />
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </motion.div>
            </MotionCard>
        </MotionConfig>
    );
});
