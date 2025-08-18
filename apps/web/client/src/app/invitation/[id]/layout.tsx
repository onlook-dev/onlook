import { createClient } from '@/utils/supabase/server';
import { type Metadata } from 'next';
import { HandleAuth } from './_components/auth';

export const metadata: Metadata = {
    title: 'Onlook',
    description: 'Onlook – Invitation',
};

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        return <HandleAuth />;
    }
    return (
        <div className="w-screen h-screen flex flex-col items-center justify-center">
            {children}
        </div>
    );
}
