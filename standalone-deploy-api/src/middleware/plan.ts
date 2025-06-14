import { Request, Response, NextFunction } from 'express';
import { isProPlan } from '../utils/plan';
import { AuthenticatedRequest } from './auth';

export const requireProPlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const isPro = await isProPlan(req.supabaseClient);
        if (!isPro) {
            return res.status(403).json({ error: 'No Pro plan found' });
        }
        next();
    } catch (error) {
        return res.status(500).json({ error: 'Error checking subscription' });
    }
};
