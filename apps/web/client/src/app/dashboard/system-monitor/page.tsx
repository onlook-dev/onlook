'use client';

import { DashboardLayout } from '../_components/dashboard-layout';
import { SystemMonitor } from './_components/system-monitor';

export default function SystemMonitorPage() {
    return (
        <DashboardLayout>
            <SystemMonitor />
        </DashboardLayout>
    );
}