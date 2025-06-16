import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/server';
import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ImportGithubProjectProvider } from './_context/context';

export const metadata: Metadata = {
    title: 'Onlook',
    description: 'Onlook – Import Github Project',
};

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
        redirect(Routes.LOGIN);
    }
    return (
        <ImportGithubProjectProvider totalSteps={2}>{children} </ImportGithubProjectProvider>
    );
}
