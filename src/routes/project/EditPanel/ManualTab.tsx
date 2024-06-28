import {
    Accordion
} from "@/components/ui/accordion";
import { getStyles } from "@/lib/editor/engine/styles";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@radix-ui/react-accordion";
import { useEditorEngine } from "..";

function ManualTab() {
    const editorEngine = useEditorEngine();
    const custom = "Custom";
    const computedStyle = editorEngine.state.selected.length > 0 ? editorEngine.state.selected[0].computedStyle : {};
    const groupedStyles = getStyles(computedStyle as CSSStyleDeclaration);

    return (
        <Accordion
            className="w-full"
            type="multiple"
            value={[...Object.keys(groupedStyles), custom]}
        >
            {Object.entries(groupedStyles).map(([groupKey, subGroup]) => (
                <AccordionItem data-state="open" value={groupKey}>
                    <AccordionTrigger>
                        <h2 className="text-xs font-semibold">
                            {groupKey}
                        </h2>
                    </AccordionTrigger>
                </AccordionItem>
            ))}

            <AccordionItem data-state="open" value={custom}>
                <AccordionTrigger><h2 className="text-xs">{custom}</h2></AccordionTrigger>
                <AccordionContent>
                    {/* <TailwindInput {updateElementClass} {appendedClass} /> */}
                </AccordionContent>
            </AccordionItem>
        </Accordion >
    )
}

export default ManualTab