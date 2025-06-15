import { Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { createErrorObject } from '../utils/error';
import { getOwnedDomains } from './domain';
import { freestyleDeployWeb } from '../utils/freestyle';
import { verifyDomainOwnership } from '../utils/helpers';
import { FreestyleDeployWebConfiguration } from '../types';

export async function deployWebHandler(client: SupabaseClient, req: Request, res: Response): Promise<Response> {
    try {
        const {
            files,
            config,
        } = req.body as {
            files: Record<string, {
                content: string;
                encoding?: string;
            }>,
            config: FreestyleDeployWebConfiguration
        };

        if (!config.domains) {
            throw new Error('No domains provided');
        }

        const ownedDomains = await getOwnedDomains(client);
        if (!verifyDomainOwnership(config.domains, ownedDomains)) {
            throw new Error('Domain ownership not verified');
        }

        const result = await freestyleDeployWeb(files, config);
        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json(createErrorObject(error));
    }
}
