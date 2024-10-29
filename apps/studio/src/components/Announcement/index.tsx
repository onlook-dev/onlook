import mountains from '@/assets/mountains.png';
import { DialogTitle } from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { Button } from '@onlook/ui/button';
import { Dialog, DialogContent } from '@onlook/ui/dialog';
import { Input } from '@onlook/ui/input';
import { Toggle } from '@onlook/ui/toggle';
import { toast } from '@onlook/ui/use-toast';
import { Links, MainChannels } from '/common/constants';
import type { UserSettings } from '/common/models/settings';
import supabase from '@onlook/supabase/clients';
import { Icons } from '@onlook/ui/icons';

function Announcement() {
    const [checked, setChecked] = useState(true);
    const [open, setOpen] = useState(true);
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        window.api.invoke(MainChannels.GET_USER_SETTINGS).then((res) => {
            const settings: UserSettings = res as UserSettings;
            setChecked(settings.enableAnalytics !== undefined ? settings.enableAnalytics : true);
        });
    }, []);

    async function handleSubscribe() {
        try {
            if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                throw new Error('Email is invalid');
            }

            if (!supabase) {
                throw new Error('No backend connected');
            }
            const { data, error } = await supabase.from('subscription').insert([
                {
                    email,
                },
            ]);
            if (error) {
                throw error;
            }
            setError('');
            setEmail('');
            toast({
                title: 'Email Subscribed 🎉',
                description: 'Thank you for following the progress!',
            });
        } catch (error: any) {
            console.error('Error subscribing:', error);
            setError('Error: ' + error.message || error);
        }
    }

    function handleOpenChange(value: boolean) {
        setOpen(false);
        if (!value) {
            window.api.send(MainChannels.UPDATE_ANALYTICS_PREFERENCE, checked);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="text-foreground-onlook space-x-2 text-sm space-y-2">
                <div className="flex relative items-start w-[calc(100%+3rem)] h-72 -m-6 mb-0 border-b rounded-t-lg overflow-hidden">
                    <img
                        className="absolute w-[calc(100%+3rem)]"
                        src={mountains}
                        alt="Onlook logo"
                    />
                    <div className="absolute top-10 w-full items-center flex flex-col space-y-2">
                        <Icons.OnlookTextLogo className="invert" viewBox="0 0 139 17" />
                        <DialogTitle className="text-xs">
                            Version {window.env.APP_VERSION}
                        </DialogTitle>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <p>Stay up to date with Onlook</p>
                        <div className="flex flex-row space-x-2">
                            <Input
                                className="bg-background-onlook outline-none"
                                placeholder="contact@onlook.dev"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <Button variant={'outline'} onClick={handleSubscribe}>
                                Email me updates
                            </Button>
                        </div>
                        <p className="text-red-500">{error}</p>
                    </div>
                    <div className="grid grid-cols-2">
                        <div className="space-y-2">
                            <p>Resources</p>
                            <div className="flex flex-col items-start">
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="text-foreground-onlook flex flex-row items-center hover:text-foreground-active"
                                    onClick={() => window.open(Links.GITHUB, '_blank')}
                                >
                                    <Icons.GitHubLogo className="mr-2" /> Star GitHub Repo
                                </Button>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="text-foreground-onlook flex flex-row items-center hover:text-foreground-active"
                                    onClick={() => window.open(Links.DISCORD, '_blank')}
                                >
                                    <Icons.DiscordLogo className="mr-2" />
                                    Join Discord
                                </Button>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="text-foreground-onlook flex flex-row items-center hover:text-foreground-active"
                                    onClick={() => window.open(Links.WIKI, '_blank')}
                                >
                                    <Icons.Layers className="mr-2" /> Browse Docs
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p>Settings</p>
                            <div className="flex flex-row items-center space-x-2">
                                <Toggle
                                    pressed={checked}
                                    size="sm"
                                    className="h-7 p-0 px-2 rounded data-[state=on]:bg-teal-800 data-[state=on]:text-teal-100"
                                    onPressedChange={(value) => setChecked(value)}
                                >
                                    {checked ? <Icons.Checkbox /> : <Icons.Box />}
                                </Toggle>
                                <div className="text-xs">
                                    <p className="text-foreground">Share anonymized analytics</p>
                                    <p>This helps our small team a lot!</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default Announcement;
