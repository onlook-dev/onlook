'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Badge } from '@onlook/ui/badge';
import { Button } from '@onlook/ui/button';
import { 
    Activity, 
    Cpu, 
    HardDrive, 
    MemoryStick, 
    Wifi, 
    RefreshCw,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Minus,
    Zap,
    Clock,
    Server
} from 'lucide-react';

interface SystemMetrics {
    cpu: {
        usage: number;
        cores: number;
        temperature: number;
        frequency: number;
    };
    memory: {
        used: number;
        total: number;
        available: number;
        cached: number;
    };
    storage: {
        used: number;
        total: number;
        drives: Array<{
            name: string;
            used: number;
            total: number;
            type: string;
        }>;
    };
    network: {
        uploadSpeed: number;
        downloadSpeed: number;
        totalUploaded: number;
        totalDownloaded: number;
        connections: number;
    };
    system: {
        uptime: number;
        processes: number;
        loadAverage: number[];
        platform: string;
        version: string;
    };
}

// Mock data generator for demonstration
const generateMockMetrics = (): SystemMetrics => ({
    cpu: {
        usage: Math.floor(Math.random() * 80) + 10,
        cores: 8,
        temperature: Math.floor(Math.random() * 30) + 45,
        frequency: Math.floor(Math.random() * 1000) + 2400
    },
    memory: {
        used: Math.floor(Math.random() * 8) + 4,
        total: 16,
        available: Math.floor(Math.random() * 4) + 6,
        cached: Math.floor(Math.random() * 2) + 1
    },
    storage: {
        used: Math.floor(Math.random() * 200) + 300,
        total: 512,
        drives: [
            {
                name: 'System (C:)',
                used: Math.floor(Math.random() * 150) + 200,
                total: 256,
                type: 'SSD'
            },
            {
                name: 'Data (D:)',
                used: Math.floor(Math.random() * 100) + 50,
                total: 256,
                type: 'SSD'
            }
        ]
    },
    network: {
        uploadSpeed: Math.floor(Math.random() * 50) + 10,
        downloadSpeed: Math.floor(Math.random() * 100) + 20,
        totalUploaded: Math.floor(Math.random() * 1000) + 2000,
        totalDownloaded: Math.floor(Math.random() * 2000) + 5000,
        connections: Math.floor(Math.random() * 20) + 15
    },
    system: {
        uptime: Math.floor(Math.random() * 86400) + 172800, // 2-3 days
        processes: Math.floor(Math.random() * 50) + 150,
        loadAverage: [
            Math.random() * 2,
            Math.random() * 2,
            Math.random() * 2
        ],
        platform: 'Windows 11',
        version: '23H2'
    }
});

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
};

const getStatusColor = (percentage: number): string => {
    if (percentage > 80) return 'text-red-400';
    if (percentage > 60) return 'text-yellow-400';
    return 'text-green-400';
};

const getStatusBadge = (percentage: number): { color: string; label: string } => {
    if (percentage > 80) return { color: 'bg-red-500', label: 'High' };
    if (percentage > 60) return { color: 'bg-yellow-500', label: 'Medium' };
    return { color: 'bg-green-500', label: 'Normal' };
};

const getTrendIcon = (value: number) => {
    if (value > 0.1) return <TrendingUp className="w-4 h-4 text-red-400" />;
    if (value < -0.1) return <TrendingDown className="w-4 h-4 text-green-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
};

export function SystemMonitor() {
    const [metrics, setMetrics] = useState<SystemMetrics>(generateMockMetrics());
    const [isLoading, setIsLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    const refreshMetrics = () => {
        setIsLoading(true);
        setTimeout(() => {
            setMetrics(generateMockMetrics());
            setLastUpdate(new Date());
            setIsLoading(false);
        }, 500);
    };

    useEffect(() => {
        if (autoRefresh) {
            const interval = setInterval(refreshMetrics, 5000);
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const cpuUsage = metrics.cpu.usage;
    const memoryUsage = (metrics.memory.used / metrics.memory.total) * 100;
    const storageUsage = (metrics.storage.used / metrics.storage.total) * 100;

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                        System Monitor
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Real-time monitoring of system resources and performance
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-400">
                        Last updated: {lastUpdate.toLocaleTimeString()}
                    </div>
                    <Button
                        onClick={refreshMetrics}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                        className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        variant={autoRefresh ? "default" : "outline"}
                        size="sm"
                        className={autoRefresh ? "bg-green-600 hover:bg-green-700" : "border-gray-700 text-gray-300 hover:bg-gray-800"}
                    >
                        {autoRefresh ? <Zap className="w-4 h-4 mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
                        {autoRefresh ? 'Auto Refresh' : 'Manual'}
                    </Button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* CPU Card */}
                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <Cpu className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-white text-sm font-medium">CPU Usage</CardTitle>
                                    <CardDescription className="text-xs">{metrics.cpu.cores} cores</CardDescription>
                                </div>
                            </div>
                            <Badge className={`${getStatusBadge(cpuUsage).color} text-white text-xs`}>
                                {getStatusBadge(cpuUsage).label}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="text-2xl font-bold text-white">{cpuUsage}%</div>
                            <div className="w-full bg-gray-800 rounded-full h-2">
                                <div 
                                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${cpuUsage}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>{metrics.cpu.frequency} MHz</span>
                                <span>{metrics.cpu.temperature}°C</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Memory Card */}
                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                    <MemoryStick className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-white text-sm font-medium">Memory</CardTitle>
                                    <CardDescription className="text-xs">{metrics.memory.total} GB total</CardDescription>
                                </div>
                            </div>
                            <Badge className={`${getStatusBadge(memoryUsage).color} text-white text-xs`}>
                                {getStatusBadge(memoryUsage).label}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="text-2xl font-bold text-white">{memoryUsage.toFixed(1)}%</div>
                            <div className="w-full bg-gray-800 rounded-full h-2">
                                <div 
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${memoryUsage}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>{metrics.memory.used} GB used</span>
                                <span>{metrics.memory.available} GB free</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Storage Card */}
                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-green-500/20 rounded-lg">
                                    <HardDrive className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-white text-sm font-medium">Storage</CardTitle>
                                    <CardDescription className="text-xs">{metrics.storage.total} GB total</CardDescription>
                                </div>
                            </div>
                            <Badge className={`${getStatusBadge(storageUsage).color} text-white text-xs`}>
                                {getStatusBadge(storageUsage).label}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="text-2xl font-bold text-white">{storageUsage.toFixed(1)}%</div>
                            <div className="w-full bg-gray-800 rounded-full h-2">
                                <div 
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${storageUsage}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>{metrics.storage.used} GB used</span>
                                <span>{metrics.storage.total - metrics.storage.used} GB free</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Network Card */}
                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-orange-500/20 rounded-lg">
                                    <Wifi className="w-5 h-5 text-orange-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-white text-sm font-medium">Network</CardTitle>
                                    <CardDescription className="text-xs">{metrics.network.connections} connections</CardDescription>
                                </div>
                            </div>
                            <Badge className="bg-blue-600 text-white text-xs">
                                Active
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-400">↓ {metrics.network.downloadSpeed} Mbps</span>
                                <span className="text-sm text-gray-400">↑ {metrics.network.uploadSpeed} Mbps</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Total: ↓ {formatBytes(metrics.network.totalDownloaded * 1024 * 1024)}</span>
                                <span>↑ {formatBytes(metrics.network.totalUploaded * 1024 * 1024)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Information */}
                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Server className="w-5 h-5 text-blue-400" />
                            System Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-gray-400">Platform</div>
                                    <div className="text-white font-medium">{metrics.system.platform}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-400">Version</div>
                                    <div className="text-white font-medium">{metrics.system.version}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-400">Uptime</div>
                                    <div className="text-white font-medium">{formatUptime(metrics.system.uptime)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-400">Processes</div>
                                    <div className="text-white font-medium">{metrics.system.processes}</div>
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-400 mb-2">Load Average</div>
                                <div className="flex gap-4">
                                    {metrics.system.loadAverage.map((load, index) => (
                                        <div key={index} className="text-center">
                                            <div className="text-white font-medium">{load.toFixed(2)}</div>
                                            <div className="text-xs text-gray-400">{index === 0 ? '1m' : index === 1 ? '5m' : '15m'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Storage Details */}
                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <HardDrive className="w-5 h-5 text-green-400" />
                            Storage Drives
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {metrics.storage.drives.map((drive, index) => {
                                const driveUsage = (drive.used / drive.total) * 100;
                                return (
                                    <div key={index} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="text-white font-medium">{drive.name}</div>
                                                <div className="text-xs text-gray-400">{drive.type}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-white font-medium">{driveUsage.toFixed(1)}%</div>
                                                <div className="text-xs text-gray-400">{drive.used}GB / {drive.total}GB</div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-800 rounded-full h-2">
                                            <div 
                                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${driveUsage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}