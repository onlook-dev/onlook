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

    // 方案 A：从 Cookie 获取会话（正常浏览器场景）
    const {
        data: { user: cookieUser },
        error: cookieError,
    } = await supabase.auth.getUser();

    if (!cookieError && cookieUser) {
        return {
            db,
            supabase,
            user: cookieUser,
            ...opts,
        };
    }

    // 方案 B：从 Authorization Header 获取 Token（Integrated Browser 场景）
    const authHeader = opts.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const {
            data: { user: tokenUser },
            error: tokenError,
        } = await supabase.auth.getUser(token);

        if (!tokenError && tokenUser) {
            return {
                db,
                supabase,
                user: tokenUser,
                ...opts,
            };
        }
    }

    // 都失败，抛出未授权错误
    throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Auth session missing!',
    });
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