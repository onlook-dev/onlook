import { Button } from '../ui/button';
import { APP_SCHEMA, MainChannels } from '/common/constants';
import supabase from '/common/supabase';

export function AuthButton() {
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

    return (
        <div className="flex flex-row gap-4 items-center justify-center">
            <Button variant={'outline'} onClick={() => signIn('github')}>
                Github
            </Button>
            <Button variant={'outline'} onClick={() => signIn('google')}>
                Google
            </Button>
        </div>
    );
}
