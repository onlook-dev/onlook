'use client';

import { useEditorEngine } from "@/components/store";
import { api } from "@/trpc/react";
import type { SandboxSession } from "@codesandbox/sdk";
import { connectToSandbox } from '@codesandbox/sdk/browser';
import { CSB_TEMPLATE_ID } from "@onlook/constants";
import { useEffect, useState } from "react";

export function useSandbox() {
    const editorEngine = useEditorEngine();
    const [session, setSession] = useState<SandboxSession | null>(null);
    const { mutateAsync: create, isPending: isCreating } = api.csb.create.useMutation();
    const { mutateAsync: start, isPending: isStarting } = api.csb.start.useMutation();
    const { mutateAsync: hibernate, isPending: isStopping } = api.csb.hibernate.useMutation();

    useEffect(() => {
        return () => {
            editorEngine.sandbox.clear();
        };
    }, []);

    const createSandbox = async () => {
        const res = await create(CSB_TEMPLATE_ID);
        return res;
    };

    const startSandbox = async (sandboxId: string) => {
        const startData = await start(sandboxId);
        const newSession = await connectToSandbox(startData);
        setSession(newSession);
        return newSession;
    };

    const hibernateSandbox = async (sandboxId: string) => {
        await hibernate(sandboxId);
    };

    const startTask = async (taskName: string = "dev") => {
        if (!session) return null;

        const task = await session.tasks.runTask(taskName);

        if (task?.ports.length) {
            const port = task.ports[0];
            return port?.getPreviewUrl();
        }

        return null;
    };


    return {
        session,
        isCreating,
        isStarting,
        isStopping,
        createSandbox,
        startSandbox,
        hibernateSandbox,
        startTask,
    };
} 