'use client';

import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { 
    Code, 
    Monitor, 
    Brain, 
    Shield, 
    Database, 
    Sparkles, 
    Terminal, 
    FolderOpen, 
    Palette,
    ArrowRight,
    Zap,
    Globe,
    Smartphone
} from 'lucide-react';
import Link from 'next/link';

const tools = [
    {
        id: 'extension-builder',
        title: 'Extension Builder',
        description: 'Build Chrome extensions with manifest files, service workers, and content scripts',
        icon: Code,
        href: '/dashboard/extension-builder',
        category: 'Development',
        gradient: 'from-blue-500 to-cyan-500',
        features: ['Manifest Generator', 'Service Workers', 'Content Scripts', 'HTML Templates']
    },
    {
        id: 'system-monitor',
        title: 'System Monitor',
        description: 'Real-time monitoring of CPU, memory, storage, and network usage',
        icon: Monitor,
        href: '/dashboard/system-monitor',
        category: 'Monitoring',
        gradient: 'from-green-500 to-emerald-500',
        features: ['CPU Usage', 'Memory Stats', 'Storage Info', 'Network Monitor']
    },
    {
        id: 'ai-studio',
        title: 'AI Wrapper Studio',
        description: 'Advanced AI tools for face recognition, custom models, and API management',
        icon: Brain,
        href: '/dashboard/ai-studio',
        category: 'AI/ML',
        gradient: 'from-purple-500 to-pink-500',
        features: ['Face Recognition', 'Custom Models', 'API Management', 'Training Tools']
    },
    {
        id: 'security-suite',
        title: 'Security Suite',
        description: 'Vulnerability scanning, code analysis, and comprehensive security monitoring',
        icon: Shield,
        href: '/dashboard/security',
        category: 'Security',
        gradient: 'from-red-500 to-orange-500',
        features: ['Vulnerability Scan', 'Code Analysis', 'Security Monitor', 'Audit Reports']
    },
    {
        id: 'database-manager',
        title: 'Database Manager',
        description: 'Multi-database management with powerful query builder and admin tools',
        icon: Database,
        href: '/dashboard/database',
        category: 'Database',
        gradient: 'from-indigo-500 to-blue-500',
        features: ['Multi-DB Support', 'Query Builder', 'Admin Panel', 'Backup Tools']
    },
    {
        id: 'project-generator',
        title: 'Project Generator',
        description: 'Create React PWA, Mobile Apps, Desktop Apps, API Backend, and Full-Stack applications',
        icon: Sparkles,
        href: '/dashboard/project-generator',
        category: 'Generators',
        gradient: 'from-yellow-500 to-amber-500',
        features: ['React PWA', 'Mobile Apps', 'Desktop Apps', 'API Backend']
    },
    {
        id: 'portfolio-generator',
        title: 'Portfolio Generator',
        description: 'Create stunning portfolio websites with custom themes and deployment options',
        icon: Palette,
        href: '/dashboard/portfolio-generator',
        category: 'Generators',
        gradient: 'from-teal-500 to-cyan-500',
        features: ['Custom Themes', 'Project Showcase', 'Skills Display', 'Auto Deploy']
    },
    {
        id: 'terminal',
        title: 'Terminal',
        description: 'Advanced terminal with CLI commands, system info, and multiple sessions',
        icon: Terminal,
        href: '/dashboard/terminal',
        category: 'Development',
        gradient: 'from-gray-500 to-slate-500',
        features: ['Multiple Sessions', 'CLI Commands', 'System Info', 'Custom Scripts']
    },
    {
        id: 'file-manager',
        title: 'File Manager',
        description: 'Complete file management with navigation, search, upload, and organization',
        icon: FolderOpen,
        href: '/dashboard/file-manager',
        category: 'Utilities',
        gradient: 'from-violet-500 to-purple-500',
        features: ['File Navigation', 'Search & Filter', 'Upload/Download', 'Organization']
    },
    {
        id: 'playground',
        title: 'Code Playground',
        description: 'Real-time code editing, preview, and deployment with multiple languages',
        icon: Code,
        href: '/dashboard/playground',
        category: 'Development',
        gradient: 'from-rose-500 to-pink-500',
        features: ['Live Preview', 'Multi-Language', 'Real-time Editing', 'Deploy Options']
    }
];

export function ToolGrid() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
                <Card key={tool.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-all duration-300 group hover:shadow-xl hover:shadow-blue-500/10">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className={`p-3 rounded-lg bg-gradient-to-r ${tool.gradient} shadow-lg`}>
                                <tool.icon className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xs font-medium text-gray-400 bg-gray-800 px-2 py-1 rounded-full">
                                {tool.category}
                            </span>
                        </div>
                        <CardTitle className="text-white group-hover:text-blue-400 transition-colors">
                            {tool.title}
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                            {tool.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                {tool.features.map((feature, index) => (
                                    <div key={index} className="flex items-center text-xs text-gray-500">
                                        <Zap className="w-3 h-3 mr-1 text-blue-400" />
                                        {feature}
                                    </div>
                                ))}
                            </div>
                            <Link href={tool.href} className="block">
                                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 group-hover:shadow-lg transition-all duration-300">
                                    Open Tool
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}