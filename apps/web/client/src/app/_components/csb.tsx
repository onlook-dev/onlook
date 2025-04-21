'use client';

import { api } from "@/trpc/react";
import { Button } from "@onlook/ui/button";

export function Csb() {
    const { mutateAsync: start, isPending: isStarting } = api.external.sandbox.start.useMutation();
    const { mutateAsync: stop, isPending: isStopping } = api.external.sandbox.stop.useMutation();
    const { data: status, isPending: isListing, refetch: refetchStatus } = api.external.sandbox.status.useQuery({ sandboxId: 's6tryk' });


    return (
        <div>
            <Button
                onClick={() => start({ projectId: '123' })}
                disabled={isStarting}
            >
                Start Client
            </Button>
            <Button
                onClick={() => stop({ sandboxId: 's6tryk' })}
                disabled={isStopping}
            >
                Stop Client
            </Button>
            <Button
                onClick={() => refetchStatus()}
                disabled={isListing}
            >
                List Clients
            </Button>
            <pre>{JSON.stringify(status, null, 2)}</pre>
        </div>
    );
}