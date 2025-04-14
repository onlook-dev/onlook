
import { createClient } from "@/utils/supabase/server";
import type { Project } from "@onlook/models";
import Main from "./_components/main";

export default async function Page({ params }: { params: { id: string } }) {
    const supabase = await createClient()

    // TODO: Get project from supabase
    // const { data, error } = await supabase.from('your_table').select('*')

    const newProject: Project = {
        id: params.id,
        name: "New Project",
        url: "https://example.com",
        folderPath: "https://example.com",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        commands: {
            install: "npm install",
            run: "npm run dev",
            build: "npm run build",
        },
        previewImg: null,
        settings: null,
        domains: {
            base: null,
            custom: null,
        },
        metadata: null,
        env: {},
    };
    return <Main project={newProject} />
}
