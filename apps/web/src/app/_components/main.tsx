"use client";
import { Routes } from "@/utils/constants";
import { createClient } from "@/utils/supabase/client";
import { type User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

export default function Main() {
    const supabase = createClient();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        redirect(Routes.LOGIN);
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center relative">
            {/* Top bar */}
            <div className="absolute flex top-0 left-0 w-full h-12 bg-gray-100 items-center justify-end p-2">

                {user ? (
                    <div className="flex items-center gap-2">
                        <p>{user.user_metadata.name}</p>
                        <button onClick={handleSignOut}>
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <button onClick={() => redirect(Routes.LOGIN)}>
                        Sign In
                    </button>
                )}
            </div>
            <div className="flex flex-col items-center justify-center">
                <h1 className="text-4xl font-bold">Onlook</h1>
                <p className="text-lg">
                    Cursor for Designers
                </p>
                <textarea className="w-96 h-32 p-4 border-2 border-gray-300 rounded-md" />
            </div>
        </main>
    );
}