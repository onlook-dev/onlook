import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/server';
import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ProjectCreationProvider } from './_context';

export const metadata: Metadata = {
    title: 'Onlook',
    description: 'Onlook – Import Local Project',
};

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
        redirect(Routes.LOGIN);
    }
    return <ProjectCreationProvider totalSteps={2}>{children} </ProjectCreationProvider>;
}
