'use client';

import { useState } from 'react';
import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { Textarea } from '@onlook/ui/textarea';
import { Badge } from '@onlook/ui/badge';
import { 
    Sparkles, 
    Smartphone, 
    Monitor, 
    Server, 
    Layers, 
    Chrome,
    RotateCcw,
    Download,
    ArrowRight,
    Check,
    Zap,
    Code,
    Palette,
    Database,
    Shield,
    Globe
} from 'lucide-react';

interface ProjectTemplate {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<any>;
    category: string;
    technologies: string[];
    features: string[];
    gradient: string;
    estimatedTime: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

const projectTemplates: ProjectTemplate[] = [
    {
        id: 'react-pwa',
        name: 'React PWA',
        description: 'Progressive Web App with React, TypeScript, and service workers for offline functionality',
        icon: RotateCcw,
        category: 'Web',
        technologies: ['React', 'TypeScript', 'PWA', 'Service Workers', 'TailwindCSS'],
        features: ['Offline Support', 'Push Notifications', 'Responsive Design', 'App-like Experience'],
        gradient: 'from-blue-500 to-cyan-500',
        estimatedTime: '15 min',
        difficulty: 'Intermediate'
    },
    {
        id: 'mobile-app',
        name: 'Mobile App',
        description: 'Cross-platform mobile application using React Native with native features',
        icon: Smartphone,
        category: 'Mobile',
        technologies: ['React Native', 'TypeScript', 'Expo', 'React Navigation', 'AsyncStorage'],
        features: ['Cross Platform', 'Native APIs', 'Push Notifications', 'Camera Integration'],
        gradient: 'from-purple-500 to-pink-500',
        estimatedTime: '25 min',
        difficulty: 'Advanced'
    },
    {
        id: 'desktop-app',
        name: 'Desktop App',
        description: 'Cross-platform desktop application built with Electron and modern web technologies',
        icon: Monitor,
        category: 'Desktop',
        technologies: ['Electron', 'React', 'TypeScript', 'Node.js', 'SQLite'],
        features: ['Cross Platform', 'File System Access', 'Native Menus', 'Auto Updates'],
        gradient: 'from-green-500 to-emerald-500',
        estimatedTime: '30 min',
        difficulty: 'Advanced'
    },
    {
        id: 'api-backend',
        name: 'API Backend',
        description: 'RESTful API backend with authentication, database integration, and comprehensive documentation',
        icon: Server,
        category: 'Backend',
        technologies: ['Node.js', 'Express', 'TypeScript', 'PostgreSQL', 'JWT'],
        features: ['REST API', 'Authentication', 'Database ORM', 'API Documentation'],
        gradient: 'from-orange-500 to-red-500',
        estimatedTime: '20 min',
        difficulty: 'Intermediate'
    },
    {
        id: 'fullstack-app',
        name: 'Full-Stack App',
        description: 'Complete full-stack application with React frontend, Node.js backend, and database',
        icon: Layers,
        category: 'Full-Stack',
        technologies: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'TailwindCSS'],
        features: ['Complete CRUD', 'User Authentication', 'Real-time Updates', 'Admin Dashboard'],
        gradient: 'from-indigo-500 to-purple-500',
        estimatedTime: '45 min',
        difficulty: 'Advanced'
    },
    {
        id: 'chrome-extension',
        name: 'Chrome Extension',
        description: 'Feature-rich Chrome extension with content scripts, background workers, and popup interface',
        icon: Chrome,
        category: 'Extension',
        technologies: ['Manifest V3', 'TypeScript', 'React', 'Chrome APIs', 'Storage API'],
        features: ['Content Scripts', 'Background Workers', 'Popup Interface', 'Options Page'],
        gradient: 'from-yellow-500 to-amber-500',
        estimatedTime: '18 min',
        difficulty: 'Beginner'
    }
];

const categories = ['All', 'Web', 'Mobile', 'Desktop', 'Backend', 'Full-Stack', 'Extension'];

const difficultyColors = {
    'Beginner': 'bg-green-500',
    'Intermediate': 'bg-yellow-500',
    'Advanced': 'bg-red-500'
};

interface ProjectConfig {
    name: string;
    description: string;
    template: ProjectTemplate | null;
    customOptions: {
        includeTests: boolean;
        includeDocker: boolean;
        includeCI: boolean;
        includeDocs: boolean;
    };
}

export function ProjectGenerator() {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
    const [projectConfig, setProjectConfig] = useState<ProjectConfig>({
        name: '',
        description: '',
        template: null,
        customOptions: {
            includeTests: true,
            includeDocker: false,
            includeCI: false,
            includeDocs: true
        }
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [step, setStep] = useState<'select' | 'configure' | 'generate'>('select');

    const filteredTemplates = selectedCategory === 'All' 
        ? projectTemplates 
        : projectTemplates.filter(template => template.category === selectedCategory);

    const selectTemplate = (template: ProjectTemplate) => {
        setSelectedTemplate(template);
        setProjectConfig(prev => ({ ...prev, template }));
        setStep('configure');
    };

    const generateProject = async () => {
        setIsGenerating(true);
        setStep('generate');
        
        // Simulate project generation
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        setIsGenerating(false);
    };

    const resetGenerator = () => {
        setSelectedTemplate(null);
        setProjectConfig({
            name: '',
            description: '',
            template: null,
            customOptions: {
                includeTests: true,
                includeDocker: false,
                includeCI: false,
                includeDocs: true
            }
        });
        setStep('select');
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                    Project Generator
                </h1>
                <p className="text-gray-400 mt-2">
                    Create React PWA, Mobile Apps, Desktop Apps, API Backend, and Full-Stack applications
                </p>
            </div>

            {step === 'select' && (
                <>
                    {/* Category Filter */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">Select Project Type</h2>
                        <div className="flex flex-wrap gap-2">
                            {categories.map((category) => (
                                <Button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    variant={selectedCategory === category ? "default" : "outline"}
                                    className={selectedCategory === category 
                                        ? "bg-orange-600 hover:bg-orange-700 text-white" 
                                        : "border-gray-700 text-gray-300 hover:bg-gray-800"
                                    }
                                >
                                    {category}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Template Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTemplates.map((template) => (
                            <Card 
                                key={template.id} 
                                className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-all duration-300 cursor-pointer group hover:shadow-xl hover:shadow-orange-500/10"
                                onClick={() => selectTemplate(template)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`p-3 rounded-lg bg-gradient-to-r ${template.gradient} shadow-lg`}>
                                            <template.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                {template.category}
                                            </Badge>
                                            <Badge className={`${difficultyColors[template.difficulty]} text-white text-xs`}>
                                                {template.difficulty}
                                            </Badge>
                                        </div>
                                    </div>
                                    <CardTitle className="text-white group-hover:text-orange-400 transition-colors">
                                        {template.name}
                                    </CardTitle>
                                    <CardDescription className="text-gray-400">
                                        {template.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="space-y-4">
                                        {/* Technologies */}
                                        <div>
                                            <div className="text-sm font-medium text-gray-300 mb-2">Technologies</div>
                                            <div className="flex flex-wrap gap-1">
                                                {template.technologies.slice(0, 3).map((tech, index) => (
                                                    <Badge key={index} variant="secondary" className="text-xs bg-gray-800 text-gray-300">
                                                        {tech}
                                                    </Badge>
                                                ))}
                                                {template.technologies.length > 3 && (
                                                    <Badge variant="secondary" className="text-xs bg-gray-800 text-gray-300">
                                                        +{template.technologies.length - 3}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* Features */}
                                        <div>
                                            <div className="text-sm font-medium text-gray-300 mb-2">Key Features</div>
                                            <div className="space-y-1">
                                                {template.features.slice(0, 2).map((feature, index) => (
                                                    <div key={index} className="flex items-center text-xs text-gray-400">
                                                        <Check className="w-3 h-3 mr-1 text-green-400" />
                                                        {feature}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Estimated Time */}
                                        <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                                            <div className="flex items-center text-xs text-gray-400">
                                                <Zap className="w-3 h-3 mr-1 text-blue-400" />
                                                {template.estimatedTime}
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}

            {step === 'configure' && selectedTemplate && (
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6 flex items-center gap-4">
                        <Button
                            onClick={resetGenerator}
                            variant="outline"
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                        >
                            ← Back
                        </Button>
                        <div>
                            <h2 className="text-xl font-semibold text-white">Configure Your {selectedTemplate.name}</h2>
                            <p className="text-gray-400 text-sm">Customize your project settings and features</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Configuration Form */}
                        <div className="lg:col-span-2">
                            <Card className="bg-gray-900 border-gray-800">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Code className="w-5 h-5 text-orange-400" />
                                        Project Configuration
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="project-name" className="text-gray-300">Project Name</Label>
                                            <Input
                                                id="project-name"
                                                value={projectConfig.name}
                                                onChange={(e) => setProjectConfig(prev => ({ ...prev, name: e.target.value }))}
                                                placeholder="my-awesome-project"
                                                className="bg-gray-800 border-gray-700 text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-gray-300">Template</Label>
                                            <div className="p-3 bg-gray-800 rounded-md border border-gray-700">
                                                <div className="flex items-center gap-2">
                                                    <selectedTemplate.icon className="w-4 h-4 text-orange-400" />
                                                    <span className="text-white font-medium">{selectedTemplate.name}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="project-description" className="text-gray-300">Description</Label>
                                        <Textarea
                                            id="project-description"
                                            value={projectConfig.description}
                                            onChange={(e) => setProjectConfig(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="A brief description of your project..."
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-gray-300 mb-3 block">Additional Features</Label>
                                        <div className="grid grid-cols-2 gap-4">
                                            {Object.entries(projectConfig.customOptions).map(([key, value]) => (
                                                <div key={key} className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id={key}
                                                        checked={value}
                                                        onChange={(e) => setProjectConfig(prev => ({
                                                            ...prev,
                                                            customOptions: {
                                                                ...prev.customOptions,
                                                                [key]: e.target.checked
                                                            }
                                                        }))}
                                                        className="rounded border-gray-700 bg-gray-800 text-orange-600 focus:ring-orange-500"
                                                    />
                                                    <Label htmlFor={key} className="text-gray-300 text-sm capitalize">
                                                        {key.replace(/([A-Z])/g, ' $1').toLowerCase().replace('include ', '')}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Button 
                                        onClick={generateProject}
                                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                                        disabled={!projectConfig.name}
                                    >
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Generate Project
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Template Preview */}
                        <div>
                            <Card className="bg-gray-900 border-gray-800">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Palette className="w-5 h-5 text-green-400" />
                                        Template Preview
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className={`p-4 rounded-lg bg-gradient-to-r ${selectedTemplate.gradient} text-white`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <selectedTemplate.icon className="w-5 h-5" />
                                                <span className="font-semibold">{selectedTemplate.name}</span>
                                            </div>
                                            <p className="text-sm opacity-90">{selectedTemplate.description}</p>
                                        </div>

                                        <div>
                                            <div className="text-sm font-medium text-gray-300 mb-2">Technologies Included</div>
                                            <div className="flex flex-wrap gap-1">
                                                {selectedTemplate.technologies.map((tech, index) => (
                                                    <Badge key={index} variant="secondary" className="text-xs bg-gray-800 text-gray-300">
                                                        {tech}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-sm font-medium text-gray-300 mb-2">Features</div>
                                            <div className="space-y-1">
                                                {selectedTemplate.features.map((feature, index) => (
                                                    <div key={index} className="flex items-center text-sm text-gray-400">
                                                        <Check className="w-3 h-3 mr-2 text-green-400" />
                                                        {feature}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-gray-800">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">Estimated Time:</span>
                                                <span className="text-white font-medium">{selectedTemplate.estimatedTime}</span>
                                            </div>
                                            <div className="flex justify-between text-sm mt-1">
                                                <span className="text-gray-400">Difficulty:</span>
                                                <Badge className={`${difficultyColors[selectedTemplate.difficulty]} text-white text-xs`}>
                                                    {selectedTemplate.difficulty}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {step === 'generate' && (
                <div className="max-w-2xl mx-auto text-center">
                    <div className="mb-8">
                        <div className={`inline-flex p-4 rounded-full bg-gradient-to-r ${selectedTemplate?.gradient} mb-4`}>
                            {isGenerating ? (
                                <Sparkles className="w-8 h-8 text-white animate-pulse" />
                            ) : (
                                <Check className="w-8 h-8 text-white" />
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {isGenerating ? 'Generating Your Project...' : 'Project Generated Successfully!'}
                        </h2>
                        <p className="text-gray-400">
                            {isGenerating 
                                ? 'Setting up your project structure, installing dependencies, and configuring tools...'
                                : 'Your project is ready! Download the files and start coding.'
                            }
                        </p>
                    </div>

                    {isGenerating ? (
                        <div className="space-y-4">
                            <div className="w-full bg-gray-800 rounded-full h-2">
                                <div className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-300 animate-pulse" style={{ width: '75%' }} />
                            </div>
                            <div className="text-sm text-gray-400">
                                Installing {selectedTemplate?.technologies.join(', ')}...
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Button className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white">
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Project
                                </Button>
                                <Button 
                                    onClick={resetGenerator}
                                    variant="outline"
                                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                                >
                                    Create Another Project
                                </Button>
                            </div>
                            <div className="text-sm text-gray-400">
                                Project: {projectConfig.name || 'Untitled Project'} • Template: {selectedTemplate?.name}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}