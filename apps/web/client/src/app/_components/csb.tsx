'use client';

import { api } from "@/trpc/react";
import type { SandboxSession } from "@codesandbox/sdk";
import { connectToSandbox } from '@codesandbox/sdk/browser';
import { CSB_TEMPLATE_ID } from "@onlook/constants";
import { Button } from "@onlook/ui/button";
import { useState } from "react";

export function Csb() {
    const [session, setSession] = useState<SandboxSession | null>(null);
    const { mutateAsync: create, isPending: isCreating } = api.csb.create.useMutation();
    const { mutateAsync: start, isPending: isStarting } = api.csb.start.useMutation();
    const { mutateAsync: hibernate, isPending: isStopping } = api.csb.hibernate.useMutation();
    const { data: status, refetch: refetchStatus } = api.csb.list.useQuery();

    return (
        <div>
            <pre>{CSB_TEMPLATE_ID}</pre>
            {session && <p>Session: {session.id}</p>}
            <Button
                onClick={async () => {
                    const res = await create(CSB_TEMPLATE_ID)
                    console.log(res)
                }}
                disabled={isCreating}
            >
                Create
            </Button>
            <Button
                onClick={async () => {
                    const startData = await start('nmjn32')
                    const session = await connectToSandbox(startData)
                    setSession(session)
                }}
                disabled={isStarting}
            >
                Start
            </Button>
            <Button
                onClick={async () => {
                    const task = await session?.tasks.runTask("dev");
                    console.log(`Started task: ${task?.name}`);

                    // If the task opens a port, you can access it
                    if (task?.ports.length) {
                        const port = task.ports[0];
                        console.log(`Preview available at: ${port?.getPreviewUrl()}`);
                    }
                }}
                disabled={isStarting}
            >
                Start Task
            </Button>
            <Button
                onClick={async () => {
                    await hibernate('nmjn32')
                }}
                disabled={isStopping}
            >
                Hibernate
            </Button>
            <Button
                onClick={() => refetchStatus()}
            >
                List
            </Button>
            <pre>{JSON.stringify(status, null, 2)}</pre>
        </div>
    );
}