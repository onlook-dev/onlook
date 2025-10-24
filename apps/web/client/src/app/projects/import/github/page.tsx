import { api, HydrateClient } from '@/trpc/server';
import { createClient } from '@/utils/supabase/server';
import { ImportFlow } from './_components/import-flow';
import { OAuthConnect } from './_components/oauth-connect';

type PageProps = {
    searchParams: Promise<{ error?: string }>;
};

const Page = async (props: PageProps) => {
    const searchParams = await props.searchParams;
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();

    const hasOAuthAccess = !!session?.provider_token;

    if (!hasOAuthAccess) {
        return <OAuthConnect error={searchParams.error} />;
    }

    void api.github.getRepositoriesWithOAuth.prefetch();

    return (
        <HydrateClient>
            <ImportFlow />
        </HydrateClient>
    );
};

export default Page;
