import { SelectProject } from './_components/select';
import { TopBar } from './_components/top-bar';

const Projects = () => {
    return (
        <div className="w-full h-full">
            <TopBar />
            <div className="flex justify-center overflow-hidden w-full">
                <SelectProject />
            </div>
        </div>
    );
};

export default Projects;