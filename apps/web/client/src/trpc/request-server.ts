"use server";

import { createClient as createSupabaseClient } from '@/utils/supabase/request-server';
import { db } from '@onlook/db/src/client';
import { createHydrationHelpers } from '@trpc/react-query/rsc';
import { TRPCError } from '@trpc/server';
import type { NextRequest } from 'next/server';
import { cache } from 'react';
import { createCaller, type AppRouter } from '~/server/api/root';
import { createQueryClient } from './query-client';

export const createTRPCContext = async (req: NextRequest, opts: { headers: Headers }) => {
    const supabase = await createSupabaseClient(req);
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: error.message });
    }

    return {
        db,
        supabase,
        user,
        ...opts,
    };
};

const createContext = async (req: NextRequest) => {
    return createTRPCContext(
        req,
        { headers: req.headers },
    );
};


const getQueryClient = cache(createQueryClient);

/**
 * Used for API routes without using next headers lib
 */
export const createClient = async (req: NextRequest) => {
    const context = await createContext(req);
    const caller = createCaller(context);

    const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
        caller,
        getQueryClient,
    );

    return { api, HydrateClient };
}