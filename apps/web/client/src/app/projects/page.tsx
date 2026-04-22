'use client';

import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { NonProjectSettingsModal } from '@/components/ui/settings-modal/non-project';
import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import { DEFAULT_LOCAL_CONFIG } from '@onlook/models';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SelectProject } from './_components/select';
import { TopBar } from './_components/top-bar';

/**
 * 检测 URL 中是否包含本地 Agent 连接参数
 * 当用户通过 VSCode "Open in Browser" 打开时，URL 中会携带这些参数
 * 优先查找已有项目（按 localPath 去重），不存在才创建新项目
 */
function useLocalAgentAutoConnect() {
    const router = useRouter();
    const { data: user } = api.user.get.useQuery();
    const { mutateAsync: createProject } = api.project.create.useMutation();
    // 注意：findByLocalPath 是 query，但我们需要在 effect 中手动调用
    // 所以使用 refetch 方式或直接用 trpc client
    const utils = api.useUtils();

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        const localAgent = params.get('localAgent');
        const token = params.get('token');
        const workspacePath = params.get('workspacePath');

        // 没有 localAgent 参数，不做处理
        if (!localAgent || !token) return;

        // 已经登录才创建项目
        if (!user?.id) return;

        // 防止重复执行（用 sessionStorage 标记）
        const key = `onlook_local_connect_${token}`;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');

        const connectParams = new URLSearchParams({
            localAgent,
            token,
        });
        if (workspacePath) {
            connectParams.set('workspacePath', workspacePath);
        }

        // 如果有 workspacePath，先查找已有项目
        if (workspacePath) {
            utils.project.findByLocalPath.fetch({ localPath: workspacePath }).then((existing) => {
                if (existing) {
                    // 复用已有项目
                    const projectUrl = `${Routes.PROJECT}/${existing.projectId}?${connectParams.toString()}`;
                    toast.success('已连接到现有项目');
                    router.replace(projectUrl);
                    return;
                }
                // 没有已有项目，创建新的
                createNewProject();
            }).catch(() => {
                // 查找失败，直接创建
                createNewProject();
            });
        } else {
            createNewProject();
        }

        function createNewProject() {
            createProject({
                project: {
                    name: 'Local Project',
                    description: `Local VSCode project - ${workspacePath ?? 'unknown path'}`,
                    tags: ['local'],
                },
                userId: user!.id,
                environment: 'local_vscode' as const,
                localPath: workspacePath ?? undefined,
                localConfig: DEFAULT_LOCAL_CONFIG,
            }).then((newProject) => {
                if (newProject) {
                    const projectUrl = `${Routes.PROJECT}/${newProject.id}?${connectParams.toString()}`;
                    toast.success('VSCode 扩展已连接，正在打开项目...');
                    router.replace(projectUrl);
                }
            }).catch((error) => {
                console.error('自动创建本地项目失败:', error);
                toast.error('创建本地项目失败', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                });
            });
        }
    }, [user?.id]);
}

const Page = observer(() => {
    const [searchQuery, setSearchQuery] = useState('');

    // 检测本地 Agent 连接参数，自动创建项目
    useLocalAgentAutoConnect();

    return (
        <div className="w-screen h-screen flex flex-col">
            <TopBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
            <div className="flex justify-center w-full h-full overflow-y-auto overflow-x-visible">
                <SelectProject externalSearchQuery={searchQuery} />
            </div>
            <SubscriptionModal />
            <NonProjectSettingsModal />
        </div>
    );
});

export default Page;
