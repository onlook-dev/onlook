'use client';

import { useGetBackground } from '@/hooks/use-get-background';
import { Card, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { useRouter } from 'next/navigation';
import { TopBar } from '../_components/top-bar';

const Page = () => {
    const router = useRouter();
    const handleCardClick = (type: 'local' | 'github') => {
        router.push(`/projects/import/${type}`);
    };
    const backgroundUrl = useGetBackground('create');


    return (
        <div className="w-screen h-screen flex flex-col"
            style={{
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundImage: `url(${backgroundUrl})`,
            }}
        >
            <TopBar />
            <div className="flex items-center justify-center overflow-hidden max-w-4xl mx-auto w-full flex-1 gap-6 p-6 select-none">
                <Card
                    className={`w-full h-64 cursor-pointer transition-all duration-200 bg-background/80 backdrop-blur-xl hover:shadow-lg hover:scale-[1.02] border-[0.5px] border-foreground-tertiary/50`}
                    onClick={() => handleCardClick('local')}
                    tabIndex={0}
                    role="button"
                    aria-label="Import local project"
                >
                    <CardHeader className="flex flex-col justify-between h-full">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center select-none">
                            <Icons.Upload className="w-6 h-6 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-title3">Import a Local Project</CardTitle>
                            <CardDescription className="text-sm text-balance">
                                Select a directory from your computer to start working with your project in Onlook.
                            </CardDescription>
                        </div>
                    </CardHeader>
                </Card>
                <Card
                    className={`w-full h-64 pointer-events-none opacity-100 cursor-not-allowed bg-background-tertiary/10 backdrop-blur-xl transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-[0.5px] border-foreground-tertiary/50`}
                    onClick={() => handleCardClick('github')}
                    tabIndex={0}
                    role="button"
                    aria-label="Connect to GitHub"
                >
                    <CardHeader className="flex flex-col justify-between h-full opacity-30">
                        <div className="flex flex-row justify-between w-full">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center select-none">
                                <Icons.GitHubLogo className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex items-center gap-2 bg-primary/10 rounded-full px-3 py-1 w-fit h-6">
                                <p className="text-mini uppercase text-foreground-secondary">Coming Soon</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-title3">Import from GitHub</CardTitle>
                            <CardDescription className="text-sm text-balance text-foreground-secondary">
                                Connect your GitHub account to access and work with your repositories
                            </CardDescription>
                        </div>
                    </CardHeader>
                </Card>
            </div>
        </div>
    );
};

export default Page;
