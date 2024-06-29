import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from "@/components/ui/accordion";
import { getGroupedStyles } from "@/lib/editor/engine/styles/group";
import { observer } from "mobx-react-lite";
import { useEditorEngine } from "..";
import NestedInputs from "./inputs/NestedInput";
import TagDetails from "./inputs/TagInfo";

const ManualTab = observer(() => {
    const editorEngine = useEditorEngine();
    const custom = "Custom";
    const computedStyle = editorEngine.state.selected.length > 0 ? editorEngine.state.selected[0].computedStyle : {};
    const groupedStyles = getGroupedStyles(computedStyle as CSSStyleDeclaration);

    const updateElementStyle = (style: string, value: string) => {
        console.log(style, value);
    };
    return editorEngine.state.selected.length > 0 && (
        <Accordion
            className="w-full px-4"
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
                                {/* {subGroupKey === 'Border' && <BorderInput elementStyles={elementStyles} updateElementStyle={updateElementStyle} />}
                                {subGroupKey === 'Display' && <DisplayInput elementStyles={elementStyles} updateElementStyle={updateElementStyle} />}
                                {elementStyles.map((elementStyle, i) => (
                                    <div className={`flex flex-row items-center ${i === 0 ? '' : 'mt-2'}`} key={i}>
                                        <p className="text-xs w-24 mr-2 text-start opacity-60">{elementStyle.displayName}</p>
                                        <div className="text-end ml-auto">
                                            {elementStyle.type === 'Select' && <SelectInput elementStyle={elementStyle} updateElementStyle={updateElementStyle} />}
                                            {elementStyle.type === 'Dimensions' && <AutolayoutInput el={el} elementStyle={elementStyle} updateElementStyle={updateElementStyle} />}
                                            {elementStyle.type === 'Color' && <ColorInput elementStyle={elementStyle} updateElementStyle={updateElementStyle} />}
                                            {elementStyle.type === 'Number' && <NumberUnitInput elementStyle={elementStyle} updateElementStyle={updateElementStyle} />}
                                            {elementStyle.type !== 'Select' && elementStyle.type !== 'Dimensions' && elementStyle.type !== 'Color' && elementStyle.type !== 'Number' && <TextInput elementStyle={elementStyle} updateElementStyle={updateElementStyle} />}
                                        </div>
                                    </div>
                                ))} */}
                            </div>
                        ))}
                    </AccordionContent>
                </AccordionItem>
            ))}

            <AccordionItem value={custom}>
                <AccordionTrigger><h2 className="text-xs">{custom}</h2></AccordionTrigger>
                <AccordionContent>
                    {/* <TailwindInput {updateElementClass} {appendedClass} /> */}
                </AccordionContent>
            </AccordionItem>
        </Accordion >
    )
})

export default ManualTab