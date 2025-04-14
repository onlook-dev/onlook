'use client';

import { api } from "@/trpc/react";
import { Button } from "@onlook/ui-v4/button";

export function Csb() {
    const { mutateAsync: start, isPending: isStarting } = api.csb.start.useMutation();
    const { mutateAsync: stop, isPending: isStopping } = api.csb.stop.useMutation();
    const { mutateAsync: list, isPending: isListing } = api.csb.list.useMutation();

    const handleStart = async () => {
        const startData = await start("123");
        console.log("startData", startData);
    }

    const handleStop = async () => {
        const stopData = await stop("s6tryk");
        console.log("stopData", stopData);
    }

    const handleList = async () => {
        const listData = await list();
        console.log("listData", listData);
    }

    return (
        <div>
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