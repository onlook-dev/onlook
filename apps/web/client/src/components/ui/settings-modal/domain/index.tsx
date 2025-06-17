import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { CustomDomain } from './custom';
import { DangerZone } from './danger-zone';
import { EnvVars } from './env-var';
import { PreviewDomain } from './preview';

export const DomainTab = observer(() => {
    return (
        <div className="flex flex-col gap-2">
            <div className="p-6">
                <PreviewDomain />
            </div>
            <Separator />
            <div className="p-6">
                <CustomDomain />
            </div>
            <Separator />
            <div className="flex flex-col gap-4 p-6">
                <EnvVars />
            </div>
            <Separator />
            <div className="p-6">
                <DangerZone />
            </div>
        </div>
    );
});

export default DomainTab;
