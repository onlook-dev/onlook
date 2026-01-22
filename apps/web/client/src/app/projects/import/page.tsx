'use client';

import { useRouter } from 'next/navigation';

import { Card, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';

const Page = () => {
    const router = useRouter();
    const handleCardClick = (type: 'local' | 'github') => {
        router.push(`/projects/import/${type}`);
    };

    return (
        <div className="flex w-full max-w-4xl gap-6 p-6 select-none">
            <Card
                className={`bg-background/80 border-foreground-tertiary/50 h-64 w-full cursor-pointer border-[0.5px] backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-lg`}
                onClick={() => handleCardClick('local')}
                tabIndex={0}
                role="button"
                aria-label="Import local project"
            >
                <CardHeader className="flex h-full flex-col justify-between">
                    <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg select-none">
                        <Icons.Upload className="text-primary h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-title3">Import a Local Project</CardTitle>
                        <CardDescription className="text-sm text-balance">
                            Select a directory from your computer to start working with your project
                            in Onlook.
                        </CardDescription>
                    </div>
                </CardHeader>
            </Card>
            <Card
                className={
                    'bg-background/80 border-foreground-tertiary/50 h-64 w-full cursor-pointer border-[0.5px] backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-lg'
                }
                onClick={() => handleCardClick('github')}
                tabIndex={0}
                role="button"
                aria-label="Connect to GitHub"
            >
                <CardHeader className="flex h-full flex-col justify-between">
                    <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg select-none">
                        <Icons.GitHubLogo className="text-primary h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-title3">Import from GitHub</CardTitle>
                        <CardDescription className="text-sm text-balance">
                            Connect your GitHub account to access and work with your repositories
                        </CardDescription>
                    </div>
                </CardHeader>
            </Card>
        </div>
    );
};

export default Page;
