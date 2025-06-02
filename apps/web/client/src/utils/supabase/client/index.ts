import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
    // Create a supabase client on the browser with project's credentials
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
}

export const getFileUrlFromStorage = async (bucket: string, path: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

    if (error) {
        console.error('Error downloading file:', error);
        return null;
    }

    return URL.createObjectURL(data);
};
