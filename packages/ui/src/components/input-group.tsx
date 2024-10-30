import { Children, type ReactElement, cloneElement } from 'react';
import type { DraftableInputProps } from './draftable-input';
import { cn } from '../utils';

interface InputGroupProps {
    className?: string;
    children: ReactElement<DraftableInputProps>[] | ReactElement<DraftableInputProps>;
}

export const InputGroup = ({ className, children }: InputGroupProps) => {
    const childrenArray = Children.toArray(children) as ReactElement<DraftableInputProps>[];
    const totalInputs = childrenArray.length;

    return (
        <div className={cn('flex w-fit min-w-0', className)}>
            {childrenArray.map((child, index) => {
                const isFirst = index === 0;
                const isLast = index === totalInputs - 1;

                return cloneElement(child, {
                    className: cn(child.props.className, {
                        'rounded-l-none': !isFirst,
                        'rounded-r-none': !isLast,
                        'rounded-none': !isFirst && !isLast,
                        'border-l-0': !isFirst,
                        'border-r-0': !isLast,
                    }),
                });
            })}
        </div>
    );
};
