'use client';

import { useState } from 'react';
import { Button } from '@onlook/ui/button';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { Badge } from '@onlook/ui/badge';
import { Plus, Link, Trash2, Copy, RefreshCw } from 'lucide-react';

import { api } from '@/trpc/react';

interface SandboxManagerProps {
    sandboxId: string | null;
    onSandboxChange: (sandboxId: string | null) => void;
    isConnected: boolean;
}

export function SandboxManager({ sandboxId, onSandboxChange, isConnected }: SandboxManagerProps) {
    const [inputSandboxId, setInputSandboxId] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    
    const createSandbox = api.sandbox.create.useMutation({
        onSuccess: (data) => {
            onSandboxChange(data.sandboxId);
            setInputSandboxId('');
        },
    });
    
    const handleCreate = async () => {
        setIsCreating(true);
        try {
            await createSandbox.mutateAsync({
                title: `Test Sandbox - ${new Date().toLocaleString()}`,
            });
        } catch (error) {
            console.error('Failed to create sandbox:', error);
        } finally {
            setIsCreating(false);
        }
    };
    
    const handleConnect = () => {
        if (inputSandboxId.trim()) {
            onSandboxChange(inputSandboxId.trim());
            setInputSandboxId('');
        }
    };
    
    const handleDisconnect = () => {
        onSandboxChange(null);
    };
    
    const handleFork = () => {
        // TODO: Implement fork functionality
        console.log('Fork sandbox:', sandboxId);
    };
    
    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this sandbox?')) {
            // TODO: Implement delete functionality
            console.log('Delete sandbox:', sandboxId);
            handleDisconnect();
        }
    };
    
    return (
        <div className="h-full flex flex-col bg-gray-900 text-gray-100">
            <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold">Sandbox Manager</h2>
                <p className="text-sm text-gray-400 mt-1">
                    Create, connect, and manage sandboxes
                </p>
            </div>
            
            <Tabs defaultValue="sandbox" className="flex-1 flex flex-col">
                <TabsList className="w-full rounded-none border-b border-gray-800">
                    <TabsTrigger value="sandbox" className="flex-1">Sandbox</TabsTrigger>
                    <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="sandbox" className="flex-1 p-4 space-y-4 overflow-y-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Current Sandbox</span>
                                <Badge variant={isConnected ? 'default' : 'secondary'}>
                                    {isConnected ? 'Connected' : 'Disconnected'}
                                </Badge>
                            </CardTitle>
                            <CardDescription>
                                {sandboxId ? `ID: ${sandboxId}` : 'No sandbox connected'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!sandboxId ? (
                                <>
                                    <Button
                                        onClick={handleCreate}
                                        disabled={isCreating}
                                        className="w-full"
                                        size="lg"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        {isCreating ? 'Creating...' : 'Create New Sandbox'}
                                    </Button>
                                    
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-gray-700" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-gray-900 px-2 text-gray-400">
                                                Or connect existing
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="sandbox-id">Sandbox ID</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="sandbox-id"
                                                value={inputSandboxId}
                                                onChange={(e) => setInputSandboxId(e.target.value)}
                                                placeholder="e.g., q6nm3f"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleConnect();
                                                }}
                                            />
                                            <Button
                                                onClick={handleConnect}
                                                disabled={!inputSandboxId.trim()}
                                            >
                                                <Link className="w-4 h-4 mr-2" />
                                                Connect
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            onClick={handleFork}
                                            variant="outline"
                                            className="w-full"
                                            disabled
                                        >
                                            <Copy className="w-4 h-4 mr-2" />
                                            Fork
                                        </Button>
                                        <Button
                                            onClick={handleDelete}
                                            variant="outline"
                                            className="w-full text-red-500 hover:text-red-400"
                                            disabled
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                        </Button>
                                    </div>
                                    
                                    <Button
                                        onClick={handleDisconnect}
                                        variant="secondary"
                                        className="w-full"
                                    >
                                        Disconnect
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    
                    {sandboxId && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => window.open(`https://codesandbox.io/s/${sandboxId}`, '_blank')}
                                >
                                    Open in CodeSandbox
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    disabled
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Restart Sandbox
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                
                <TabsContent value="settings" className="flex-1 p-4 space-y-4 overflow-y-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sync Configuration</CardTitle>
                            <CardDescription>
                                Configure file syncing behavior
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Include Patterns</Label>
                                <div className="text-xs text-gray-400 space-y-1">
                                    <code className="block">src/**</code>
                                    <code className="block">package.json</code>
                                    <code className="block">*.config.js</code>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Exclude Patterns</Label>
                                <div className="text-xs text-gray-400 space-y-1">
                                    <code className="block">node_modules/**</code>
                                    <code className="block">.git/**</code>
                                    <code className="block">.next/**</code>
                                    <code className="block">dist/**</code>
                                    <code className="block">build/**</code>
                                </div>
                            </div>
                            
                            <div className="pt-2">
                                <p className="text-xs text-gray-500">
                                    Patterns use glob syntax. Changes require reconnection.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}