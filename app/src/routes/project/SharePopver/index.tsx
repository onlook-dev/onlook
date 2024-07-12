import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GlobeIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { MainChannels } from '/common/constants';
import { TunnelResult } from '/common/models';

export default function SharePopover() {
    const [tunnel, setTunnel] = useState<TunnelResult>();
    const [loading, setLoading] = useState<boolean>(false);
    const [linkCopied, setLinkCopied] = useState<boolean>(false);
    const [passwordCopied, setPasswordCopied] = useState<boolean>(false);

    async function startSharing() {
        setLoading(true);
        const res = await window.Main.invoke(MainChannels.OPEN_TUNNEL, 3000);
        setLoading(false);
        setTunnel(res as TunnelResult);
    }

    async function stopSharing() {
        setTunnel(undefined);
        await window.Main.invoke(MainChannels.CLOSE_TUNNEL);
    }

    function renderTunnelRunning(tunnel: TunnelResult) {
        return (
            <div className="flex flex-col space-y-2">
                <Label className="">Share link</Label>
                <div className="flex items-center justify-between rounded-md border bg-background px-4 py-2">
                    <p className="text-sm text-muted-foreground">{tunnel.url}</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            navigator.clipboard.writeText(tunnel.url);
                            setLinkCopied(true);
                            setTimeout(() => setLinkCopied(false), 2000);
                        }}
                    >
                        {linkCopied ? 'Copied' : 'Copy'}
                    </Button>
                </div>

                <Label className="">Password</Label>
                <div className="flex items-center justify-between rounded-md border bg-background px-4 py-2">
                    <p className="text-sm text-muted-foreground">{tunnel.password}</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            navigator.clipboard.writeText(tunnel.password);
                            setPasswordCopied(true);
                            setTimeout(() => setLinkCopied(false), 2000);
                        }}
                    >
                        {passwordCopied ? 'Copied' : 'Copy'}
                    </Button>
                </div>

                <Button onClick={stopSharing} variant={'destructive'} className="ml-auto">
                    Stop share
                </Button>
            </div>
        );
    }

    function renderTunnelStopped() {
        return (
            <div className="flex flex-col space-y-2">
                <Label className="">Share Project</Label>
                {loading ? (
                    <p className="text-sm text-muted-foreground">Starting tunnel...</p>
                ) : (
                    <>
                        <p className="text-sm text-muted-foreground">
                            Share your project with others with a local server.
                        </p>
                        <Button onClick={startSharing}>Start sharing</Button>
                    </>
                )}
            </div>
        );
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={`${tunnel ? 'bg-green-600 ' : ''}`}>
                    {tunnel ? (
                        <div className="flex flex-row">
                            <GlobeIcon className="animate-pulse mr-2" /> Sharing
                        </div>
                    ) : (
                        'Share'
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96" align="end">
                {tunnel ? renderTunnelRunning(tunnel) : renderTunnelStopped()}
            </PopoverContent>
        </Popover>
    );
}
