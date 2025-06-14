import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedClient } from '../utils/auth';

export interface AuthenticatedRequest extends Request {
    supabaseClient?: any;
}

export const authenticateRequest = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { client, errorResponse } = getAuthenticatedClient(req, res);
    
    if (!client || errorResponse) {
        return errorResponse;
    }
    
    req.supabaseClient = client;
    next();
};
