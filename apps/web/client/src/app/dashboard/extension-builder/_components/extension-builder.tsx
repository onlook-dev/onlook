'use client';

import { useState } from 'react';
import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { Textarea } from '@onlook/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@onlook/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { Badge } from '@onlook/ui/badge';
import { 
    Download, 
    FileCode, 
    Settings, 
    Globe, 
    Zap, 
    Eye,
    Code2,
    FileJson,
    FileText,
    Layers
} from 'lucide-react';

interface ExtensionConfig {
    name: string;
    version: string;
    description: string;
    manifestVersion: string;
    permissions: string[];
    contentScripts: {
        matches: string[];
        js: string[];
        css: string[];
    };
    background: {
        service_worker?: string;
        scripts?: string[];
    };
    action: {
        default_popup?: string;
        default_title?: string;
        default_icon?: Record<string, string>;
    };
}

export function ExtensionBuilder() {
    const [config, setConfig] = useState<ExtensionConfig>({
        name: '',
        version: '1.0.0',
        description: '',
        manifestVersion: '3',
        permissions: [],
        contentScripts: {
            matches: ['<all_urls>'],
            js: ['content.js'],
            css: ['content.css']
        },
        background: {
            service_worker: 'background.js'
        },
        action: {
            default_popup: 'popup.html',
            default_title: 'Extension Popup'
        }
    });

    const [activeTab, setActiveTab] = useState('basic');

    const availablePermissions = [
        'activeTab',
        'storage',
        'tabs',
        'background',
        'scripting',
        'webNavigation',
        'cookies',
        'history',
        'bookmarks',
        'downloads',
        'notifications'
    ];

    const togglePermission = (permission: string) => {
        setConfig(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permission)
                ? prev.permissions.filter(p => p !== permission)
                : [...prev.permissions, permission]
        }));
    };

    const generateManifest = () => {
        const manifest = {
            manifest_version: parseInt(config.manifestVersion),
            name: config.name,
            version: config.version,
            description: config.description,
            permissions: config.permissions,
            ...(config.manifestVersion === '3' ? {
                background: {
                    service_worker: config.background.service_worker
                }
            } : {
                background: {
                    scripts: config.background.scripts,
                    persistent: false
                }
            }),
            content_scripts: [{
                matches: config.contentScripts.matches,
                js: config.contentScripts.js,
                css: config.contentScripts.css
            }],
            action: config.action
        };

        return JSON.stringify(manifest, null, 2);
    };

    const downloadExtension = () => {
        // In a real implementation, this would package all files
        const manifest = generateManifest();
        const blob = new Blob([manifest], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'manifest.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Extension Builder
                </h1>
                <p className="text-gray-400 mt-2">
                    Build Chrome extensions with manifest files, service workers, and content scripts
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="lg:col-span-2">
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Settings className="w-5 h-5 text-blue-400" />
                                Extension Configuration
                            </CardTitle>
                            <CardDescription>
                                Configure your Chrome extension settings and permissions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="grid w-full grid-cols-4 bg-gray-800">
                                    <TabsTrigger value="basic" className="data-[state=active]:bg-blue-600">
                                        Basic Info
                                    </TabsTrigger>
                                    <TabsTrigger value="permissions" className="data-[state=active]:bg-blue-600">
                                        Permissions
                                    </TabsTrigger>
                                    <TabsTrigger value="scripts" className="data-[state=active]:bg-blue-600">
                                        Scripts
                                    </TabsTrigger>
                                    <TabsTrigger value="popup" className="data-[state=active]:bg-blue-600">
                                        Popup
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="basic" className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="name" className="text-gray-300">Extension Name</Label>
                                            <Input
                                                id="name"
                                                value={config.name}
                                                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                                                placeholder="My Awesome Extension"
                                                className="bg-gray-800 border-gray-700 text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="version" className="text-gray-300">Version</Label>
                                            <Input
                                                id="version"
                                                value={config.version}
                                                onChange={(e) => setConfig(prev => ({ ...prev, version: e.target.value }))}
                                                placeholder="1.0.0"
                                                className="bg-gray-800 border-gray-700 text-white"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="description" className="text-gray-300">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={config.description}
                                            onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="A brief description of your extension"
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="manifest-version" className="text-gray-300">Manifest Version</Label>
                                        <Select value={config.manifestVersion} onValueChange={(value) => setConfig(prev => ({ ...prev, manifestVersion: value }))}>
                                            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-800 border-gray-700">
                                                <SelectItem value="2">Manifest V2 (Legacy)</SelectItem>
                                                <SelectItem value="3">Manifest V3 (Recommended)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </TabsContent>

                                <TabsContent value="permissions" className="space-y-4">
                                    <div>
                                        <Label className="text-gray-300 mb-3 block">Select Permissions</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {availablePermissions.map((permission) => (
                                                <div
                                                    key={permission}
                                                    onClick={() => togglePermission(permission)}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                                        config.permissions.includes(permission)
                                                            ? 'border-blue-500 bg-blue-500/10'
                                                            : 'border-gray-700 hover:border-gray-600'
                                                    }`}
                                                >
                                                    <span className="text-white text-sm">{permission}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <Label className="text-gray-300">Selected Permissions:</Label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {config.permissions.map((permission) => (
                                                <Badge key={permission} variant="secondary" className="bg-blue-600 text-white">
                                                    {permission}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="scripts" className="space-y-4">
                                    <div>
                                        <Label className="text-gray-300">Content Script Matches</Label>
                                        <Input
                                            value={config.contentScripts.matches.join(', ')}
                                            onChange={(e) => setConfig(prev => ({
                                                ...prev,
                                                contentScripts: {
                                                    ...prev.contentScripts,
                                                    matches: e.target.value.split(', ').map(s => s.trim())
                                                }
                                            }))}
                                            placeholder="<all_urls>, https://*.example.com/*"
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-gray-300">JavaScript Files</Label>
                                            <Input
                                                value={config.contentScripts.js.join(', ')}
                                                onChange={(e) => setConfig(prev => ({
                                                    ...prev,
                                                    contentScripts: {
                                                        ...prev.contentScripts,
                                                        js: e.target.value.split(', ').map(s => s.trim())
                                                    }
                                                }))}
                                                placeholder="content.js, script.js"
                                                className="bg-gray-800 border-gray-700 text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-gray-300">CSS Files</Label>
                                            <Input
                                                value={config.contentScripts.css.join(', ')}
                                                onChange={(e) => setConfig(prev => ({
                                                    ...prev,
                                                    contentScripts: {
                                                        ...prev.contentScripts,
                                                        css: e.target.value.split(', ').map(s => s.trim())
                                                    }
                                                }))}
                                                placeholder="content.css, styles.css"
                                                className="bg-gray-800 border-gray-700 text-white"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="text-gray-300">Background Script</Label>
                                        <Input
                                            value={config.background.service_worker || config.background.scripts?.join(', ') || ''}
                                            onChange={(e) => setConfig(prev => ({
                                                ...prev,
                                                background: config.manifestVersion === '3'
                                                    ? { service_worker: e.target.value }
                                                    : { scripts: e.target.value.split(', ').map(s => s.trim()) }
                                            }))}
                                            placeholder={config.manifestVersion === '3' ? "background.js" : "background.js, script.js"}
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="popup" className="space-y-4">
                                    <div>
                                        <Label htmlFor="popup-html" className="text-gray-300">Popup HTML File</Label>
                                        <Input
                                            id="popup-html"
                                            value={config.action.default_popup || ''}
                                            onChange={(e) => setConfig(prev => ({
                                                ...prev,
                                                action: { ...prev.action, default_popup: e.target.value }
                                            }))}
                                            placeholder="popup.html"
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="popup-title" className="text-gray-300">Popup Title</Label>
                                        <Input
                                            id="popup-title"
                                            value={config.action.default_title || ''}
                                            onChange={(e) => setConfig(prev => ({
                                                ...prev,
                                                action: { ...prev.action, default_title: e.target.value }
                                            }))}
                                            placeholder="Extension Popup"
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview Panel */}
                <div className="space-y-6">
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Eye className="w-5 h-5 text-green-400" />
                                Live Preview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-800 rounded-lg">
                                    <h3 className="text-white font-semibold">{config.name || 'Extension Name'}</h3>
                                    <p className="text-gray-400 text-sm mt-1">{config.description || 'Extension description'}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs">v{config.version}</Badge>
                                        <Badge variant="outline" className="text-xs">MV{config.manifestVersion}</Badge>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Zap className="w-4 h-4 text-blue-400" />
                                        <span className="text-gray-300">{config.permissions.length} permissions</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <FileCode className="w-4 h-4 text-green-400" />
                                        <span className="text-gray-300">{config.contentScripts.js.length} content scripts</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Globe className="w-4 h-4 text-purple-400" />
                                        <span className="text-gray-300">{config.contentScripts.matches.length} site matches</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <FileJson className="w-5 h-5 text-yellow-400" />
                                Generated Files
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                                    <div className="flex items-center gap-2">
                                        <FileJson className="w-4 h-4 text-yellow-400" />
                                        <span className="text-white text-sm">manifest.json</span>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">Required</Badge>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-blue-400" />
                                        <span className="text-white text-sm">popup.html</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">Generated</Badge>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                                    <div className="flex items-center gap-2">
                                        <Code2 className="w-4 h-4 text-green-400" />
                                        <span className="text-white text-sm">content.js</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">Template</Badge>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-purple-400" />
                                        <span className="text-white text-sm">background.js</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">Template</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Button 
                        onClick={downloadExtension}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download Extension
                    </Button>
                </div>
            </div>
        </div>
    );
}