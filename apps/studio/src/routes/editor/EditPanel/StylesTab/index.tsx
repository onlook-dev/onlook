import React, { useState } from 'react';
import { useEditorEngine } from '@/components/Context';
import type { CompoundStyleImpl } from '@/lib/editor/styles';
import { LayoutGroup, PositionGroup, StyleGroup, TextGroup } from '@/lib/editor/styles/group';
import {
    type BaseStyle,
    CompoundStyleKey,
    type SingleStyle,
    StyleGroupKey,
    StyleType,
} from '@/lib/editor/styles/models';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@onlook/ui/accordion';
import { observer } from 'mobx-react-lite';
import BorderInput from './compound/BorderInput';
import DisplayInput from './compound/DisplayInput';
import NestedInputs from './compound/NestedInputs';
import AutoLayoutInput from './single/AutoLayoutInput';
import ColorInput from './single/ColorInput';
import NumberUnitInput from './single/NumberUnitInput';
import SelectInput from './single/SelectInput';
import TagDetails from './single/TagDetails';
import TailwindInput from './single/TailwindInput';
import TextInput from './single/TextInput';
import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';

export const STYLE_GROUP_MAPPING: Record<StyleGroupKey, BaseStyle[]> = {
    [StyleGroupKey.Position]: PositionGroup,
    [StyleGroupKey.Layout]: LayoutGroup,
    [StyleGroupKey.Style]: StyleGroup,
    [StyleGroupKey.Text]: TextGroup,
};

const ManualTab = observer(() => {
    const editorEngine = useEditorEngine();
    const TAILWIND_KEY = 'tw';
    const [isAdd, setIsAdd] = useState(true);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        [StyleGroupKey.Layout]: false,
    });

    const handleButtonClick = (groupKey: string) => {
        setOpenSections((prev) => ({
            ...prev,
            [groupKey]: !prev[groupKey],
        }));
        setIsAdd(!openSections[groupKey]);
    };

    function renderSingle(style: SingleStyle) {
        return (
            <div className="flex flex-row items-center mt-2">
                <p className="text-xs w-24 mr-2 text-start text-foreground-onlook">
                    {style.displayName}
                </p>
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
            return (
                <div key={key}>
                    {value.elStyleType === 'compound'
                        ? renderCompound(value as CompoundStyleImpl)
                        : renderSingle(value as SingleStyle)}
                </div>
            );
        });
    }

    function renderStyleSections() {
        return Object.entries(STYLE_GROUP_MAPPING).map(([groupKey, baseElementStyles]) => (
            <AccordionItem key={groupKey} value={groupKey}>
                {groupKey === StyleGroupKey.Layout ? (
                    <div style={{ position: 'relative' }}>
                        <h2 className="text-xs font-semibold">{groupKey}</h2>
                        <button
                            onClick={() => handleButtonClick(groupKey)}
                            className="absolute top-1/2 right-0 transform -translate-y-1/2 bg-none border-none text-muted-foreground transition-transform duration-200"
                        >
                            {openSections[groupKey] ? (
                                <MinusIcon className="h-4 w-4" />
                            ) : (
                                <PlusIcon className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                ) : (
                    <AccordionTrigger>
                        <h2 className="text-xs font-semibold">{groupKey}</h2>
                    </AccordionTrigger>
                )}
                {(groupKey !== StyleGroupKey.Layout || openSections[groupKey]) && (
                    <AccordionContent>
                        {groupKey === StyleGroupKey.Text && <TagDetails />}
                        {renderGroupValues(baseElementStyles)}
                    </AccordionContent>
                )}
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
