import { LocalForageKeys, Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/server';
import { type Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
    title: 'Onlook',
    description: 'Onlook – Projects',
};

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
        const headersList = await headers();
        const pathname = headersList.get('x-pathname') || Routes.PROJECTS;
        redirect(`${Routes.LOGIN}?${LocalForageKeys.RETURN_URL}=${pathname}`);
    }
    return <>{children}</>;
}
