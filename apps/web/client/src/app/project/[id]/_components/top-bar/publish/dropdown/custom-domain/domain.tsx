import { DeploymentStatus } from "@onlook/models";
import { timeAgo } from "@onlook/utility";
import { ActionSection } from "./action";
import { NoCustomDomain } from "./no-domain";
import { useCustomDomainContext } from "./provider";

export const DomainSection = () => {
    const { isPro, customDomain, deployment, isDeploying } = useCustomDomainContext();

    if (!customDomain) {
        return 'Something went wrong';
    }

    if (!isPro) {
        return <NoCustomDomain />
    }

    return (
        <>
            <div className="flex items-center w-full">
                <h3 className="">
                    Custom Domain
                </h3>
                {deployment && deployment?.status === DeploymentStatus.COMPLETED && (
                    <div className="ml-auto flex items-center gap-2">
                        <p className="text-green-300">Live</p>
                        <p>•</p>
                        <p>Updated {timeAgo(deployment.updatedAt.toISOString())} ago</p>
                    </div>
                )}
                {deployment?.status === DeploymentStatus.FAILED && (
                    <div className="ml-auto flex items-center gap-2">
                        <p className="text-red-500">Error</p>
                    </div>
                )}
                {deployment?.status === DeploymentStatus.CANCELLED && (
                    <div className="ml-auto flex items-center gap-2">
                        <p className="text-foreground-secondary">Cancelled</p>
                    </div>
                )}
                {isDeploying && (
                    <div className="ml-auto flex items-center gap-2">
                        <p className="">Updating • In progress</p>
                    </div>
                )}
            </div>
            <ActionSection />
        </>
    );
};