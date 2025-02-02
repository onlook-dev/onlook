import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import CodeProp from './CodeProp';
import BooleanProp from './BooleanProp';
import TextProp from './TextProp';
import { useState } from 'react';

export interface Prop {
    type: string;
    displayType?: string;
    value: string | boolean;
    icon?: React.ReactNode;
    active: boolean;
}

const PropsTab = () => {
    const [props, setProps] = useState<{ [key: string]: Prop }>({
        children: {
            type: 'text',
            displayType: 'React.ReactNode',
            value: 'Learn More',
            active: true,
        },
        disabled: {
            type: 'boolean',
            value: true,
            active: true,
        },
        onClick: {
            type: 'code',
            displayType: 'function',
            value: 'Edit Code',
            icon: <Icons.Code />,
            active: true,
        },
    });
    return (
        <div className="flex flex-col gap-2 px-3 w-[300px]">
            <div className="flex flex-row justify-between items-center">
                <span className="text-xs">Detected Properties</span>
                <Button size={'icon'} variant={'ghost'}>
                    <Icons.Plus />
                </Button>
            </div>
            <div className="flex flex-col gap-4">
                {Object.keys(props).map((key) => {
                    const prop = props[key];
                    return (
                        <div className="flex flex-row justify-between items-center" key={key}>
                            <div className="flex flex-row gap-2 items-center">
                                <Icons.CheckCircled />
                                <div className="flex flex-col">
                                    <span className="text-sm">{key}</span>
                                    <span className="text-xs text-foreground-secondary">
                                        {prop.displayType ? prop.displayType : prop.type}
                                    </span>
                                </div>
                            </div>
                            {prop.type === 'code' ? (
                                <CodeProp prop={prop} onClick={() => {}} />
                            ) : prop.type === 'boolean' ? (
                                <BooleanProp
                                    value={prop.value as boolean}
                                    change={(value) => {
                                        setProps((prev) => ({
                                            ...prev,
                                            [key]: {
                                                ...prev[key],
                                                value,
                                            },
                                        }));
                                    }}
                                />
                            ) : prop.type === 'text' ? (
                                <TextProp
                                    prop={prop}
                                    onChange={(value) => {
                                        setProps((prev) => ({
                                            ...prev,
                                            [key]: {
                                                ...prev[key],
                                                value,
                                            },
                                        }));
                                    }}
                                />
                            ) : (
                                <></>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PropsTab;
