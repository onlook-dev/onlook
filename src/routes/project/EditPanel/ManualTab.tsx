import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from "@/components/ui/accordion";
import { getGroupedStyles } from "@/lib/editor/engine/styles/group";
import { ElementStyleType } from "@/lib/editor/engine/styles/models";
import { observer } from "mobx-react-lite";
import { useEditorEngine } from "..";
import BorderInput from "./inputs/BorderInput";
import ColorInput from "./inputs/ColorInput";
import DisplayInput from "./inputs/DisplayInput";
import NestedInputs from "./inputs/NestedInputs";
import NumberUnitInput from "./inputs/NumberUnitInput";
import AutoLayoutInput from "./inputs/RowColInput";
import SelectInput from "./inputs/SelectInput";
import TagDetails from "./inputs/TagDetails";
import TailwindInput from "./inputs/TailwindInput";
import TextInput from "./inputs/TextInput";

const ManualTab = observer(() => {
    const editorEngine = useEditorEngine();
    const custom = "Custom";
    const computedStyle = editorEngine.state.selected.length > 0 ? editorEngine.state.selected[0].computedStyle : {};
    const groupedStyles = getGroupedStyles(computedStyle as CSSStyleDeclaration);
    const appendedClass: string[] = []

    const updateElementStyle = (style: string, value: string) => {
        console.log(style, value);
    };

    const updateElementClass = (newClass: string) => {
        console.log(newClass);
    }

    return editorEngine.state.selected.length > 0 && (
        <Accordion
            className="px-4"
            type="multiple"
            defaultValue={[...Object.keys(groupedStyles), custom]}
        >
            {Object.entries(groupedStyles).map(([groupKey, subGroup]) => (
                <AccordionItem key={groupKey} value={groupKey} >
                    <AccordionTrigger >
                        <h2 className="text-xs font-semibold">
                            {groupKey}
                        </h2>
                    </AccordionTrigger>
                    <AccordionContent>
                        {groupKey === 'Text' && <TagDetails tagName={editorEngine.state.selected[0].tagName} />}
                        {Object.entries(subGroup).map(([subGroupKey, elementStyles]) => (
                            <div key={subGroupKey}>
                                {['Margin', 'Padding', 'Corners'].includes(subGroupKey) && <NestedInputs elementStyles={elementStyles} updateElementStyle={updateElementStyle} />}
                                {subGroupKey === 'Border' && <BorderInput elementStyles={elementStyles} updateElementStyle={updateElementStyle} />}
                                {subGroupKey === 'Display' && <DisplayInput initialStyles={elementStyles} updateElementStyle={updateElementStyle} />}
                                {elementStyles.map((elementStyle, i) => (
                                    <div className={`flex flex-row items-center ${i === 0 ? '' : 'mt-2'}`} key={i}>
                                        <p className="text-xs w-24 mr-2 text-start opacity-60">{elementStyle.displayName}</p>
                                        <div className="text-end ml-auto">
                                            {elementStyle.type === ElementStyleType.Select && <SelectInput elementStyle={elementStyle} updateElementStyle={updateElementStyle} />}
                                            {elementStyle.type === ElementStyleType.Dimensions && <AutoLayoutInput elementStyle={elementStyle} updateElementStyle={updateElementStyle} />}
                                            {elementStyle.type === ElementStyleType.Color && <ColorInput elementStyle={elementStyle} updateElementStyle={updateElementStyle} />}
                                            {elementStyle.type === ElementStyleType.Number && <NumberUnitInput elementStyle={elementStyle} updateElementStyle={updateElementStyle} />}
                                            {!Object.keys(ElementStyleType).includes(elementStyle.type) || elementStyle.type === ElementStyleType.Text && <TextInput elementStyle={elementStyle} updateElementStyle={updateElementStyle} />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </AccordionContent>
                </AccordionItem>
            ))}
            <AccordionItem value={custom}>
                <AccordionTrigger><h2 className="text-xs">{custom}</h2></AccordionTrigger>
                <AccordionContent>
                    <TailwindInput updateElementClass={updateElementClass} appendedClass={appendedClass} />
                </AccordionContent>
            </AccordionItem>
        </Accordion >
    )
})

export default ManualTab