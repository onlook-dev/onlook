import { Button } from '@onlook/ui/button';

import { useCustomDomainContext } from './provider';

export const NoCustomDomain = () => {
    const { openCustomDomain } = useCustomDomainContext();

    return (
        <>
            <div className="flex w-full items-center">
                <h3 className="">Custom Domain</h3>
                <span className="ml-auto rounded-full bg-blue-400 px-1.5 py-0.5 text-xs text-white">
                    PRO
                </span>
            </div>

            <Button
                onClick={openCustomDomain}
                className="border-blue w-full rounded-md border bg-blue-600 p-3 text-white hover:bg-blue-700"
            >
                Link a Custom Domain
            </Button>
        </>
    );
};
