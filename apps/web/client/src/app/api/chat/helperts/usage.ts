import { createClient as createTRPCClient } from '@/trpc/request-server';
import { createClient as createSupabaseClient } from '@/utils/supabase/request-server';
import { UsageType, type Usage } from '@onlook/models';
import { type NextRequest } from 'next/server';

export const checkMessageLimit = async (req: NextRequest): Promise<{
    exceeded: boolean;
    usage: Usage;
}> => {
    const { api } = await createTRPCClient(req);
    const usage = await api.usage.get();

    const dailyUsage = usage.daily;
    const dailyExceeded = dailyUsage.usageCount >= dailyUsage.limitCount;
    if (dailyExceeded) {
        return {
            exceeded: true,
            usage: dailyUsage,
        };
    }

    const monthlyUsage = usage.monthly;
    const monthlyExceeded = monthlyUsage.usageCount >= monthlyUsage.limitCount;
    if (monthlyExceeded) {
        return {
            exceeded: true,
            usage: monthlyUsage,
        };
    }

    return {
        exceeded: false,
        usage: monthlyUsage,
    };
}

export const getSupabaseUser = async (request: NextRequest) => {
    const supabase = await createSupabaseClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export const incrementUsage = async (req: NextRequest): Promise<{
    usageRecordId: string | undefined,
    rateLimitId: string | undefined,
} | null> => {
    try {
        const user = await getSupabaseUser(req);
        if (!user) {
            throw new Error('User not found');
        }
        const { api } = await createTRPCClient(req);
        const incrementRes = await api.usage.increment({
            type: UsageType.MESSAGE,
        });
        return {
            usageRecordId: incrementRes?.usageRecordId,
            rateLimitId: incrementRes?.rateLimitId,
        };
    } catch (error) {
        console.error('Error in chat usage increment', error);
    }
    return null;
}

export const decrementUsage = async (
    req: NextRequest,
    usageRecord: {
        usageRecordId: string | undefined,
        rateLimitId: string | undefined,
    } | null
): Promise<void> => {
    try {
        if (!usageRecord) {
            return;
        }
        const { usageRecordId, rateLimitId } = usageRecord;
        if (!usageRecordId || !rateLimitId) {
            return;
        }
        const { api } = await createTRPCClient(req);
        await api.usage.revertIncrement({ usageRecordId, rateLimitId });
    } catch (error) {
        console.error('Error in chat usage decrement', error);
    }
}