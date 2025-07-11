import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import type { CustomDomainVerification } from '@onlook/db/src/schema/domain/custom/verification';
import { VerificationRequestStatus, type DomainInfo } from '@onlook/models';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export enum VerificationState {
    INPUTTING_DOMAIN = 'inputting_domain',
    CREATING_VERIFICATION = 'creating_verification',
    VERIFICATION_CREATED = 'verification_created',

    VERIFYING = 'verifying',
    VERIFIED = 'verified',
}

interface DomainVerificationContextType {
    domainInput: string;
    setDomainInput: (input: string) => void;
    customDomain: DomainInfo | null;
    verification: CustomDomainVerification | null;
    verificationState: VerificationState;
    error: string | null;
    ownedDomains: string[];
    reuseDomain: (domain: string) => Promise<void>;
    createVerificationRequest: () => Promise<void>;
    removeVerificationRequest: () => Promise<void>;
    verifyVerificationRequest: () => Promise<void>;
}

const DomainVerificationContext = createContext<DomainVerificationContextType | undefined>(undefined);

export const DomainVerificationProvider = ({ children }: { children: ReactNode }) => {
    const editorEngine = useEditorEngine();

    const [verificationState, setVerificationState] = useState(VerificationState.INPUTTING_DOMAIN);
    const [error, setError] = useState<string | null>(null);

    const { data: customDomain } = api.domain.custom.get.useQuery({ projectId: editorEngine.projectId });
    const { data: verification, refetch: refetchVerification } = api.domain.verification.getActive.useQuery({ projectId: editorEngine.projectId });
    const { mutateAsync: createDomainVerification } = api.domain.verification.create.useMutation();
    const { mutateAsync: removeDomainVerification } = api.domain.verification.remove.useMutation();
    const { mutateAsync: verifyDomain } = api.domain.verification.verify.useMutation();
    const { data: ownedDomains = [] } = api.domain.custom.getOwnedDomains.useQuery();
    const { mutateAsync: verifyOwnedDomain } = api.domain.verification.verifyOwnedDomain.useMutation();
    const [domainInput, setDomainInput] = useState(verification?.fullDomain ?? '');

    useEffect(() => {
        if (verification === undefined) {
            return;
        }
        if (verification === null) {
            setVerificationState(VerificationState.INPUTTING_DOMAIN);
            return;
        }
        if (verification.status === VerificationRequestStatus.PENDING) {
            setVerificationState(VerificationState.VERIFICATION_CREATED);
        } else if (verification.status === VerificationRequestStatus.VERIFIED) {
            setVerificationState(VerificationState.VERIFIED);
        }
    }, [verification]);

    const createVerificationRequest = async () => {
        setVerificationState(VerificationState.CREATING_VERIFICATION);
        setError(null);
        const verificationRequest = await createDomainVerification({
            domain: domainInput,
            projectId: editorEngine.projectId,
        });
        if (!verificationRequest) {
            setError('Failed to create domain verification');
            setVerificationState(VerificationState.INPUTTING_DOMAIN);
            return;
        }
        await refetchVerification();
        setError(null);
    };

    const removeVerificationRequest = async () => {
        if (!verification) {
            setError('No verification request to remove');
            return;
        }
        await removeDomainVerification({
            verificationId: verification.id,
        });
        await refetchVerification();
        setVerificationState(VerificationState.INPUTTING_DOMAIN);
        setError(null);
    };

    const verifyVerificationRequest = async () => {
        if (!verification) {
            setError('No verification request to verify');
            return;
        }
        const {
            success,
            failureReason,
        } = await verifyDomain({
            verificationId: verification.id,
        });
        if (!success || failureReason) {
            setError(failureReason ?? 'Failed to verify domain');
            return;
        }
        await refetchVerification();
        setVerificationState(VerificationState.VERIFIED);
        setError(null);
    };

    const reuseDomain = async (domain: string) => {
        setError(null);
        const {
            success,
            failureReason,
        } = await verifyOwnedDomain({
            fullDomain: domain,
            projectId: editorEngine.projectId,
        });
        if (!success || failureReason) {
            setError(failureReason ?? 'Failed to reuse domain');
            return;
        }
        await refetchVerification();
        setVerificationState(VerificationState.VERIFIED);
        setError(null);
    };

    return (
        <DomainVerificationContext.Provider value={{
            domainInput,
            setDomainInput,
            createVerificationRequest,
            removeVerificationRequest,
            verifyVerificationRequest,
            customDomain: customDomain ?? null,
            verification: verification ?? null,
            verificationState,
            error,
            ownedDomains,
            reuseDomain,
        }}>
            {children}
        </DomainVerificationContext.Provider>
    );
};

export const useDomainVerification = () => {
    const context = useContext(DomainVerificationContext);
    if (context === undefined) {
        throw new Error('useDomainVerification must be used within a DomainVerificationProvider');
    }
    return context;
};
