import { ProjectData } from '.';

// Step components for "New Onlook project" path
export const NewStep1 = ({
    formData,
    setProjectData,
}: {
    formData: ProjectData;
    setProjectData: (data: ProjectData) => void;
}) => (
    <div className="space-y-4">
        <h2 className="text-xl font-bold">Step 1: Project Details</h2>
        <input
            type="text"
            placeholder="Project Name"
            value={formData.projectName}
            onChange={(e) => setProjectData({ ...formData, projectName: e.target.value })}
            className="w-full p-2 border rounded"
        />
        <input
            type="text"
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setProjectData({ ...formData, description: e.target.value })}
            className="w-full p-2 border rounded"
        />
    </div>
);

export const NewStep2 = ({
    formData,
    setProjectData,
}: {
    formData: ProjectData;
    setProjectData: (data: ProjectData) => void;
}) => (
    <div className="space-y-4">
        <h2 className="text-xl font-bold">Step 2: React Setup</h2>
        <select
            value={formData.reactVersion}
            onChange={(e) => setProjectData({ ...formData, reactVersion: e.target.value })}
            className="w-full p-2 border rounded"
        >
            <option value="">Select React Version</option>
            <option value="18">React 18</option>
            <option value="17">React 17</option>
            <option value="16">React 16</option>
        </select>
    </div>
);
