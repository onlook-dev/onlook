import { env } from '@/env';

export async function POST(request: Request) {
    try {
        const { name, email, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = await request.json();
        
        if (!name?.trim() || !email?.trim()) {
            return new Response(JSON.stringify({ error: 'Name and email are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return new Response(JSON.stringify({ error: 'Invalid email format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const webhookUrl = env.N8N_WEBHOOK_URL;
        const apiKey = env.N8N_API_KEY;
        
        if (webhookUrl && apiKey) {
            try {
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'n8n-api-key': apiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                        email: email.trim(),
                        source: 'mobile-landing-form',
                        utm_source,
                        utm_medium,
                        utm_campaign,
                        utm_term,
                        utm_content,
                    }),
                });

                if (response.ok) {
                    return new Response(JSON.stringify({ success: true }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                console.warn('Primary n8n webhook failed, trying fallback method');
            } catch (error) {
                console.warn('Primary n8n webhook error, trying fallback method:', error);
            }
        }

        const webhookUsername = process.env.N8N_LANDING_FORM_USERNAME;
        const webhookPassword = process.env.N8N_LANDING_FORM_PASSWORD;
        
        if (webhookUsername && webhookPassword) {
            const url = new URL('https://n8n.process.onlook.com/webhook/website-landing-form');
            url.searchParams.append('name', name.trim());
            url.searchParams.append('email', email.trim());
            
            if (utm_source) url.searchParams.append('utm_source', utm_source);
            if (utm_medium) url.searchParams.append('utm_medium', utm_medium);
            if (utm_campaign) url.searchParams.append('utm_campaign', utm_campaign);
            if (utm_term) url.searchParams.append('utm_term', utm_term);
            if (utm_content) url.searchParams.append('utm_content', utm_content);

            const credentials = btoa(`${webhookUsername}:${webhookPassword}`);
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Webhook failed with status: ${response.status}`);
            }

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.error('No n8n webhook configuration available. Need either N8N_WEBHOOK_URL + N8N_API_KEY or N8N_LANDING_FORM_USERNAME + N8N_LANDING_FORM_PASSWORD');
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
            status: 500,
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
