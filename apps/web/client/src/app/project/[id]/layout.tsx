import { api } from "@/trpc/server";
import { Routes } from "@/utils/constants";
import { SUPPORT_EMAIL } from "@onlook/constants";
import { Icons } from "@onlook/ui/icons/index";
import Link from "next/link";

export default async function Layout({ params, children }: Readonly<{ params: Promise<{ id: string }>, children: React.ReactNode }>) {
    const projectId = (await params).id;
    const hasAccess = await api.project.hasAccess({ projectId });
    if (!hasAccess) {
        return <NoAccess />;
    }
    return <>{children}</>;
}

const NoAccess = () => {
    return (
        <main className="flex flex-1 flex-col items-center justify-center h-screen w-screen p-4 text-center">
            <div className="space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-foreground-primary">Access denied</h1>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground-primary">{`Please contact the project owner to request access.`}</h2>
                    <p className="text-foreground-secondary">
                        {`Please email `}
                        <Link href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
                            {SUPPORT_EMAIL}
                        </Link>
                        {` if you believe this is an error.`}
                    </p>
                </div>

                <Link
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    href={Routes.PROJECTS}
                >
                    <Icons.ArrowLeft className="h-4 w-4" />
                    Back to projects
                </Link>
            </div>
        </main>
    );
};