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
        <div className="p-4 flex flex-col items-center gap-2">
            {customDomain?.url
                ? <DomainSection />
                : <NoCustomDomain />
            }
        </div>
    )
}