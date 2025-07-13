'use client';

import { DashboardLayout } from '../_components/dashboard-layout';
import { ExtensionBuilder } from './_components/extension-builder';

export default function ExtensionBuilderPage() {
    return (
        <DashboardLayout>
            <ExtensionBuilder />
        </DashboardLayout>
    );
}