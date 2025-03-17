import { useProjectsManager } from '@/components/Context';
import { Input } from '@onlook/ui/input';
import { observer } from 'mobx-react-lite';
import React from 'react';

const MetaSection = observer(() => {
    const projectsManager = useProjectsManager();
    const project = projectsManager.project;
    
    const metaTitle = project?.metaTitle || '';
    const metaDescription = project?.metaDescription || '';

    return (
        <div className="space-y-4">
            <h2 className="text-lg">Meta Information</h2>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="w-1/3">
                        <p className="text-regularPlus text-muted-foreground">Title</p>
                        <p className="text-small text-muted-foreground">
                            Page title for search engines
                        </p>
                    </div>
                    <Input
                        id="metaTitle"
                        value={metaTitle}
                        onChange={(e) =>
                            projectsManager.updatePartialProject({
                                metaTitle: e.target.value,
                            })
                        }
                        placeholder="Enter page title"
                        className="w-2/3 bg-background placeholder:text-muted-foreground"
                    />
                </div>
                <div className="flex justify-between items-center">
                    <div className="w-1/3">
                        <p className="text-regularPlus text-muted-foreground">Description</p>
                        <p className="text-small text-muted-foreground">
                            Page description for search engines
                        </p>
                    </div>
                    <Input
                        id="metaDescription"
                        value={metaDescription}
                        onChange={(e) =>
                            projectsManager.updatePartialProject({
                                metaDescription: e.target.value,
                            })
                        }
                        placeholder="Enter page description"
                        className="w-2/3 bg-background placeholder:text-muted-foreground"
                    />
                </div>
            </div>
        </div>
    );
});

export default MetaSection;
