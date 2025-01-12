import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import OpenAI from 'openai';
import type { ChatCompletionMessage } from 'openai/resources/chat/completions';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseServerClient } from '../../../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthenticatedRequest extends Request {
    user?: User;
    body: {
        messages?: any[];
        model?: string;
        options?: Record<string, any>;
        files?: Record<string, any>;
        config?: Record<string, any>;
        event?: string;
        data?: Record<string, any>;
    };
    headers: {
        authorization?: string;
        [key: string]: string | undefined;
    };
}

const proxyRouter = Router();

// Type guard for OpenAI messages
const isValidMessages = (messages: any[] | undefined): messages is any[] => {
    return Array.isArray(messages) && messages.every(msg => 
        typeof msg === 'object' && msg !== null && 'role' in msg && 'content' in msg
    );
};

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
proxyRouter.post('/openai', checkAuth as any, async (req: AuthenticatedRequest, res: Response) => {
    const { messages, model = 'gpt-4-turbo-preview', options = {} } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    try {
        const openai = new OpenAI({ apiKey });
        if (!isValidMessages(messages)) {
            return res.status(400).json({ error: 'Invalid message format for OpenAI API' });
        }
        const response = await openai.chat.completions.create({
            model,
            messages,
            ...options
        } as any);
        res.json(response);
    } catch (error) {
        console.error('OpenAI API error:', error);
        res.status(500).json({ error: 'Failed to process OpenAI request' });
    }
});

// Anthropic proxy endpoint
proxyRouter.post('/anthropic', checkAuth as any, async (req: AuthenticatedRequest, res: Response) => {
    const { messages, model = 'claude-3-sonnet-20240229', options = {} } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'Anthropic API key not configured' });
    }

    try {
        const anthropic = new Anthropic({ apiKey });
        if (!isValidMessages(messages)) {
            return res.status(400).json({ error: 'Invalid message format for Anthropic API' });
        }
        const response = await anthropic.messages.create({
            model,
            messages,
            ...options
        } as any);
        res.json(response);
    } catch (error) {
        console.error('Anthropic API error:', error);
        res.status(500).json({ error: 'Failed to process Anthropic request' });
    }
});

// Freestyle proxy endpoint
proxyRouter.post('/freestyle/deploy', checkAuth as any, async (req: AuthenticatedRequest, res: Response) => {
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

// Mixpanel proxy endpoint
proxyRouter.post('/mixpanel', checkAuth as any, async (req: AuthenticatedRequest, res: Response) => {
    const { event, data } = req.body;
    const apiKey = process.env.MIXPANEL_TOKEN;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'Mixpanel token not configured' });
    }

    try {
        const response = await fetch('https://api.mixpanel.com/track', {
            method: 'POST',
            headers: {
                'Accept': 'text/plain',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event,
                properties: {
                    ...data,
                    token: apiKey
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Mixpanel API error: ${response.statusText}`);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Mixpanel API error:', error);
        res.status(500).json({ error: 'Failed to process Mixpanel request' });
    }
});

export default proxyRouter;
