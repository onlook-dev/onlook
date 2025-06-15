import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseTables } from '../types';

export const getPlanData = async (client: SupabaseClient) => {
    const { data: userUsage, error } = await client
        .from('user_usage')
        .select('*')
        .eq('cancelled', false)
        .single<DatabaseTables['user_usage']>();

    if ((error && error.code === 'PGRST116') || !userUsage) {
        const { data: basicPlan } = await client
            .from('usage_plans')
            .select('*')
            .eq('name', 'basic')
            .single<DatabaseTables['usage_plans']>();

        if (!basicPlan) {
            throw new Error('No basic plan found');
        }
        return basicPlan;
    }

    const { data: plan } = await client
        .from('usage_plans')
        .select('*')
        .eq('id', userUsage.plan_id)
        .single();
    return plan;
};

export const checkSubscription = async (client: SupabaseClient) => {
    try {
        const planData = await getPlanData(client);
        return { data: planData };
    } catch (error) {
        console.error('Error checking subscription:', error);
        throw new Error('Error checking subscription');
    }
};

export async function isProPlan(client: SupabaseClient): Promise<boolean> {
    try {
        const planData = await getPlanData(client);
        return planData.name === 'pro';
    } catch (error) {
        console.error('Error checking subscription:', error);
        return false;
    }
}
