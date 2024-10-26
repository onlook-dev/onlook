import dunesDark from '@/assets/dunes-login-dark.png';
import dunesLight from '@/assets/dunes-login-light.png';
import { useAuthManager } from '@/components/Context';
import { Button } from '@/components/ui/button';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { MainChannels } from '/common/constants';
import { UserSettings } from '/common/models/settings';
import { Icons } from '@/components/icons';

enum SignInMethod {
    GITHUB = 'github',
    GOOGLE = 'google',
}

const SignIn = observer(() => {
    const authManager = useAuthManager();
    const [lastSignInMethod, setLastSignInMethod] = useState<SignInMethod | null>(null);

    useEffect(() => {
        window.api.invoke(MainChannels.GET_USER_SETTINGS).then((res) => {
            const settings: UserSettings = res as UserSettings;
            if (settings && settings.signInMethod) {
                setLastSignInMethod(settings.signInMethod as SignInMethod);
            }
        });
    }, [authManager.authenticated]);

    const handleLogin = (method: SignInMethod) => {
        authManager.signIn(method);
        window.api.invoke(MainChannels.UPDATE_USER_SETTINGS, { signInMethod: method });
    };

    function openExternalLink(url: string) {
        window.api.invoke(MainChannels.OPEN_EXTERNAL_WINDOW, url);
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
                </div>
                <div className="flex flex-row space-x-1 text-small text-gray-600">
                    <p> {`Version ${window.env.APP_VERSION}`}</p>
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
