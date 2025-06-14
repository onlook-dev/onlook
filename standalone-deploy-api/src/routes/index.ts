import { Router } from 'express';
import { authenticateRequest, AuthenticatedRequest } from '../middleware/auth';
import { requireProPlan } from '../middleware/plan';
import { deployWebHandler } from './deploy';
import { createDomainVerificationHandler, verifyDomainHandler, getOwnedDomainsHandler } from './domain';

const router = Router();

const BASE_API_ROUTE = '/api';
const HOSTING_V2_ROUTE = '/hosting/v2';

router.post(`${BASE_API_ROUTE}${HOSTING_V2_ROUTE}/deploy-web`, authenticateRequest, async (req: AuthenticatedRequest, res) => {
    return deployWebHandler(req.supabaseClient, req, res);
});

router.post(`${BASE_API_ROUTE}${HOSTING_V2_ROUTE}/create-domain-verification`, authenticateRequest, requireProPlan, async (req: AuthenticatedRequest, res) => {
    return createDomainVerificationHandler(req.supabaseClient, req, res);
});

router.post(`${BASE_API_ROUTE}${HOSTING_V2_ROUTE}/verify-domain`, authenticateRequest, requireProPlan, async (req: AuthenticatedRequest, res) => {
    return verifyDomainHandler(req.supabaseClient, req, res);
});

router.get(`${BASE_API_ROUTE}${HOSTING_V2_ROUTE}/owned-domains`, authenticateRequest, requireProPlan, async (req: AuthenticatedRequest, res) => {
    return getOwnedDomainsHandler(req.supabaseClient, req, res);
});

export default router;
