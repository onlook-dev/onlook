import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import type { CustomDomainVerification } from '@onlook/db/src/schema/domain/custom/verification';
import type { DomainInfo } from '@onlook/models';
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
    createVerification: () => Promise<void>;
}

const DomainVerificationContext = createContext<DomainVerificationContextType | undefined>(undefined);

export const DomainVerificationProvider = ({ children }: { children: ReactNode }) => {
    const editorEngine = useEditorEngine();
    const ownedDomains: string[] = [];

    const [domainInput, setDomainInput] = useState('');
    const [verificationState, setVerificationState] = useState(VerificationState.INPUTTING_DOMAIN);
    const [error, setError] = useState<string | null>(null);

    const { data: customDomain } = api.domain.custom.get.useQuery({ projectId: editorEngine.projectId });
    const { data: verification, refetch: refetchVerification } = api.domain.verification.getPending.useQuery({ projectId: editorEngine.projectId });
    const { mutateAsync: createDomainVerification } = api.domain.verification.create.useMutation();
    // const { mutateAsync: verifyCustomDomain } = api.domain.verification.verify.useMutation();

    useEffect(() => {
        if (verification) {
            setVerificationState(VerificationState.VERIFIED);
        }
    }, [verification]);

    const createVerification = async () => {
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
    };

    return (
        <DomainVerificationContext.Provider value={{
            domainInput,
            setDomainInput,
            createVerification,
            customDomain: customDomain ?? null,
            verification: verification ?? null,
            verificationState,
            error,
            ownedDomains,
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
