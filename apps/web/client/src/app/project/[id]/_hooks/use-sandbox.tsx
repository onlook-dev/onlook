'use client';

import { api } from "@/trpc/react";
import type { SandboxSession } from "@codesandbox/sdk";
import { connectToSandbox } from '@codesandbox/sdk/browser';
import { CSB_TEMPLATE_ID } from "@onlook/constants";
import { useState } from "react";

export function useSandbox() {
    const [session, setSession] = useState<SandboxSession | null>(null);
    const { mutateAsync: create, isPending: isCreating } = api.csb.create.useMutation();
    const { mutateAsync: start, isPending: isStarting } = api.csb.start.useMutation();
    const { mutateAsync: hibernate, isPending: isStopping } = api.csb.hibernate.useMutation();
    const { mutateAsync: reconnect, isPending: isReconnecting } = api.csb.reconnect.useMutation();

    const createSandbox = async () => {
        const res = await create(CSB_TEMPLATE_ID);
        return res;
    };

    const startSession = async (sandboxId: string) => {
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

    const disconnect = async () => {
        if (!session) return;
        await session.disconnect();
        setSession(null);
    };

    return {
        session,
        isCreating,
        isStarting,
        isStopping,
        isReconnecting,
        createSandbox,
        startSession,
        hibernateSandbox,
        startTask,
        disconnect,
        reconnect,
    };
} 