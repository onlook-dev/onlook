import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { BaseDomain } from './base';
import { DangerZone } from './danger-zone';
import { CustomDomain } from './custom';

export const DomainTab = observer(() => {
    return (
        <div className="flex flex-col gap-2">
            <div className="p-6">
                <BaseDomain />
            </div>
            <Separator />
            <div className="p-6">
                <CustomDomain />
            </div>
            {/* <Separator />
            <div className="p-6">
                <DangerZone />
            </div> */}
        </div>
    );
});