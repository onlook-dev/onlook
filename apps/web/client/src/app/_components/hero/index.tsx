'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { vujahdayScript } from '../../fonts';
import { Create } from './create';
import { CreateError } from './create-error';
import { UnicornBackground } from './unicorn-background';
import { HighDemand } from './high-demand';
import { Icons } from '@onlook/ui/icons/index';
import { useAuthContext } from '../../auth/auth-context';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { Routes } from '@/utils/constants';
import { SandboxTemplates, Templates } from '@onlook/constants';
import { toast } from 'sonner';

export function Hero() {
    const [cardKey, setCardKey] = useState(0);
    const { setIsAuthModalOpen } = useAuthContext();
    const router = useRouter();
    const { data: user } = api.user.get.useQuery();
    const { mutateAsync: forkSandbox } = api.sandbox.fork.useMutation();
    const { mutateAsync: createProject } = api.project.create.useMutation();

    const handleStartBlankProject = async () => {
        if (!user?.id) {
            // Store the return URL and open auth modal
            localStorage.setItem('returnUrl', window.location.pathname);
            setIsAuthModalOpen(true);
            return;
        }

        try {
            // Create a blank project using the BLANK template
            const { sandboxId, previewUrl } = await forkSandbox({
                sandbox: SandboxTemplates[Templates.BLANK],
                config: {
                    title: `Blank project - ${user.id}`,
                    tags: ['blank', user.id],
                },
            });

            const newProject = await createProject({
                project: {
                    name: 'New Project',
                    sandboxId,
                    sandboxUrl: previewUrl,
                    description: 'Your new blank project',
                },
                userId: user.id,
            });

            if (newProject) {
                router.push(`${Routes.PROJECT}/${newProject.id}`);
            }
        } catch (error) {
            console.error('Error creating blank project:', error);
            toast.error('Failed to create project', {
                description: error instanceof Error ? error.message : String(error),
            });
        }
    };

    const handleImportProject = () => {
        if (!user?.id) {
            // Store the return URL and open auth modal
            localStorage.setItem('returnUrl', Routes.IMPORT_PROJECT);
            setIsAuthModalOpen(true);
            return;
        }

        // Navigate to import project flow
        router.push(Routes.IMPORT_PROJECT);
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-12 p-8 text-lg text-center relative">
            <UnicornBackground />
            <div className="flex flex-col gap-3 items-center relative z-20 pt-4 pb-2">
                <motion.h1
                    className="text-6xl font-light leading-tight text-center !leading-[0.9]"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    Cursor for<br />
                    <span className={`italic font-normal ${vujahdayScript.className} text-[4.6rem] ml-1 leading-[1.0]`}>Designers</span>
                </motion.h1>
                <motion.p
                    className="text-lg text-foreground-secondary max-w-xl text-center mt-2"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    Onlook is a next-generation visual code editor<br />
                    that lets designers and product managers craft<br />
                    web experiences with AI
                </motion.p>
                <HighDemand />
                <CreateError />
            </div>
            <div className="sm:flex hidden flex-col gap-4 items-center relative z-20">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                    onAnimationComplete={() => {
                        setCardKey(prev => prev + 1);
                    }}
                >
                    <Create cardKey={cardKey} />
                </motion.div>
                <motion.div
                    className="flex gap-12 mt-4"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    <button 
                        onClick={handleStartBlankProject}
                        className="text-sm text-foreground-secondary hover:text-foreground transition-colors duration-200 flex items-center gap-2"
                    >
                        <Icons.File className="w-4 h-4" />
                        Start a Blank Project
                    </button>
                    <button 
                        onClick={handleImportProject}
                        className="text-sm text-foreground-secondary hover:text-foreground transition-colors duration-200 flex items-center gap-2"
                    >
                        <Icons.Upload className="w-4 h-4" />
                        Import a Next.js App
                    </button>
                </motion.div>
                <motion.div
                    className="text-center text-xs text-foreground-secondary mt-2 opacity-80"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 1, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    No Credit Card Required &bull; Get a Site in Seconds
                </motion.div>
                
            </div>
            <div className="sm:hidden text-balance flex flex-col gap-4 items-center relative z-20 px-10">
                Onlook isn't ready for Mobile – Please open on a larger screen
            </div>
        </div>
    );
}
