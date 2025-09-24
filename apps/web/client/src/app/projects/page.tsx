'use client';

import { useState } from 'react';
import { observer } from 'mobx-react-lite';

import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { NonProjectSettingsModal } from '@/components/ui/settings-modal/non-project';
import { SelectProject } from './_components/select';
import { TopBar } from './_components/top-bar';

const Page = observer(() => {
    const [searchQuery, setSearchQuery] = useState('');
    return (
        <div className="flex h-screen w-screen flex-col">
            <TopBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
            <div className="flex h-full w-full justify-center overflow-x-visible overflow-y-auto">
                <SelectProject externalSearchQuery={searchQuery} />
            </div>
            <SubscriptionModal />
            <NonProjectSettingsModal />
        </div>
    );
});

export default Page;
