import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/server';
import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TopBar } from '../_components/top-bar';
import { BackgroundWrapper } from './_components/background-wrapper';

export const metadata: Metadata = {
    title: 'Onlook',
    description: 'Onlook – Create Project',
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
        <BackgroundWrapper>
            <div className="w-screen h-screen flex flex-col">
                <TopBar />
                <div className="flex-1 flex items-center justify-center">
                    {children}
                </div>
            </div>
        </BackgroundWrapper>
    );
}
