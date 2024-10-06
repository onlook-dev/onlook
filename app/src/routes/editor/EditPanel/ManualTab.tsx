import { useEditorEngine } from '@/components/Context';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { CompoundStyleImpl } from '@/lib/editor/styles';
import { LayoutGroup, PositionGroup, StyleGroup, TextGroup } from '@/lib/editor/styles/group';
import {
    BaseStyle,
    CompoundStyleKey,
    SingleStyle,
    StyleGroupKey,
    StyleType,
} from '@/lib/editor/styles/models';
import { observer } from 'mobx-react-lite';
import BorderInput from './inputs/compound/BorderInput';
import DisplayInput from './inputs/compound/DisplayInput';
import NestedInputs from './inputs/compound/NestedInputs';
import AutoLayoutInput from './inputs/single/AutoLayoutInput';
import ColorInput from './inputs/single/ColorInput';
import NumberUnitInput from './inputs/single/NumberUnitInput';
import SelectInput from './inputs/single/SelectInput';
import TagDetails from './inputs/single/TagDetails';
import TailwindInput from './inputs/single/TailwindInput';
import TextInput from './inputs/single/TextInput';

export const STYLE_GROUP_MAPPING: Record<StyleGroupKey, BaseStyle[]> = {
    [StyleGroupKey.Position]: PositionGroup,
    [StyleGroupKey.Layout]: LayoutGroup,
    [StyleGroupKey.Style]: StyleGroup,
    [StyleGroupKey.Text]: TextGroup,
};

const ManualTab = observer(() => {
    const editorEngine = useEditorEngine();
    const TAILWIND_KEY = 'tw';

    function renderSingle(style: SingleStyle) {
        return (
            <div className="flex flex-row items-center mt-2">
                <p className="text-xs w-24 mr-2 text-start text-text">{style.displayName}</p>
                <div className="text-end ml-auto">{renderSingleInput(style)}</div>
            </div>
        );
    }

    function renderSingleInput(style: SingleStyle) {
        if (style.type === StyleType.Select) {
            return <SelectInput elementStyle={style} />;
        } else if (style.type === StyleType.Dimensions) {
            return <AutoLayoutInput elementStyle={style} />;
        } else if (style.type === StyleType.Color) {
            return <ColorInput elementStyle={style} />;
        } else if (style.type === StyleType.Number) {
            return <NumberUnitInput elementStyle={style} />;
        } else if (style.type === StyleType.Text) {
            return <TextInput elementStyle={style} />;
        } else {
            return (
                <div className="flex flex-row items-center">
                    <p>Unknown style: {style.key}</p>
                </div>
            );
        }
    }

    function renderCompound(style: CompoundStyleImpl) {
        if (
            [CompoundStyleKey.Margin, CompoundStyleKey.Padding, CompoundStyleKey.Corners].includes(
                style.key,
            )
        ) {
            return <NestedInputs compoundStyle={style} />;
        } else if (style.key === CompoundStyleKey.Display) {
            return <DisplayInput compoundStyle={style} />;
        } else if (style.key === CompoundStyleKey.Border) {
            return <BorderInput compoundStyle={style} />;
        } else {
            return (
                <div className="flex flex-row items-center">
                    <p>Unknown compound style: {style.key}</p>
                </div>
            );
        }
    }

    function renderGroupValues(baseElementStyles: BaseStyle[]) {
        return Object.entries(baseElementStyles).map(([key, value]) => {
            if (value.elStyleType === 'compound') {
                return renderCompound(value as CompoundStyleImpl);
            } else {
                return renderSingle(value as SingleStyle);
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
                    {groupKey === StyleGroupKey.Text && <TagDetails />}
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
                defaultValue={[...Object.values(StyleGroupKey), TAILWIND_KEY]}
            >
                {renderTailwindSection()}
                {renderStyleSections()}
            </Accordion>
        )
    );
});

export default ManualTab;
