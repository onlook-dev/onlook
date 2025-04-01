import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
        redirect('/login')
    }

    return (
        <HydrateClient>
            <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
                Hello {data.user.email}
            </main>
        </HydrateClient>
    );
}
