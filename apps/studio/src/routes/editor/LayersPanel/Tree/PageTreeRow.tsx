import type { PageNode } from '@onlook/models/pages';
import type { RowRendererProps } from 'react-arborist';
import { forwardRef } from 'react';

const PageTreeRow = forwardRef<HTMLDivElement, RowRendererProps<PageNode>>(
    ({ attrs, children }, ref) => {
        return (
            <div ref={ref} {...attrs} className="outline-none pl-5 pt-1">
                {children}
            </div>
        );
    },
);

PageTreeRow.displayName = 'PageTreeRow';
export default PageTreeRow;
