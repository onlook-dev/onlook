'use client';

import { SelectProject } from './_components/select';
import { TopBar } from './_components/top-bar';

export default function Page() {
    return (
        <div className="w-screen h-screen flex flex-col">
            <TopBar />
            <div className="flex justify-center overflow-hidden w-full h-full">
                <SelectProject />
            </div>
        </div>
    );
}
