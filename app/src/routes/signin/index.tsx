import dunes from '@/assets/dunes-login.png';
import google_logo from '@/assets/google_logo.svg';
import wordLogo from '@/assets/word-logo.svg';
import { useAuthManager } from '@/components/Context/Auth';
import { Button } from '@/components/ui/button';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

enum SignInMethod {
    GITHUB = 'github',
    GOOGLE = 'google',
}

const SignIn = observer(() => {
    const [lastSignInMethod, setLastSignInMethod] = useState<SignInMethod | null>(null);
    const authManager = useAuthManager();

    useEffect(() => {
        // Retrieve the last login method from localStorage
    }, []);

    const handleLogin = (method: SignInMethod) => {
        // Save the login method to localStorage
        // Implement actual login logic here
        authManager.signIn(method);
    };

    return (
        <div className="flex h-[calc(100vh-2.5rem)]">
            <div className="flex flex-col justify-between w-full h-full max-w-xl p-16 space-y-8 overflow-auto">
                <div className="flex items-center space-x-2">
                    <img className="w-1/4" src={wordLogo} alt="Onlook logo" />
                </div>
                <div className="space-y-8">
                    <div className="space-y-2 uppercase border-border rounded-full p-1 px-2 w-auto inline-block text-micro border-[0.5px] text-blue-500">
                        <p>Alpha</p>
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-title1">
                            {lastSignInMethod ? 'Welcome back to Onlook' : 'Welcome to Onlook'}
                        </h1>
                        <p className="text-text text-large">
                            Onlook is an open-source visual editor for React apps. Design directly
                            in your live product.
                        </p>
                    </div>
                    <div className="space-x-2 flex flex-row">
                        <div className="flex flex-col items-center w-full">
                            <Button
                                variant="outline"
                                className={`w-full text-active text-small ${lastSignInMethod === 'github' ? 'bg-teal-1000 border-teal-700 text-teal-100 text-small hover:bg-teal-800 hover:border-teal-500' : 'bg-bg'}`}
                                onClick={() => handleLogin(SignInMethod.GITHUB)}
                            >
                                <GitHubLogoIcon className="w-4 h-4 mr-2" /> Login with GitHub
                            </Button>
                            {lastSignInMethod === 'github' && (
                                <p className="text-teal-500 text-small mt-1">
                                    You used this last time
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col items-center w-full">
                            <Button
                                variant="outline"
                                className={`w-full text-active text-small ${lastSignInMethod === 'google' ? 'bg-teal-1000 border-teal-700 text-teal-100 text-small hover:bg-teal-800 hover:border-teal-500' : 'bg-bg'}`}
                                onClick={() => handleLogin(SignInMethod.GOOGLE)}
                            >
                                <img src={google_logo} className="w-4 h-4 mr-2" alt="Google logo" />{' '}
                                Login with Google
                            </Button>
                            {lastSignInMethod === 'google' && (
                                <p className="text-teal-500 text-small mt-1">
                                    You used this last time
                                </p>
                            )}
                        </div>
                    </div>
                    <p className="text-small text-text">
                        By signing up, you agree to our{' '}
                        <a href="#" className="underline">
                            Terms and Conditions
                        </a>{' '}
                        and{' '}
                        <a href="#" className="underline">
                            Privacy Policy
                        </a>
                    </p>
                </div>
                <div className="flex flex-row space-x-1 text-small text-gray-400">
                    <p>Version {window.env.APP_VERSION}</p>
                    <p>• Last updated 2 weeks ago</p>
                </div>
            </div>
            <div className="hidden w-full lg:block md:block m-6">
                <img
                    className="w-full h-full object-cover rounded-xl"
                    src={dunes}
                    alt="Onlook dunes"
                />
            </div>
        </div>
    );
});

export default SignIn;
