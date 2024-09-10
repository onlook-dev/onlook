import { Button } from '../ui/button';
import { APP_SCHEMA, MainChannels } from '/common/constants';
import supabase from '/common/supabase';

export function AuthButton() {
    async function signInWithGithub() {
        if (!supabase) {
            throw new Error('No backend connected');
        }

        supabase.auth.signOut();

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
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
        <Button variant={'outline'} onClick={signInWithGithub}>
            Auth
        </Button>
    );
}
