import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import type { NodeApi } from 'react-arborist';
import type { PageNode } from '@onlook/models/pages';

const PageTreeNode = ({ node, style }: { node: NodeApi<PageNode>; style: React.CSSProperties }) => {
    const hasChildren = node.data.children && node.data.children.length > 0;

    return (
        <div
            style={style}
            className={cn('flex items-center h-6 px-2 cursor-pointer hover:bg-background-hover', {
                'bg-[#FA003C] text-white': node.data.isActive,
            })}
            onClick={() => node.select()}
        >
            {hasChildren ? (
                <Icons.Directory className="w-4 h-4 mr-2" />
            ) : (
                <Icons.File className="w-4 h-4 mr-2" />
            )}
            <span>{node.data.name}</span>
        </div>
    );
};

export default PageTreeNode;
