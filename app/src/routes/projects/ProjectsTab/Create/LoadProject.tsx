import { ProjectData } from '.';

// Step components for "Load existing project" path
export const LoadStep1 = ({
    formData,
    setProjectData,
}: {
    formData: ProjectData;
    setProjectData: (data: ProjectData) => void;
}) => (
    <div className="space-y-4">
        <h2 className="text-xl font-bold">Step 1: Select Project</h2>
        <input
            type="text"
            placeholder="Project Name"
            value={formData.projectName}
            onChange={(e) => setProjectData({ ...formData, projectName: e.target.value })}
            className="w-full p-2 border rounded"
        />
    </div>
);

export const LoadStep2 = ({
    formData,
    setProjectData,
}: {
    formData: ProjectData;
    setProjectData: (data: ProjectData) => void;
}) => (
    <div className="space-y-4">
        <h2 className="text-xl font-bold">Step 2: Configure</h2>
        <select
            value={formData.projectType}
            onChange={(e) => setProjectData({ ...formData, projectType: e.target.value })}
            className="w-full p-2 border rounded"
        >
            <option value="">Select Project Type</option>
            <option value="react">React</option>
            <option value="vue">Vue</option>
            <option value="angular">Angular</option>
        </select>
    </div>
);
