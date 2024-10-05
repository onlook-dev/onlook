import { useEditorEngine } from '@/components/Context';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { CompoundElementStyleKey, STYLE_GROUP_MAPPING } from '@/lib/editor/styles/group';
import {
    BaseElementStyle,
    CompoundElementStyle,
    ElementStyle,
    ElementStyleGroup,
    ElementStyleType,
} from '@/lib/editor/styles/models';
import { observer } from 'mobx-react-lite';
import AutoLayoutInput from './inputs/AutoLayoutInput';
import BorderInput from './inputs/BorderInput';
import DisplayInput from './inputs/DisplayInput';
import NestedInputs from './inputs/NestedInputs';
import ColorInput from './inputs/primitives/ColorInput';
import NumberUnitInput from './inputs/primitives/NumberUnitInput';
import SelectInput from './inputs/primitives/SelectInput';
import TextInput from './inputs/primitives/TextInput';
import TagDetails from './inputs/TagDetails';
import TailwindInput from './inputs/TailwindInput';

const ManualTab = observer(() => {
    const editorEngine = useEditorEngine();
    const TAILWIND_KEY = 'tw';

    function renderSingleInput(elementStyle: ElementStyle) {
        return <div>{elementStyle.displayName}</div>;
        if (elementStyle.type === ElementStyleType.Select) {
            return <SelectInput elementStyle={elementStyle} />;
        } else if (elementStyle.type === ElementStyleType.Dimensions) {
            return <AutoLayoutInput elementStyle={elementStyle} />;
        } else if (elementStyle.type === ElementStyleType.Color) {
            return <ColorInput elementStyle={elementStyle} />;
        } else if (elementStyle.type === ElementStyleType.Number) {
            return <NumberUnitInput elementStyle={elementStyle} />;
        } else {
            return <TextInput elementStyle={elementStyle} />;
        }
    }

    function renderCompoundInput(compoundElementStyle: CompoundElementStyle) {
        return <div>{compoundElementStyle.key}</div>;
        if (
            [
                CompoundElementStyleKey.Margin,
                CompoundElementStyleKey.Padding,
                CompoundElementStyleKey.Corners,
            ].includes(compoundElementStyle.key)
        ) {
            return <NestedInputs elementStyles={elementStyles} />;
        } else if (compoundElementStyle.key === CompoundElementStyleKey.Border) {
            return <BorderInput elementStyles={elementStyles} />;
        } else if (compoundElementStyle.key === CompoundElementStyleKey.Display) {
            return <DisplayInput elementStyles={elementStyles} />;
        } else {
            <div className="flex flex-row items-center">
                <p>Unknown compound style</p>
            </div>;
        }
    }

    function renderGroupValues(baseElementStyles: BaseElementStyle[]) {
        return Object.entries(baseElementStyles).map(([key, value]) => {
            if (value.elStyleType === 'compound') {
                return renderCompoundInput(value as CompoundElementStyle);
            } else {
                return renderSingleInput(value as ElementStyle);
            }
        });
    }

    function renderStyleSections() {
        return Object.entries(STYLE_GROUP_MAPPING).map(([groupKey, baseElementStyles]) => (
            <AccordionItem key={groupKey} value={groupKey}>
                <AccordionTrigger>
                    <h2 className="text-xs font-semibold">{groupKey}</h2>
                </AccordionTrigger>
                <AccordionContent>
                    {groupKey === ElementStyleGroup.Text && <TagDetails />}
                    {renderGroupValues(baseElementStyles)}
                </AccordionContent>
            </AccordionItem>
        ));
    }

    function renderTailwindSection() {
        return (
            <AccordionItem key={TAILWIND_KEY} value={TAILWIND_KEY}>
                <AccordionTrigger>
                    <h2 className="text-xs font-semibold">Tailwind Classes</h2>
                </AccordionTrigger>
                <AccordionContent>
                    <TailwindInput />
                </AccordionContent>
            </AccordionItem>
        );
    }

    return (
        editorEngine.elements.selected.length > 0 && (
            <Accordion
                className="px-4"
                type="multiple"
                defaultValue={[...Object.values(ElementStyleGroup), TAILWIND_KEY]}
            >
                {renderTailwindSection()}
                {renderStyleSections()}
            </Accordion>
        )
    );
});

export default ManualTab;
