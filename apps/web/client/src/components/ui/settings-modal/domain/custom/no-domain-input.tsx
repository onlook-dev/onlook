import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { useState } from 'react';
import { useDomainVerification, VerificationState } from './use-domain-verification';

export const NoDomainInput = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { domainInput, setDomainInput, customDomain, verification, verificationState, ownedDomains, createVerificationRequest, removeVerificationRequest } = useDomainVerification();

    function getInputButtonText() {
        switch (verificationState) {
            case VerificationState.INPUTTING_DOMAIN:
                return 'Setup';
            case VerificationState.VERIFYING:
                return 'Loading...';
            default:
                return 'Edit';
        }
    }

    const handleEnter = async () => {
        setIsLoading(true);
        await createVerificationRequest();
        setIsLoading(false);
    };

    const handleButtonClick = async () => {
        setIsLoading(true);
        if (verificationState === VerificationState.INPUTTING_DOMAIN) {
            await createVerificationRequest();
        } else {
            await removeVerificationRequest();
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-start gap-2">
                <div className="w-1/3">
                    <p className="text-regularPlus text-muted-foreground">Custom URL</p>
                    <p className="text-small text-muted-foreground">
                        {`Input your domain  ${verificationState === VerificationState.INPUTTING_DOMAIN && ownedDomains.length > 0
                            ? 'or use previous'
                            : ''
                            }`}
                    </p>
                </div>
                <div className="flex flex-col gap-4 flex-1">
                    <div className="flex gap-2">
                        <Input
                            disabled={verificationState !== VerificationState.INPUTTING_DOMAIN}
                            value={domainInput}
                            onChange={(e) => setDomainInput(e.target.value)}
                            placeholder="example.com"
                            className="bg-background placeholder:text-muted-foreground"
                            onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                    handleEnter();
                                }
                            }}
                        />
                        <Button
                            onClick={handleButtonClick}
                            variant="secondary"
                            size="sm"
                            className="h-9 text-smallPlus"
                            disabled={isLoading}
                        >
                            {isLoading && (
                                <Icons.LoadingSpinner className="h-4 w-4 animate-spin mr-2" />
                            )}
                            {getInputButtonText()}
                        </Button>
                    </div>
                    <ExistingDomains />
                </div>
            </div>
        </div>
    );
};

export const ExistingDomains = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { ownedDomains, verificationState, reuseDomain } = useDomainVerification();

    if (ownedDomains.length === 0 || verificationState !== VerificationState.INPUTTING_DOMAIN) {
        return null;
    }

    const addExistingDomain = async (url: string) => {
        setIsLoading(true);
        await reuseDomain(url);
        setIsLoading(false);
    };

    return (
        <div className="flex flex-col gap-2 flex-1">
            {ownedDomains.length > 0 && (
                <p className="text-small text-muted-foreground">
                    You previously used these domains:
                </p>
            )}
            {ownedDomains.map((domain) => (
                <div
                    key={domain}
                    className="flex items-center text-small text-muted-foreground"
                >
                    <p>{domain}</p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto"
                        onClick={() => {
                            addExistingDomain(domain);
                        }}
                        disabled={isLoading}
                    >
                        {isLoading && (
                            <Icons.LoadingSpinner className="h-4 w-4 animate-spin mr-2" />
                        )}
                        Reuse Domain
                    </Button>
                </div>
            ))}
        </div>
    );
};
