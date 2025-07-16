'use client';

import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { NonProjectSettingsModal } from '@/components/ui/settings-modal/non-project';
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
            <SubscriptionModal />
            <NonProjectSettingsModal />
        </div>
    );
});

export default Page;
