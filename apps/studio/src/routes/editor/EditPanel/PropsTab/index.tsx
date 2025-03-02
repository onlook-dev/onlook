import { useEditorEngine } from '@/components/Context';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import type { CodeDiffRequest } from '@onlook/models';
import { MainChannels } from '@onlook/models/constants';
import { PropsType, type DomElement, type PropsParsingResult } from '@onlook/models/element';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { useEffect, useState } from 'react';
import BooleanProp from './BooleanProp';
import CodeProp from './CodeProp';
import TextProp from './TextProp';

export interface Prop {
    type: PropsType;
    displayType?: string;
    value: string | boolean;
    icon?: React.ReactNode;
}

const PropsTab = () => {
    const [props, setProps] = useState<{ [key: string]: Prop } | null>({});
    const [selectedEl, setSelectedEl] = useState<DomElement | undefined>();

    const editorEngine = useEditorEngine();

    useEffect(() => {
        if (editorEngine.elements.selected.length > 0) {
            const selectedEl = editorEngine.elements.selected[0];
            setSelectedEl(selectedEl);
            getRootProps(selectedEl);
        }
    }, [editorEngine.elements.selected]);

    async function getRootProps(domEl: DomElement) {
        const newRoot = await editorEngine.ast.getTemplateNodeById(domEl.oid);
        if (newRoot) {
            const rootProps: PropsParsingResult = await invokeMainChannel(
                MainChannels.GET_TEMPLATE_NODE_PROPS,
                newRoot,
            );

            if (rootProps.type === 'props' && rootProps.props.length > 0) {
                const elementProps: Record<string, Prop> = {};
                rootProps.props.forEach((prop) => {
                    const newProp: Prop = {
                        type: prop.type,
                        value: prop.value,
                    };
                    elementProps[prop.key] = newProp;
                });
                setProps(elementProps);
            } else {
                setProps(null);
            }
        }
    }

    const createCodeDiffRequest = async (
        oid: string | undefined,
        value: string | number | boolean,
        name: string,
    ) => {
        if (!oid) {
            console.error('No oid found for createCodeDiffRequest');
            return;
        }
        const templateNode = await editorEngine.ast.getTemplateNodeById(oid);
        if (!templateNode) {
            console.error('No templateNode found for createCodeDiffRequest');
            return;
        }

        const request: CodeDiffRequest[] = [];

        request.push({
            oid,
            attributes: { [name]: value },
            textContent: null,
            overrideClasses: false,
            structureChanges: [],
        });

        const res = await editorEngine.code.getAndWriteCodeDiff(request, true);
        if (res) {
            sendAnalytics('attributes action');
        }
    };

    function viewSource() {
        if (selectedEl?.oid) {
            editorEngine.code.viewSource(selectedEl?.oid);
        }
    }

    return (
        <div className="flex flex-col gap-2 px-3 w-full">
            <div className="flex flex-row justify-between items-center">
                <span className="text-xs">Detected Properties</span>
                <Button size={'icon'} variant={'ghost'}>
                    <Icons.Plus />
                </Button>
            </div>
            <div className="flex flex-col gap-4 mb-5">
                {props !== null &&
                    Object.keys(props).map((key) => {
                        const prop = props[key];
                        return (
                            <div className="flex flex-row items-center" key={key}>
                                <div className="flex flex-row gap-2 items-center">
                                    <div className="flex flex-col">
                                        <span className="text-sm">{key}</span>
                                        <span className="text-xs text-foreground-secondary">
                                            {prop.displayType ? prop.displayType : prop.type}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-end ml-auto">
                                    {prop.type === 'code' ? (
                                        <CodeProp onClick={viewSource} />
                                    ) : prop.type === 'boolean' ? (
                                        <BooleanProp
                                            value={prop.value as boolean}
                                            change={(value) => {
                                                setProps((prev) =>
                                                    prev !== null
                                                        ? {
                                                              ...prev,
                                                              [key]: {
                                                                  ...prev[key],
                                                                  value,
                                                              },
                                                          }
                                                        : null,
                                                );
                                                selectedEl?.oid &&
                                                    createCodeDiffRequest(
                                                        selectedEl?.oid,
                                                        value,
                                                        key,
                                                    );
                                            }}
                                        />
                                    ) : (
                                        (prop.type === PropsType.String ||
                                            prop.type === PropsType.Number) && (
                                            <TextProp
                                                prop={prop}
                                                type={prop.type}
                                                onChange={(value) => {
                                                    setProps((prev) =>
                                                        prev !== null
                                                            ? {
                                                                  ...prev,
                                                                  [key]: {
                                                                      ...prev[key],
                                                                      value,
                                                                  },
                                                              }
                                                            : null,
                                                    );
                                                }}
                                                onBlur={(val) => {
                                                    selectedEl?.oid &&
                                                        createCodeDiffRequest(
                                                            selectedEl?.oid,
                                                            prop.type === PropsType.Number
                                                                ? parseInt(val)
                                                                : val,
                                                            key,
                                                        );
                                                }}
                                            />
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};

export default PropsTab;
