import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { getGroupedStyles } from '@/lib/editor/engine/styles/group';
import {
    ElementStyle,
    ElementStyleSubGroup,
    ElementStyleType,
} from '@/lib/editor/engine/styles/models';
import { observer } from 'mobx-react-lite';
import { useEditorEngine } from '..';
import AutoLayoutInput from './inputs/AutoLayoutInput';
import BorderInput from './inputs/BorderInput';
import ColorInput from './inputs/ColorInput';
import DisplayInput from './inputs/DisplayInput';
import NestedInputs from './inputs/NestedInputs';
import NumberUnitInput from './inputs/NumberUnitInput';
import SelectInput from './inputs/SelectInput';
import TagDetails from './inputs/TagDetails';
import TextInput from './inputs/TextInput';
import { ActionTarget, Change } from '/common/actions';

const ManualTab = observer(() => {
    const editorEngine = useEditorEngine();
    const selectedEl =
        editorEngine.state.selected.length > 0 ? editorEngine.state.selected[0] : undefined;
    const style = selectedEl?.styles ?? ({} as Record<string, string>);
    const groupedStyles = getGroupedStyles(style as Record<string, string>);
    const childRect = selectedEl?.rect ?? ({} as DOMRect);
    const parentRect = selectedEl?.parent?.rect ?? ({} as DOMRect);

    const updateElementStyle = (style: string, change: Change<string>) => {
        const targets: Array<ActionTarget> = editorEngine.state.selected.map((s) => ({
            webviewId: s.webviewId,
            selector: s.selector,
        }));
        editorEngine.runAction({
            type: 'update-style',
            targets: targets,
            style: style,
            change: change,
        });
    };

    function getSingleInput(elementStyle: ElementStyle) {
        if (elementStyle.type === ElementStyleType.Select) {
            return (
                <SelectInput elementStyle={elementStyle} updateElementStyle={updateElementStyle} />
            );
        } else if (elementStyle.type === ElementStyleType.Dimensions) {
            return (
                <AutoLayoutInput
                    childRect={childRect}
                    parentRect={parentRect}
                    elementStyle={elementStyle}
                    updateElementStyle={updateElementStyle}
                />
            );
        } else if (elementStyle.type === ElementStyleType.Color) {
            return (
                <ColorInput elementStyle={elementStyle} updateElementStyle={updateElementStyle} />
            );
        } else if (elementStyle.type === ElementStyleType.Number) {
            return (
                <NumberUnitInput
                    elementStyle={elementStyle}
                    updateElementStyle={updateElementStyle}
                />
            );
        } else {
            return (
                <TextInput elementStyle={elementStyle} updateElementStyle={updateElementStyle} />
            );
        }
    }

    function getNestedInput(elementStyles: ElementStyle[], subGroupKey: ElementStyleSubGroup) {
        if (
            [
                ElementStyleSubGroup.Margin,
                ElementStyleSubGroup.Padding,
                ElementStyleSubGroup.Corners,
            ].includes(subGroupKey as ElementStyleSubGroup)
        ) {
            return (
                <NestedInputs
                    elementStyles={elementStyles}
                    updateElementStyle={updateElementStyle}
                />
            );
        } else if (subGroupKey === ElementStyleSubGroup.Border) {
            return (
                <BorderInput
                    elementStyles={elementStyles}
                    updateElementStyle={updateElementStyle}
                />
            );
        } else if (subGroupKey === ElementStyleSubGroup.Display) {
            return (
                <DisplayInput
                    elementStyles={elementStyles}
                    updateElementStyle={updateElementStyle}
                />
            );
        } else {
            return elementStyles.map((elementStyle, i) => (
                <div className={`flex flex-row items-center ${i === 0 ? '' : 'mt-2'}`} key={i}>
                    <p className="text-xs w-24 mr-2 text-start opacity-60">
                        {elementStyle.displayName}
                    </p>
                    <div className="text-end ml-auto">{getSingleInput(elementStyle)}</div>
                </div>
            ));
        }
    }

    function renderGroupStyles(groupedStyles: Record<string, Record<string, ElementStyle[]>>) {
        return Object.entries(groupedStyles).map(([groupKey, subGroup]) => (
            <AccordionItem key={groupKey} value={groupKey}>
                <AccordionTrigger>
                    <h2 className="text-xs font-semibold">{groupKey}</h2>
                </AccordionTrigger>
                <AccordionContent>
                    {groupKey === 'Text' && (
                        <TagDetails tagName={editorEngine.state.selected[0].tagName} />
                    )}
                    {Object.entries(subGroup).map(([subGroupKey, elementStyles]) => (
                        <div key={subGroupKey}>
                            {getNestedInput(elementStyles, subGroupKey as ElementStyleSubGroup)}
                        </div>
                    ))}
                </AccordionContent>
            </AccordionItem>
        ));
    }

    return (
        editorEngine.state.selected.length > 0 && (
            <Accordion
                className="px-4"
                type="multiple"
                defaultValue={[...Object.keys(groupedStyles), 'Custom']}
            >
                {renderGroupStyles(groupedStyles)}
            </Accordion>
        )
    );
});

export default ManualTab;
