import { observer } from 'mobx-react-lite';
import { ConfigureHeader, VerifiedHeader } from './headers';
import { NoDomainInput } from './no-domain-input';
import { DnsRecords } from './record-field';
import { useDomainVerification, VerificationState } from './use-domain-verification';

export const Verification = observer(() => {
    const { verificationState, error } = useDomainVerification();

    // function validateDomain(): string | false {
    // if (!domain) {
    //     setError('Domain is required');
    //     return false;
    // }

    // try {
    //     const { isValid, error } = isApexDomain(domain);
    //     if (!isValid) {
    //         setError(error);
    //         return false;
    //     }

    //     setError(null);
    //     const url = new URL(getValidUrl(domain.trim()));
    //     const hostname = url.hostname.toLowerCase();
    //     return hostname;
    // } catch (err) {
    //     setError('Invalid domain format');
    //     return false;
    // }
    // }

    // const handleDomainVerified = () => {
    //     toast.success('Domain verified!', {
    //         description: 'Your domain is verified and ready to publish.',
    //     });

    //     setTimeout(() => {
    //         stateManager.isSettingsModalOpen = false;
    //         editorEngine.state.publishOpen = true;
    //     }, 1000);
    // };

    return (
        <div className="space-y-4">
            <NoDomainInput />
            {(verificationState === VerificationState.VERIFICATION_CREATED || verificationState === VerificationState.VERIFYING) && (
                <>
                    <ConfigureHeader />
                    <DnsRecords />
                </>
            )}
            {verificationState === VerificationState.VERIFIED && <VerifiedHeader />}
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
});
