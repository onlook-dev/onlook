'use client';

import { useGetBackground } from '@/hooks/use-get-background';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons/index';
import { toast } from '@onlook/ui/sonner';
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
            <div className="flex items-center justify-center overflow-hidden w-full h-full gap-6 p-6">
                <Card
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]`}
                    onClick={() => handleCardClick('local')}
                    tabIndex={0}
                    role="button"
                    aria-label="Import local project"
                >
                    <CardHeader className="space-y-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icons.Directory className="w-6 h-6 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-xl">Import Local Project</CardTitle>
                            <CardDescription className="text-base">
                                Import your existing project from your local machine
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Select a directory from your computer to start working with your project in Onlook
                        </p>
                    </CardContent>
                </Card>

                <Card
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]`}
                    onClick={() => handleCardClick('github')}
                    tabIndex={0}
                    role="button"
                    aria-label="Connect to GitHub"
                >
                    <CardHeader className="space-y-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icons.GitHubLogo className="w-6 h-6 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-xl">Import from GitHub</CardTitle>
                            <CardDescription className="text-base">
                                Import your project directly from GitHub
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Connect your GitHub account to access and work with your repositories
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Page;
