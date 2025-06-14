import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedClient } from '../utils/auth';

export interface AuthenticatedRequest extends Request {
    supabaseClient?: any;
}

export const authenticateRequest = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { client, errorResponse } = getAuthenticatedClient(req, res);
    
    if (errorResponse) {
        return errorResponse;
    }
    
    if (!client) {
        return res.status(500).json({ error: "Failed to initialize Supabase client" });
    }
    
    req.supabaseClient = client;
    next();
};
