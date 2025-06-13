'use client';

import { CardContent, CardHeader, CardTitle, CardDescription } from '@onlook/ui/card';
import { Card } from '@onlook/ui/card';
import { TopBar } from '../_components/top-bar';
import { ImportLocalProject } from './_components/import-local-project';
import { Icons } from '@onlook/ui/icons/index';
import { ImportProvider, useImport } from './_context/import-context';

const ImportPage = () => {
    const { selectedImportType, setSelectedImportType } = useImport();

    const handleCardClick = (type: 'local' | 'github') => {
        setSelectedImportType(type);
    };

    const handleKeyDown = (e: React.KeyboardEvent, type: 'local' | 'github') => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick(type);
        }
    };

    return (
        <div className="w-screen h-screen flex flex-col">
            <TopBar />
            <div className="flex items-center justify-center overflow-hidden w-full h-full gap-6 p-6">
                <Card 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${selectedImportType === 'local' ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                    onClick={() => handleCardClick('local')}
                    onKeyDown={(e) => handleKeyDown(e, 'local')}
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
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${selectedImportType === 'github' ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                    onClick={() => handleCardClick('github')}
                    onKeyDown={(e) => handleKeyDown(e, 'github')}
                    tabIndex={0}
                    role="button"
                    aria-label="Connect to GitHub"
                >
                    <CardHeader className="space-y-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icons.GitHubLogo className="w-6 h-6 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-xl">Connect to GitHub</CardTitle>
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

                {selectedImportType === 'local' && <ImportLocalProject />}
                {selectedImportType === 'github' && <div>GitHub integration coming soon...</div>}
            </div>
        </div>
    );
};

export const Page = () => {
    return (
        <ImportProvider>
            <ImportPage />
        </ImportProvider>
    );
};

export default Page;
