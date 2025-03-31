import { createClient } from "@/utils/supabase/server";
import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
    const hello = await api.post.hello({ text: "from tRPC" });

    void api.post.getLatest.prefetch();
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    return (
        <HydrateClient>
            <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
                {user?.email}
            </main>
        </HydrateClient>
    );
}
