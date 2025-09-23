import { env } from '@/env';
import { z } from 'zod';
export async function POST(request: Request) {
    try {
        const { name, email, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = await request.json();

        // Create Zod schema for validation
        const emailCaptureSchema = z.object({
            name: z.string().trim().min(1, 'Name is required'),
            email: z.string().trim().email('Invalid email format'),
            utm_source: z.string().optional(),
            utm_medium: z.string().optional(),
            utm_campaign: z.string().optional(),
            utm_term: z.string().optional(),
            utm_content: z.string().optional(),
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
        url.searchParams.append('name', validatedData.name);
        url.searchParams.append('email', validatedData.email);

        if (validatedData.utm_source) url.searchParams.append('utm_source', validatedData.utm_source);
        if (validatedData.utm_medium) url.searchParams.append('utm_medium', validatedData.utm_medium);
        if (validatedData.utm_campaign) url.searchParams.append('utm_campaign', validatedData.utm_campaign);
        if (validatedData.utm_term) url.searchParams.append('utm_term', validatedData.utm_term);
        if (validatedData.utm_content) url.searchParams.append('utm_content', validatedData.utm_content);

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
