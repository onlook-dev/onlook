import { redirect } from 'next/navigation';

import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/server';

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
        redirect(Routes.LOGIN);
    }
    return <>{children}</>;
}
