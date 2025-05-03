import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@onlook/web-server/src/router/context';
import { redirect } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';

type UserContextType = {
    user: User | null;
    handleSignOut: () => Promise<void>;
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user: supabaseUser } } = await supabase.auth.getUser();
            if (supabaseUser) {
                // Map Supabase user to our app's User type
                setUser({
                    name: supabaseUser.user_metadata?.name || supabaseUser.email || 'Anonymous'
                });
            } else {
                setUser(null);
            }
        };
        fetchUser();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        redirect(Routes.LOGIN);
    }

    return <UserContext.Provider value={{ user, handleSignOut }}>{children}</UserContext.Provider>;
}

export function useUserContext() {
    const context = useContext(UserContext);
    if (!context) throw new Error('useUserContext must be used within a UserProvider');
    return context;
}
