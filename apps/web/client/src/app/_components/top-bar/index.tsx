import { Routes } from "@/utils/constants";
import { Button } from "@onlook/ui/button";
import { Icons } from "@onlook/ui/icons/index";
import Link from "next/link";
import { useUserContext } from "../../_hooks/use-user";

export function TopBar() {
    const { user, handleSignOut } = useUserContext();
    return (
        <div className="w-full flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
                <Link href={Routes.HOME}>
                    <Icons.OnlookTextLogo className="h-3" />
                </Link>
                <Link href={Routes.PROJECTS}>GitHub</Link>
                <Link href={Routes.PROJECTS}>Docs</Link>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" asChild>
                    <Link href={Routes.PROJECTS}>Projects</Link>
                </Button>
                {user ? (
                    <div className="flex items-center gap-2">
                        <p>{typeof user.name === 'string' ? user.name : user.name.join(', ')}</p>
                        <Button onClick={handleSignOut}>
                            Sign Out
                        </Button>
                    </div>
                ) : (
                    <Button variant="outline" asChild>
                        <Link href={Routes.LOGIN}>Sign In</Link>
                    </Button>
                )}
            </div>
        </div>
    );
}