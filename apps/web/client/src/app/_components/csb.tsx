'use client';

import { api } from "@/trpc/react";
import { Button } from "@onlook/ui-v4/button";

export function Csb() {
    const { mutate: start, isPending: isStarting, data: startData } = api.api.csb.start.useMutation();
    const { mutate: stop, isPending: isStopping, data: stopData } = api.api.csb.stop.useMutation();
    const { mutate: list, isPending: isListing, data: listData } = api.api.csb.list.useMutation();

    const handleStart = async () => {
        await start("123");
    }

    const handleStop = async () => {
        await stop("s6tryk");
    }

    const handleList = async () => {
        await list();
    }

    return (
        <div>
            <pre>{JSON.stringify(startData, null, 2)}</pre>
            <pre>{JSON.stringify(stopData, null, 2)}</pre>
            <pre>{JSON.stringify(listData, null, 2)}</pre>
            <Button
                onClick={handleStart}
                disabled={isStarting}
            >
                Start Client
            </Button>
            <Button
                onClick={handleStop}
                disabled={isStopping}
            >
                Stop Client
            </Button>
            <Button
                onClick={handleList}
                disabled={isListing}
            >
                List Clients
            </Button>
        </div>
    );
}