import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET!;

function verifySignature(body: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body, 'utf8')
    .digest('hex');
  
  const receivedSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    if (!signature || !verifySignature(body, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    const action = payload.action;
    const installation = payload.installation;

    if (action === 'created' || action === 'unsuspended') {
      const installationId = installation.id.toString();
      const accountLogin = installation.account.login;

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      
      const githubUser = authUsers.users.find(user => 
        user.identities?.some(identity => 
          identity.provider === 'github' && 
          identity.identity_data?.user_name === accountLogin
        )
      );

      if (githubUser) {
        const { error } = await supabase
          .from('users')
          .update({ github_installation_id: installationId })
          .eq('id', githubUser.id);

        if (error) {
          console.error('Failed to update user installation ID:', error);
        }
      }
    }

    if (action === 'deleted' || action === 'suspended') {
      const installationId = installation.id.toString();
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { error } = await supabase
        .from('users')
        .update({ github_installation_id: null })
        .eq('github_installation_id', installationId);

      if (error) {
        console.error('Failed to remove installation ID:', error);
      }
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('GitHub webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}