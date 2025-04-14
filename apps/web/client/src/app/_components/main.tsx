"use client";
import { Routes } from "@/utils/constants";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@onlook/ui-v4/button";
import { type User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { Csb } from "./csb";

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
            <div className="absolute flex top-0 left-0 w-full h-12 items-center justify-end p-2">
                <Button variant="outline" onClick={() => redirect(Routes.PROJECTS)}>
                    Projects
                </Button>
                {user ? (
                    <div className="flex items-center gap-2">
                        <p>{user.user_metadata.name}</p>
                        <Button onClick={handleSignOut}>
                            Sign Out
                        </Button>
                    </div>
                ) : (
                    <Button onClick={() => redirect(Routes.LOGIN)}>
                        Sign In
                    </Button>
                )}
            </div>
            <div className="flex flex-col items-center justify-center">
                <h1 className="text-4xl font-bold">Onlook</h1>
                <p className="text-lg">
                    Cursor for Designers
                </p>
                <Csb />
                <textarea className="w-96 h-32 p-4 border-2 border-gray-300 rounded-md" />
            </div>
        </main>
    );
}