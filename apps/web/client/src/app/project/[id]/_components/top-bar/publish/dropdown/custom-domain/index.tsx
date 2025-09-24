import { observer } from 'mobx-react-lite';

import { DomainSection } from './domain';
import { NoCustomDomain } from './no-domain';
import { CustomDomainProvider, useCustomDomainContext } from './provider';

export const CustomDomainSection = observer(() => {
    return (
        <CustomDomainProvider>
            <Section />
        </CustomDomainProvider>
    );
});

export const Section = () => {
    const { customDomain } = useCustomDomainContext();
    return (
        <div className="flex flex-col items-center gap-2 p-4">
            {customDomain?.url ? <DomainSection /> : <NoCustomDomain />}
        </div>
    );
};
