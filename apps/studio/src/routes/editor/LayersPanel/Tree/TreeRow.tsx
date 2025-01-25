import { forwardRef } from 'react';
import type { LayerNode } from '@onlook/models/element';
import type { RowRendererProps } from 'react-arborist';

const TreeRow = forwardRef<HTMLDivElement, RowRendererProps<LayerNode>>((props, ref) => {
    const { attrs, children } = props;
    return (
        <div ref={ref} {...attrs} className="outline-none">
            {children}
        </div>
    );
});

TreeRow.displayName = 'TreeRow';

export default TreeRow;
