import { useProjectsManager } from '@/components/Context';
import { Input } from '@/components/ui/input';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';

const ProjectNameInput = observer(() => {
    const projectsManager = useProjectsManager();
    const [projectName, setProjectName] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [originalName, setOriginalName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (projectsManager.project) {
            setProjectName(projectsManager.project.name);
            setOriginalName(projectsManager.project.name);
        }
    }, [projectsManager.project]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleRenameProject = () => {
        if (projectsManager.project && projectName.trim() !== '') {
            projectsManager.updateProject({ ...projectsManager.project, name: projectName.trim() });

            setIsEditing(false);
            setOriginalName(projectName.trim());
        } else {
            cancelRename();
        }
    };

    const cancelRename = () => {
        setProjectName(originalName);
        setIsEditing(false);
    };

    const handleStartEditing = () => {
        setIsEditing(true);
        setIsEditing(true);
        setOriginalName(projectName);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleRenameProject();
        } else if (e.key === 'Escape') {
            cancelRename();
        }
    };

    return (
        <div className="flex items-center">
            {isEditing ? (
                <Input
                    ref={inputRef}
                    value={projectName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setProjectName(e.target.value)
                    }
                    onKeyDown={handleKeyDown}
                    onBlur={handleRenameProject}
                    className="mx-0 max-w-[200px] px-1 py-0 h-6 text-foreground-onlook text-small"
                />
            ) : (
                <span
                    className="mx-0 max-w-[60px] md:max-w-[100px] lg:max-w-[200px] px-0 text-foreground-onlook text-small truncate cursor-pointer"
                    onDoubleClick={handleStartEditing}
                >
                    {projectsManager.project?.name}
                </span>
            )}
        </div>
    );
});

export default ProjectNameInput;
