'use client';

import { DashboardLayout } from '../_components/dashboard-layout';
import { ProjectGenerator } from './_components/project-generator';

export default function ProjectGeneratorPage() {
    return (
        <DashboardLayout>
            <ProjectGenerator />
        </DashboardLayout>
    );
}