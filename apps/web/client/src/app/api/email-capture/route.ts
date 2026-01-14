import { env } from '@/env';
import { z } from 'zod';

// Simple HTML sanitization function to prevent XSS
function sanitizeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// Rate limiter: simple in-memory store (in production, use Redis or similar)
const requestCounts = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute

function isRateLimited(clientIp: string): boolean {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    
    if (!requestCounts.has(clientIp)) {
        requestCounts.set(clientIp, []);
    }
    
    const timestamps = requestCounts.get(clientIp)!;
    // Remove old timestamps outside the window
    const recentTimestamps = timestamps.filter(t => t > windowStart);
    
    if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
        return true;
    }
    
    recentTimestamps.push(now);
    requestCounts.set(clientIp, recentTimestamps);
    return false;
}

export async function POST(request: Request) {
    try {
        // Extract client IP for rate limiting
        const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                        request.headers.get('x-real-ip') || 
                        'unknown';
        
        // Check rate limit
        if (isRateLimited(clientIp)) {
            return new Response(JSON.stringify({ error: 'Too many requests' }), {
                status: 429,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { name, email, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = await request.json();

        // Create Zod schema for validation
        const emailCaptureSchema = z.object({
            name: z.string().trim().min(1, 'Name is required').max(255, 'Name is too long'),
            email: z.string().trim().email('Invalid email format').max(255, 'Email is too long'),
            utm_source: z.string().optional().max(255, 'utm_source is too long'),
            utm_medium: z.string().optional().max(255, 'utm_medium is too long'),
            utm_campaign: z.string().optional().max(255, 'utm_campaign is too long'),
            utm_term: z.string().optional().max(255, 'utm_term is too long'),
            utm_content: z.string().optional().max(255, 'utm_content is too long'),
        });

        // Validate input data with Zod
        const validationResult = emailCaptureSchema.safeParse({
            name,
            email,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_term,
            utm_content,
        });

        if (!validationResult.success) {
            const firstError = validationResult.error.issues[0];
            return new Response(JSON.stringify({ error: firstError?.message }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const validatedData = validationResult.data;

        // Sanitize string fields to prevent XSS
        const sanitizedData = {
            name: sanitizeHtml(validatedData.name),
            email: validatedData.email, // Email is already validated and safe
            utm_source: validatedData.utm_source ? sanitizeHtml(validatedData.utm_source) : undefined,
            utm_medium: validatedData.utm_medium ? sanitizeHtml(validatedData.utm_medium) : undefined,
            utm_campaign: validatedData.utm_campaign ? sanitizeHtml(validatedData.utm_campaign) : undefined,
            utm_term: validatedData.utm_term ? sanitizeHtml(validatedData.utm_term) : undefined,
            utm_content: validatedData.utm_content ? sanitizeHtml(validatedData.utm_content) : undefined,
        };

        const headerName = env.N8N_LANDING_FORM_HEADER_NAME;
        const headerValue = env.N8N_LANDING_FORM_HEADER_VALUE;
        const landingFormUrl = env.N8N_LANDING_FORM_URL;

        if (!landingFormUrl) {
            console.error('Missing N8N_LANDING_FORM_URL environment variable');
            return new Response(JSON.stringify({ error: 'Server configuration error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const url = new URL(landingFormUrl);
        url.searchParams.append('name', sanitizedData.name);
        url.searchParams.append('email', sanitizedData.email);

        if (sanitizedData.utm_source) url.searchParams.append('utm_source', sanitizedData.utm_source);
        if (sanitizedData.utm_medium) url.searchParams.append('utm_medium', sanitizedData.utm_medium);
        if (sanitizedData.utm_campaign) url.searchParams.append('utm_campaign', sanitizedData.utm_campaign);
        if (sanitizedData.utm_term) url.searchParams.append('utm_term', sanitizedData.utm_term);
        if (sanitizedData.utm_content) url.searchParams.append('utm_content', sanitizedData.utm_content);

        // Build auth headers: use custom header if provided
        const authHeaders: Record<string, string> = {};
        if (headerName && headerValue) {
            authHeaders[headerName] = headerValue;
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: authHeaders,
        });

        if (!response.ok) {
            throw new Error(`Webhook failed with status: ${response.status}`);
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Email capture webhook failed:', error);
        return new Response(JSON.stringify({ error: 'Failed to submit form' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
