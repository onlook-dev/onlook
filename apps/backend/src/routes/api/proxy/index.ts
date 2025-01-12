import { Router, Request, Response, NextFunction } from 'express';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseServerClient } from '../../../lib/supabase';

interface AuthenticatedRequest extends Request {
    user?: any;
    body: any;
    headers: {
        authorization?: string;
        [key: string]: string | undefined;
    };
}

const proxyRouter = Router();

// Middleware to check authentication
const checkAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    try {
        const { data: { user }, error } = await supabaseServerClient.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

// OpenAI proxy endpoint
proxyRouter.post('/openai', checkAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { messages, model = 'gpt-4-turbo-preview', options = {} } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    try {
        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({
            model,
            messages,
            ...options
        });
        res.json(response);
    } catch (error) {
        console.error('OpenAI API error:', error);
        res.status(500).json({ error: 'Failed to process OpenAI request' });
    }
});

// Anthropic proxy endpoint
proxyRouter.post('/anthropic', checkAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { messages, model = 'claude-3-sonnet-20240229', options = {} } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'Anthropic API key not configured' });
    }

    try {
        const anthropic = new Anthropic({ apiKey });
        const response = await anthropic.messages.create({
            model,
            messages,
            ...options
        });
        res.json(response);
    } catch (error) {
        console.error('Anthropic API error:', error);
        res.status(500).json({ error: 'Failed to process Anthropic request' });
    }
});

// Freestyle proxy endpoint
proxyRouter.post('/freestyle/deploy', checkAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { files, config } = req.body;
    const apiKey = process.env.FREESTYLE_API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'Freestyle API key not configured' });
    }

    try {
        const response = await fetch('https://api.freestyle.dev/v1/deploy', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ files, config })
        });
        
        if (!response.ok) {
            throw new Error(`Freestyle API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Freestyle API error:', error);
        res.status(500).json({ error: 'Failed to process Freestyle request' });
    }
});

export default proxyRouter;
