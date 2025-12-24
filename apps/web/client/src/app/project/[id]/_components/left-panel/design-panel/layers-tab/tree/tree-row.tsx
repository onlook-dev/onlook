import type { LayerNode } from '@onlook/models/element';
import type { RefObject } from 'react';
import type { NodeApi } from 'react-arborist';

interface TreeRowProps {
    node: NodeApi<LayerNode>;
    innerRef: RefObject<HTMLDivElement>;
    attrs: Record<string, any>;
    children: React.ReactNode;
}

export const TreeRow = ({ innerRef, attrs, children }: TreeRowProps) => {
    return (
        <div ref={innerRef} {...attrs} className="outline-none">
            {children}
        </div>
    );
};
