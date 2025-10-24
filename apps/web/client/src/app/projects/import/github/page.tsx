import { api, HydrateClient } from '@/trpc/server';
import { createClient } from '@/utils/supabase/server';
import { ImportFlow } from './_components/import-flow';
import { OAuthConnect } from './_components/oauth-connect';

const Page = async () => {
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();

    const hasOAuthAccess = !!session?.provider_token;

    if (!hasOAuthAccess) {
        return <OAuthConnect />;
    }

    void api.github.getRepositoriesWithOAuth.prefetch();
    void api.github.getOrganizationsWithOAuth.prefetch();

    return (
        <HydrateClient>
            <ImportFlow />
        </HydrateClient>
    );
};

export default Page;
