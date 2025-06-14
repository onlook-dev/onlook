import { Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { getServiceRoleClient, getUser } from '../utils/auth';
import { createErrorObject } from '../utils/error';
import { freestyleCreateDomainVerification, freestyleVerifyDomain } from '../utils/freestyle';
import { GetOwnedDomainsResponse, User, DatabaseTables } from '../types';

export const createDomainVerificationHandler = async (client: SupabaseClient, req: Request, res: Response): Promise<Response> => {
    try {
        const { domain } = req.body;
        const response = await freestyleCreateDomainVerification(domain);
        const user = await getUser(client);
        if (!user) {
            throw new Error('User not found');
        }
        const success = await createDomainVerification(domain, user);
        if (!success) {
            throw new Error('Failed to create domain verification');
        }
        return res.status(200).json({
            data: response,
        });
    } catch (error) {
        console.error('Error creating verification:', error);
        return res.status(500).json(createErrorObject(error));
    }
};

const createDomainVerification = async (domain: string, user: User): Promise<boolean> => {
    const client = getServiceRoleClient();
    
    const { data: existingDomain } = await client
        .from('domains')
        .select('*')
        .eq('domain', domain)
        .single<DatabaseTables['domains']>();

    if (existingDomain && existingDomain.verified) {
        throw new Error('Domain already verified');
    }

    let domainObj = existingDomain;
    if (!domainObj) {
        const { data: newDomain, error: insertError } = await client.from('domains').insert({
            domain: domain,
            verified: false,
        }).select('*').single<DatabaseTables['domains']>();

        if (insertError || !newDomain) {
            console.error('Failed to create domain record:', insertError, newDomain);
            throw new Error('Failed to create domain record');
        }
        domainObj = newDomain;
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingNonUserVerification } = await client.from('domain_verifications')
        .select('*')
        .eq('domain_id', domainObj.id)
        .neq('user_id', user.id)
        .gte('created_at', twentyFourHoursAgo)
        .single<DatabaseTables['domain_verifications']>();

    if (existingNonUserVerification) {
        throw new Error('Domain already has a verification request from a different user');
    }

    const { data: existingUserVerification } = await client.from('domain_verifications')
        .select('*')
        .eq('domain_id', domainObj.id)
        .eq('user_id', user.id)
        .single<DatabaseTables['domain_verifications']>();

    if (existingUserVerification) {
        console.log('Domain verification request already exists for the user');
        return true;
    }

    const { error } = await client.from('domain_verifications').insert({
        domain_id: domainObj.id,
        user_id: user.id,
    });

    if (error) {
        throw error;
    }

    console.log('Domain verification request created successfully');
    return true;
};

export const verifyDomainHandler = async (client: SupabaseClient, req: Request, res: Response): Promise<Response> => {
    try {
        const { domain } = req.body;
        const user = await getUser(client);
        if (!user) {
            throw new Error('User not found');
        }
        const success = await freestyleVerifyDomain(domain);
        if (!success) {
            throw new Error('Domain not verified. Make sure you added the DNS records. It can take up to 48 hours for the domain to be verified.');
        }

        await updateDomainRecords(domain, user);

        return res.status(200).json({
            success,
        });
    } catch (error) {
        console.error('Error verifying domain:', error);
        return res.status(500).json(createErrorObject(error));
    }
};

const updateDomainRecords = async (domain: string, user: User) => {
    const client = getServiceRoleClient();

    const { data: domainRecord } = await client.from('domains')
        .select('id')
        .eq('domain', domain)
        .single();

    if (!domainRecord) {
        throw new Error('Domain not found');
    }

    const { data: existingUserVerification } = await client.from('domain_verifications')
        .select('*')
        .eq('domain_id', domainRecord.id)
        .eq('user_id', user.id)
        .single<DatabaseTables['domain_verifications']>();

    if (existingUserVerification) {
        await client.from('domain_verifications').update({
            usedAt: new Date().toISOString(),
        }).eq('id', existingUserVerification.id);
    }

    const { data: existingDomain } = await client.from('domains')
        .select('*')
        .eq('domain', domain)
        .single<DatabaseTables['domains']>();

    if (!existingDomain) {
        throw new Error('Domain not found');
    }

    const { data: existingOwnership } = await client.from('domain_ownership')
        .select('*')
        .eq('domain_id', existingDomain.id)
        .eq('user_id', user.id)
        .single<DatabaseTables['domain_ownership']>();

    if (!existingOwnership) {
        const { error: ownershipError } = await client.from('domain_ownership').upsert({
            domain_id: existingDomain.id,
            user_id: user.id,
        });

        if (ownershipError) {
            console.error('Failed to create domain ownership:', ownershipError);
            throw new Error('Failed to create domain ownership');
        }
    }

    const { error: updateError } = await client.from('domains').update({
        verified: true,
    }).eq('id', existingDomain.id);

    if (updateError) {
        console.error('Failed to update domain verification status:', updateError);
        throw new Error('Failed to update domain verification status');
    }
};

export const getOwnedDomainsHandler = async (client: SupabaseClient, req: Request, res: Response): Promise<Response> => {
    try {
        const domains = await getOwnedDomains(client);
        return res.status(200).json({
            success: true,
            domains,
        } satisfies GetOwnedDomainsResponse);

    } catch (error) {
        console.error('Error getting owned domains:', error);
        return res.status(500).json(createErrorObject(error));
    }
};

export const getOwnedDomains = async (client: SupabaseClient): Promise<string[]> => {
    const user = await getUser(client);
    if (!user) {
        throw new Error('User not found');
    }
    const serviceRoleClient = getServiceRoleClient();
    const { data, error } = await serviceRoleClient.rpc('get_user_domains', {
        p_user_id: user.id
    });
    if (error) {
        throw error;
    }
    return data.map((domain: DatabaseTables['domains']) => domain.domain);
};
