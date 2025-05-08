'use client';

import { ProjectsProvider } from '@/components/hooks/use-projects';
import { SelectProject } from './_components/select';
import { TopBar } from './_components/top-bar';

export default function Page() {
    return (
        <ProjectsProvider userId="019f68a5-3f34-4ced-97a9-42f7026ff744">
            <div className="w-screen h-screen flex flex-col">
                <TopBar />
                <div className="flex justify-center overflow-hidden w-full h-full">
                    <SelectProject />
                </div>
            </div>
        </ProjectsProvider>
    );
}
