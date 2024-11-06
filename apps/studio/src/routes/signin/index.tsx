import dunesDark from '@/assets/dunes-login-dark.png';
import dunesLight from '@/assets/dunes-login-light.png';
import { useAuthManager } from '@/components/Context';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import type { UserSettings } from '@onlook/models/settings';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

enum SignInMethod {
    GITHUB = 'github',
    GOOGLE = 'google',
}

enum SignInStep {
    LOGIN,
    REQUIREMENTS
}

const variants = {
    initial: (direction: number) => {
        return { x: `${10 * direction}%`, opacity: 0 };
    },
    active: { x: '0%', opacity: 1 },
    exit: (direction: number) => {
        return { x: `${10 * direction}%`, opacity: 0 };
    },
};

const SignIn = observer(() => {
    const authManager = useAuthManager();
    const [lastSignInMethod, setLastSignInMethod] = useState<SignInMethod | null>(null);
    const [currentStep, setCurrentStep] = useState<SignInStep>(SignInStep.LOGIN);
    const [hasRequirements, setHasRequirements] = useState<{
        git: boolean;
        node: boolean;
    }>({ git: false, node: false });
    const [isChecking, setIsChecking] = useState(false);
    const [direction, setDirection] = useState(0);

    useEffect(() => {
        let mounted = true;

        // Get last sign-in method
        invokeMainChannel(MainChannels.GET_USER_SETTINGS).then((res) => {
            if (!mounted) {return;}
            const settings: UserSettings = res as UserSettings;
            if (settings && settings.signInMethod) {
                setLastSignInMethod(settings.signInMethod as SignInMethod);
            }
        });

        // Check requirements on mount
        checkRequirements();

        return () => {
            mounted = false;
        };
    }, []);

    const checkRequirements = async () => {
        setIsChecking(true);
        try {
            const requirements = await invokeMainChannel(MainChannels.CHECK_REQUIREMENTS) as { git: boolean; node: boolean };
            setHasRequirements(requirements);
            return requirements;
        } finally {
            setIsChecking(false);
        }
    };

    const handleLogin = async (method: SignInMethod) => {
        // // Force requirements screen by mocking failed checks
            setHasRequirements({ git: false, node: false });
            setDirection(1);
            setCurrentStep(SignInStep.REQUIREMENTS);
            return;
        
        // Original code below...
        const requirements = await checkRequirements();
        
        if (!requirements.git || !requirements.node) {
            setDirection(1);
            setCurrentStep(SignInStep.REQUIREMENTS);
            return;
        }
        
        authManager.signIn(method);
        invokeMainChannel(MainChannels.UPDATE_USER_SETTINGS, { signInMethod: method });
    };

    const handleContinue = () => {
        if (hasRequirements.git && hasRequirements.node) {
            if (lastSignInMethod) {
                authManager.signIn(lastSignInMethod);
                invokeMainChannel(MainChannels.UPDATE_USER_SETTINGS, { signInMethod: lastSignInMethod });
            }
        }
    };

    const handleBack = () => {
        setDirection(-1);
        setCurrentStep(SignInStep.LOGIN);
    };

    function openExternalLink(url: string) {
        invokeMainChannel(MainChannels.OPEN_EXTERNAL_WINDOW, url);
    }

    return (
        <div className="flex h-[calc(100vh-2.5rem)]">
            {/* Static logo */}
            <div className="flex flex-col justify-between w-full h-full max-w-xl p-16 space-y-8 overflow-auto">
                <div className="flex items-center space-x-2">
                    <Icons.OnlookTextLogo viewBox="0 0 139 17" />
                </div>

                {/* Animated content */}
                <AnimatePresence mode="wait" initial={false}>
                    {currentStep === SignInStep.LOGIN ? (
                        <motion.div
                            key="login"
                            initial="initial"
                            animate="active"
                            exit="exit"
                            variants={variants}
                            custom={direction}
                            transition={{ duration: 0.5, type: 'spring', bounce: 0 }}
                            className="space-y-8"
                        >
                            {/* Login content without the logo */}
                            <div className="space-y-4">
                                <h1 className="text-title1 leading-tight">
                                    {lastSignInMethod ? 'Welcome back to Onlook' : 'Welcome to Onlook'}
                                </h1>
                                <p className="text-foreground-onlook text-regular">
                                    {'Onlook is an open-source visual editor for React apps. Design directly in your live product.'}
                                </p>
                            </div>
                            <div className="space-x-2 flex flex-row">
                                <div className="flex flex-col items-center w-full">
                                    <Button
                                        variant="outline"
                                        className={`w-full text-active text-small ${lastSignInMethod === SignInMethod.GITHUB ? 'bg-teal-100 dark:bg-teal-950 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-100 text-small hover:bg-teal-200/50 dark:hover:bg-teal-800 hover:border-teal-500/70 dark:hover:border-teal-500' : 'bg-background-onlook'}`}
                                        onClick={() => handleLogin(SignInMethod.GITHUB)}
                                    >
                                        <Icons.GitHubLogo className="w-4 h-4 mr-2" /> {'Login with GitHub'}
                                    </Button>
                                    {lastSignInMethod === SignInMethod.GITHUB && (
                                        <p className="text-teal-500 text-small mt-1">
                                            {'You used this last time'}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col items-center w-full">
                                    <Button
                                        variant="outline"
                                        className={`w-full text-active text-small ${lastSignInMethod === SignInMethod.GOOGLE ? 'bg-teal-100 dark:bg-teal-950 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-100 text-small hover:bg-teal-200/50 dark:hover:bg-teal-800 hover:border-teal-500/70 dark:hover:border-teal-500' : 'bg-background-onlook'}`}
                                        onClick={() => handleLogin(SignInMethod.GOOGLE)}
                                    >
                                        <Icons.GoogleLogo viewBox="0 0 24 24" className="w-4 h-4 mr-2" />
                                        {'Login with Google'}
                                    </Button>
                                    {lastSignInMethod === SignInMethod.GOOGLE && (
                                        <p className="text-teal-500 text-small mt-1">
                                            {'You used this last time'}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <p className="text-small text-foreground-onlook">
                                {'By signing up, you agree to our '}
                                <button
                                    onClick={() => openExternalLink('https://onlook.dev/privacy-policy')}
                                    className="text-gray-300 hover:text-gray-50 underline transition-colors duration-200"
                                >
                                    {'Privacy Policy'}
                                </button>
                                {' and '}
                                <button
                                    onClick={() => openExternalLink('https://onlook.dev/terms-of-service')}
                                    className="text-gray-300 hover:text-gray-50 underline transition-colors duration-200"
                                >
                                    {'Terms of Service'}
                                </button>
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="requirements"
                            initial="initial"
                            animate="active"
                            exit="exit"
                            variants={variants}
                            custom={direction}
                            transition={{ duration: 0.5, type: 'spring', bounce: 0 }}
                            className="space-y-8"
                        >
                            {/* Requirements content without the logo */}
                            <div className="space-y-4">
                                <h2 className="text-title2 leading-tight">
                                    Let's make sure you can use Onlook
                                </h2>
                                <p className="text-foreground-onlook text-regular">
                                    These are required so that you can use Onlook with sites and apps. These are very standard requirements for coding.
                                </p>
                            </div>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-background-secondary rounded-lg">
                                            <Icons.Cube className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-regularPlus">Node.js Runtime</h3>
                                            <p className="text-small text-foreground-onlook">
                                                Project execution environment
                                            </p>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="outline"
                                        disabled={hasRequirements.node}
                                        onClick={() => openExternalLink('https://nodejs.org')}
                                        className="bg-background-onlook"
                                    >
                                        {hasRequirements.node ? 'Installed' : 'Install'}
                                    </Button>
                                </div>

                                <div className="flex justify-between items-center">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-background-secondary rounded-lg">
                                            <Icons.GitHubLogo className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-regularPlus">Git</h3>
                                            <p className="text-small text-foreground-onlook">
                                                Version control system
                                            </p>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="outline"
                                        disabled={hasRequirements.git}
                                        onClick={() => openExternalLink('https://git-scm.com')}
                                        className="bg-background-onlook"
                                    >
                                        {hasRequirements.git ? 'Installed' : 'Install'}
                                    </Button>
                                </div>
                            </div>
                            <div className="flex flex-row justify-between w-full">
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                >
                                    Back
                                </Button>
                                <Button
                                    variant="outline"
                                    disabled={!hasRequirements.git || !hasRequirements.node}
                                    onClick={handleContinue}
                                >
                                    Continue
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex flex-row space-x-1 text-small text-gray-600">
                    <p>{`Version ${window.env.APP_VERSION}`}</p>
                </div>
            </div>
            <div className="hidden w-full lg:block md:block m-6">
                <img
                    className="w-full h-full object-cover rounded-xl hidden dark:flex"
                    src={dunesDark}
                    alt="Onlook dunes dark"
                />
                <img
                    className="w-full h-full object-cover rounded-xl flex dark:hidden"
                    src={dunesLight}
                    alt="Onlook dunes light"
                />
            </div>
        </div>
    );
});

export default SignIn;
