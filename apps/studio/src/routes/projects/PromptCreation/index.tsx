import backgroundImageDark from '@/assets/dunes-create-dark.png';
import backgroundImageLight from '@/assets/dunes-create-light.png';
import { useTheme } from '@/components/ThemeProvider';
import { useEffect, useState } from 'react';
import useResizeObserver from 'use-resize-observer';
import { Icons } from '@onlook/ui/icons';
import { Button } from '@onlook/ui/button';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { MotionCard } from '@onlook/ui/motion-card';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';

export const PricingCard = ({ 
    plan, 
    price, 
    description, 
    features, 
    buttonText, 
    buttonProps,
    delay,
    isLoading
}: {
    plan: string;
    price: string;
    description: string;
    features: string[];
    buttonText: string;
    buttonProps: React.ButtonHTMLAttributes<HTMLButtonElement>;
    delay: number;
    isLoading?: boolean;
}) => (
    <MotionCard
        className="w-[360px]"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
    >
        <motion.div className="p-6 flex flex-col h-full">
            <div className="space-y-1">
                <h2 className="text-title2">{plan}</h2>
                <p className="text-foreground-onlook text-largePlus">{price}</p>
            </div>
            <div className="border-[0.5px] border-border-primary -mx-6 my-6" />
            <p className="text-foreground-primary text-title3 text-balance">
                {description}
            </p>
            <div className="border-[0.5px] border-border-primary -mx-6 my-6" />
            <div className="space-y-4 mb-6">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-foreground-secondary/80">
                        <Icons.Check className="w-5 h-5 text-foreground-secondary/80" />
                        <span>{feature}</span>
                    </div>
                ))}
            </div>
            <Button className="mt-auto w-full" {...buttonProps} disabled={isLoading || buttonProps.disabled}>
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <Icons.Shadow className="w-4 h-4 animate-spin" />
                        <span>Checking for payment...</span>
                    </div>
                ) : (
                    buttonText
                )}
            </Button>
        </motion.div>
    </MotionCard>
);

export const PromptCreation = () => {
    const { theme } = useTheme();
    const [backgroundImage, setBackgroundImage] = useState(backgroundImageLight);
    const { ref, height } = useResizeObserver();

    useEffect(() => {
        const determineBackgroundImage = () => {
            if (theme === 'dark') {
                return backgroundImageDark;
            } else if (theme === 'light') {
                return backgroundImageLight;
            } else if (theme === 'system') {
                return window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? backgroundImageDark
                    : backgroundImageLight;
            }
            return backgroundImageLight;
        };

        setBackgroundImage(determineBackgroundImage());
    }, [theme]);

    return (
        <div className="fixed inset-0">
            <div
                className="relative w-full h-full flex items-center justify-center"
                style={{
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="absolute inset-0 bg-background/50" />
                <div className="h-fit w-fit flex group fixed top-10 right-10">
                        <Button
                            variant="secondary"
                            className="w-fit h-fit flex flex-col gap-1 text-foreground-secondary hover:text-foreground-active backdrop-blur-md bg-background/30"
                            onClick={() =>
                                invokeMainChannel(MainChannels.OPEN_EXTERNAL_WINDOW, '/projects')
                            }
                        >
                            <Icons.CrossL className="w-4 h-4 cursor-pointer" />
                            <p className="text-microPlus">Close</p>
                        </Button>
                    </div>
                <div className="relative z-10">
                    <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
                        <motion.div className="flex flex-col items-center gap-3">
                            <motion.div 
                                className="flex flex-col gap-2 text-center mb-4"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 }}
                            >
                                <h1 className="text-title2 text-foreground-primary">Choose your plan</h1>
                            </motion.div>
                            <div className="flex gap-4">
                                <PricingCard 
                                    plan="Onlook Basic"
                                    price="Free"
                                    description="Prototype and experiment in code with ease."
                                    features={[
                                        "Visual code editor access",
                                        "Unlimited projects",
                                        "10 AI chat messages a day",
                                        "50 AI messages a month",
                                        "Limited to 1 screenshot per chat"
                                    ]}
                                    buttonText="Current Plan"
                                    buttonProps={{ disabled: true }}
                                    delay={0.1}
                                />
                                <PricingCard 
                                    plan="Onlook Pro"
                                    price="$25/month"
                                    description="Creativity – unconstrained. Build stunning sites with AI."
                                    features={[
                                        "Visual code editor access",
                                        "Unlimited projects",
                                        "Unlimited AI chat messages a day",
                                        "Unlimited monthly chats",
                                        "Multiple screenshots per chat",
                                        "1 free custom domain hosted with Onlook",
                                        "Priority support"
                                    ]}
                                    buttonText="Get Pro"
                                    buttonProps={{}}
                                    delay={0.2}
                                    isLoading={false}
                                />
                            </div>
                            <motion.div 
                                className="flex flex-col gap-2 text-center"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <p className="text-foreground-secondary/60 text-small text-balance">
                                    Unused chat messages don't rollover to the next month
                                </p>
                            </motion.div>
                        </motion.div>
                    </MotionConfig>
                </div>
            </div>
        </div>
    );
};

export default PromptCreation;
