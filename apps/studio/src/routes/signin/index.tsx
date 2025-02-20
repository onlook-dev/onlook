import { useAuthManager, useUserManager } from '@/components/Context';
import { Dunes } from '@/components/ui/dunes';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

enum SignInMethod {
    GITHUB = 'github',
    GOOGLE = 'google',
}

const SignIn = observer(() => {
    const authManager = useAuthManager();
    const userManager = useUserManager();
    const [lastSignInMethod, setLastSignInMethod] = useState<SignInMethod | null>(null);

    useEffect(() => {
        if (userManager.settings && userManager.settings.settings?.signInMethod) {
            setLastSignInMethod(userManager.settings.settings.signInMethod as SignInMethod);
        }
    }, [authManager.authenticated]);

    const handleLogin = (method: SignInMethod) => {
        authManager.signIn(method);
        userManager.settings.update({ signInMethod: method });
    };

    function openExternalLink(url: string) {
        invokeMainChannel(MainChannels.OPEN_EXTERNAL_WINDOW, url);
    }

    return (
        <div className="flex h-[calc(100vh-2.5rem)]">
            <div className="flex flex-col justify-between w-full h-full max-w-xl p-16 space-y-8 overflow-auto">
                <div className="flex items-center space-x-2">
                    <Icons.OnlookTextLogo viewBox="0 0 139 17" />
                </div>
                <div className="space-y-8">
                    <div className="space-y-2 uppercase rounded-full p-1 px-2 w-auto inline-block text-micro border-[0.5px] text-blue-400 border-blue-400">
                        <p>{'Alpha'}</p>
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-title1 leading-tight">
                            {lastSignInMethod ? 'Welcome back to Onlook' : 'Welcome to Onlook'}
                        </h1>
                        <p className="text-foreground-onlook text-regular">
                            {
                                ' Onlook is an open-source visual editor for React apps. Design directly in your live product.'
                            }
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
                            onClick={() => openExternalLink('https://onlook.com/privacy-policy')}
                            className="text-gray-300 hover:text-gray-50 underline transition-colors duration-200"
                        >
                            {'Privacy Policy'}
                        </button>
                        {' and '}
                        <button
                            onClick={() => openExternalLink('https://onlook.com/terms-of-service')}
                            className="text-gray-300 hover:text-gray-50 underline transition-colors duration-200"
                        >
                            {'Terms of Service'}
                        </button>
                    </p>
                </div>
                <div className="flex flex-row space-x-1 text-small text-gray-600">
                    <p> {`Version ${window.env.APP_VERSION}`}</p>
                </div>
            </div>
            <Dunes />
        </div>
    );
});

export default SignIn;
