import { useEffect, useState } from 'react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { useEditorEngine } from '@/components/Context';
import type { DomElement, PropsParsingResult } from '@onlook/models/element';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import CodeProp from './CodeProp';
import BooleanProp from './BooleanProp';
import TextProp from './TextProp';
import type { CodeDiffRequest } from '@onlook/models';

export interface Prop {
    type: string;
    displayType?: string;
    value: string | boolean;
    icon?: React.ReactNode;
}

const PropsTab = () => {
    const [props, setProps] = useState<{ [key: string]: Prop } | null>({});
    const [selectedEl, setSelectedEl] = useState<DomElement | undefined>();
    const [propCount, setPropCount] = useState<number>(4);

    const editorEngine = useEditorEngine();

    useEffect(() => {
        if (editorEngine.elements.selected.length > 0) {
            const selectedEl = editorEngine.elements.selected[0];
            setSelectedEl(selectedEl);
            setPropCount(4);
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
                const elementProps: any = {};
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

    const createCodeDiffRequest = async (oid: string | undefined, value: any, name: string) => {
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
        <div className="flex flex-col gap-2 px-3 w-[300px]">
            <div className="flex flex-row justify-between items-center">
                <span className="text-xs">Detected Properties</span>
                <Button size={'icon'} variant={'ghost'}>
                    <Icons.Plus />
                </Button>
            </div>
            <div className="flex flex-col gap-4 mb-5">
                {props !== null &&
                    Object.keys(props)
                        .slice(0, propCount)
                        .map((key) => {
                            const prop = props[key];
                            return (
                                <div className="flex flex-row items-center" key={key}>
                                    <div className="flex flex-row gap-2 items-center">
                                        <Icons.CheckCircled />
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
                                            (prop.type === 'text' || prop.type === 'number') && (
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
                                                                prop.type === 'number'
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
                {props !== null && Object.keys(props).length > 4 && propCount === 4 && (
                    <div
                        onClick={() => setPropCount(Object.keys(props).length)}
                        className="text-sm flex pt-5 items-center justify-center text-center opacity-70 cursor-pointer"
                    >
                        See all properties {`(${Object.keys(props).length})`}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PropsTab;
