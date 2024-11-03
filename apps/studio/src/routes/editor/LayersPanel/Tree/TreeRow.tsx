import type { RefObject } from 'react';
import type { NodeApi } from 'react-arborist';
import type { LayerNode } from '@onlook/models/element';

interface TreeRowProps {
    node: NodeApi<LayerNode>;
    innerRef: RefObject<HTMLDivElement>;
    attrs: { [key: string]: any };
    children: React.ReactNode;
}

const TreeRow = ({ node, innerRef, attrs, children }: TreeRowProps) => {
    return (
        <div ref={innerRef} {...attrs} className="outline-none">
            {children}
        </div>
    );
};

export default TreeRow;
