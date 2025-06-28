'use client';

import { SubscriptionModal } from '@/components/ui/pricing-modal.tsx';
import { SettingsModal } from '@/components/ui/settings-modal';
import { observer } from 'mobx-react-lite';
import { SelectProject } from './_components/select';
import { TopBar } from './_components/top-bar';

const Page = observer(() => {
    return (
        <div className="w-screen h-screen flex flex-col">
            <TopBar />
            <div className="flex justify-center overflow-hidden w-full h-full">
                <SelectProject />
            </div>
            <SettingsModal showProjectTabs={false} />
            <SubscriptionModal />
        </div>
    );
});

export default Page;
