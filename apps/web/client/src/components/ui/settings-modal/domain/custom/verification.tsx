import { observer } from 'mobx-react-lite';
import { ConfigureHeader } from './headers';
import { NoDomainInput } from './no-domain-input';
import { DnsRecords } from './record-field';
import { useDomainVerification, VerificationState } from './use-domain-verification';

export const Verification = observer(() => {
    const { verificationState, error } = useDomainVerification();

    return (
        <div className="space-y-4">
            <NoDomainInput />
            {(verificationState === VerificationState.VERIFICATION_CREATED || verificationState === VerificationState.VERIFYING) && (
                <>
                    <ConfigureHeader />
                    <DnsRecords />
                </>
            )}
            {error && <p className="text-sm text-red-500 whitespace-pre-wrap">{error}</p>}
        </div>
    );
});
