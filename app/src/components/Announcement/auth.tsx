import { useAuthManager } from '@/App';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { APP_SCHEMA, MainChannels } from '/common/constants';
import supabase from '/common/supabase';

const Auth = observer(() => {
    const authManager = useAuthManager();
    const [userMetadata, setUserMetadata] = useState(authManager.userMetadata);

    useEffect(() => {
        setUserMetadata(authManager.userMetadata);
    }, [authManager.userMetadata]);

    async function signIn(provider: 'github' | 'google') {
        if (!supabase) {
            throw new Error('No backend connected');
        }

        supabase.auth.signOut();

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                skipBrowserRedirect: true,
                redirectTo: APP_SCHEMA + '://auth',
            },
        });

        window.api.invoke(MainChannels.OPEN_EXTERNAL_WINDOW, data.url);

        if (error) {
            console.error('Authentication error:', error);
            return;
        }
    }

    function signOut() {
        if (!supabase) {
            throw new Error('No backend connected');
        }

        supabase.auth.signOut();
        window.api.invoke(MainChannels.SIGN_OUT);
    }

    return (
        <div className="flex flex-row gap-4 items-center justify-center">
            {userMetadata ? (
                <>
                    <div>Hello, {userMetadata.name}</div>
                    <Button variant={'outline'} onClick={() => signOut()}>
                        Sign Out
                    </Button>
                </>
            ) : (
                <>
                    <Button variant={'outline'} onClick={() => signIn('github')}>
                        Github
                    </Button>
                    <Button variant={'outline'} onClick={() => signIn('google')}>
                        Google
                    </Button>
                </>
            )}
        </div>
    );
});

export default Auth;
