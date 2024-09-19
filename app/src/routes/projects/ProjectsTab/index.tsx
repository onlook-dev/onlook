import CreateProject from './Create';
import SelectProject from './Select';
import { Project } from '/common/models/project';

export function ProjectsTab() {
    const PROJECTS: Project[] = [
        // { id: 0, img: 'https://picsum.photos/id/237/200/300', title: 'Airbnb.com' },
        // { id: 1, img: 'https://picsum.photos/id/238/300/200', title: 'Netflix Clone' },
        // { id: 2, img: 'https://picsum.photos/id/239/500/500', title: 'Personal Portfolio' },
        // { id: 3, img: 'https://picsum.photos/id/240/100/1000', title: 'Amazon.com' },
        // { id: 4, img: 'https://picsum.photos/id/241/1000/100', title: 'X' },
        // { id: 5, img: 'https://picsum.photos/id/242/1000/1000', title: 'YC' },
    ];

    return (
        <div className="flex h-[calc(100vh-5.5rem)] w-full">
            {PROJECTS.length === 0 && <CreateProject />}
            {PROJECTS.length > 0 && <SelectProject projects={PROJECTS} />}
        </div>
    );
}
