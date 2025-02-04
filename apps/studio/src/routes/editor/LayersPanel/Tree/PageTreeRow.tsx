import type { PageNode } from '@onlook/models/pages';
import { forwardRef } from 'react';
import type { RowRendererProps } from 'react-arborist';

const PageTreeRow = forwardRef<HTMLDivElement, RowRendererProps<PageNode>>(
    ({ attrs, children }, ref) => {
        return (
            <div ref={ref} {...attrs} className="outline-none pt-1">
                {children}
            </div>
        );
    },
);

PageTreeRow.displayName = 'PageTreeRow';
export default PageTreeRow;
