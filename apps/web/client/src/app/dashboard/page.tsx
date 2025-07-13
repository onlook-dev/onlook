'use client';

import { DashboardLayout } from './_components/dashboard-layout';
import { ToolGrid } from './_components/tool-grid';

export default function Dashboard() {
    return (
        <DashboardLayout>
            <div className="container mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                        GeauxCode Development Platform
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Your comprehensive toolkit for modern development
                    </p>
                </div>
                <ToolGrid />
            </div>
        </DashboardLayout>
    );
}