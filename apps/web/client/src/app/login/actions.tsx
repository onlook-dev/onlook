'use server'

import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(provider: 'github' | 'google') {
    const supabase = await createClient()
    const origin = (await headers()).get('origin')
    // If already session, redirect
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
        redirect('/')
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${origin}/auth/callback`
        },
    });

    if (error) {
        redirect('/error')
    }

    redirect(data.url)
}