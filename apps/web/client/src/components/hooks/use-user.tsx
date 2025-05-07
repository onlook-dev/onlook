import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/client';
import { redirect } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';

interface User {
    name: string | null;
    image: string | null;
}

type UserContextType = {
    user: User | null;
    handleSignOut: (redirectRoute?: string) => Promise<void>;
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const {
                data: { user: supabaseUser },
            } = await supabase.auth.getUser();
            if (supabaseUser) {
                setUser({
                    name:
                        supabaseUser.user_metadata?.full_name ||
                        supabaseUser.user_metadata?.name ||
                        supabaseUser.email ||
                        'Anonymous',
                    image: supabaseUser.user_metadata?.avatar_url || null,
                });
            } else {
                setUser(null);
            }
        };
        fetchUser();
    }, []);

    const handleSignOut = async (redirectRoute?: string) => {
        await supabase.auth.signOut();
        clearUser();
        redirect(redirectRoute || Routes.LOGIN);
    };

    const clearUser = () => {
        setUser(null);
    };

    return <UserContext.Provider value={{ user, handleSignOut }}>{children}</UserContext.Provider>;
}

export function useUserContext() {
    const context = useContext(UserContext);
    if (!context) throw new Error('useUserContext must be used within a UserProvider');
    return context;
}
