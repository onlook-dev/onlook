import { useEditorEngine } from '@/components/Context';
import { StyleMode } from '@/lib/editor/engine/style';
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
import { Icons } from '@onlook/ui/icons/index';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { memo } from 'react';
import BorderInput from './compound/BorderInput';
import DisplayInput from './compound/DisplayInput';
import FillInput from './compound/FillInput';
import NestedInputs from './compound/NestedInputs';
import AutoLayoutInput from './single/AutoLayoutInput';
import ColorInput from './single/ColorInput';
import NumberUnitInput from './single/NumberUnitInput';
import SelectInput from './single/SelectInput';
import TagDetails from './single/TagDetails';
import TailwindInput from './single/TailwindInput';
import TextInput from './single/TextInput';

const STYLE_GROUP_MAPPING: Record<StyleGroupKey, BaseStyle[]> = {
    [StyleGroupKey.Position]: PositionGroup,
    [StyleGroupKey.Layout]: LayoutGroup,
    [StyleGroupKey.Style]: StyleGroup,
    [StyleGroupKey.Text]: TextGroup,
};

const SingleInput = memo(({ style }: { style: SingleStyle }) => {
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
    }
    return (
        <div className="flex flex-row items-center">
            <p>Unknown style: {style.key}</p>
        </div>
    );
});
SingleInput.displayName = 'SingleInput';

const SingleStyle = memo(({ style }: { style: SingleStyle }) => {
    return (
        <div className="flex flex-row items-center mt-2">
            <p className="text-xs w-24 mr-2 text-start text-foreground-onlook">
                {style.displayName}
            </p>
            <div className="text-end ml-auto">
                <SingleInput style={style} />
            </div>
        </div>
    );
});
SingleStyle.displayName = 'SingleStyle';

const CompoundStyle = memo(({ style }: { style: CompoundStyleImpl }) => {
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
    } else if (style.key === CompoundStyleKey.Fill) {
        return <FillInput compoundStyle={style} />;
    } else {
        return (
            <div className="flex flex-row items-center">
                <p>Unknown compound style: {style.key}</p>
            </div>
        );
    }
});
CompoundStyle.displayName = 'CompoundStyle';

const StyleGroupComponent = memo(({ baseElementStyles }: { baseElementStyles: BaseStyle[] }) => {
    return (
        <>
            {Object.entries(baseElementStyles).map(([key, value]) => (
                <div key={key}>
                    {value.elStyleType === 'compound' ? (
                        <CompoundStyle style={value as CompoundStyleImpl} />
                    ) : (
                        <SingleStyle style={value as SingleStyle} />
                    )}
                </div>
            ))}
        </>
    );
});
StyleGroupComponent.displayName = 'StyleGroupComponent';

const AccordionHeader = memo(({ groupKey }: { groupKey: string }) => {
    const editorEngine = useEditorEngine();
    return (
        <Tooltip>
            <TooltipTrigger asChild disabled={editorEngine.style.mode !== StyleMode.Instance}>
                <div
                    className={cn(
                        'text-xs flex transition-all items-center group',
                        editorEngine.style.mode === StyleMode.Instance &&
                            'gap-1 text-purple-600 dark:text-purple-300 hover:text-purple-500 dark:hover:text-purple-200',
                    )}
                >
                    <Icons.ComponentInstance
                        className={cn(
                            'transition-all w-0',
                            editorEngine.style.mode === StyleMode.Instance &&
                                'w-3 h-3 text-purple-600 dark:text-purple-300 group-hover:text-purple-500 dark:group-hover:text-purple-200',
                        )}
                    />
                    {groupKey}
                </div>
            </TooltipTrigger>
            <TooltipPortal container={document.getElementById('style-tab-id')}>
                <TooltipContent>{'Changes apply to instance code.'}</TooltipContent>
            </TooltipPortal>
        </Tooltip>
    );
});
AccordionHeader.displayName = 'AccordionHeader';

const TailwindSection = memo(() => {
    return (
        <AccordionItem value="tw">
            <AccordionTrigger>
                <h2 className="text-xs">Tailwind Classes</h2>
            </AccordionTrigger>
            <AccordionContent>
                <TailwindInput />
            </AccordionContent>
        </AccordionItem>
    );
});
TailwindSection.displayName = 'TailwindSection';

const StyleSections = memo(() => {
    return Object.entries(STYLE_GROUP_MAPPING).map(([groupKey, baseElementStyles]) => (
        <AccordionItem key={groupKey} value={groupKey}>
            <AccordionTrigger className="mb-[-4px] mt-[-2px]">
                <AccordionHeader groupKey={groupKey} />
            </AccordionTrigger>
            <AccordionContent className="mt-2px">
                {groupKey === StyleGroupKey.Text && <TagDetails />}
                <StyleGroupComponent baseElementStyles={baseElementStyles} />
            </AccordionContent>
        </AccordionItem>
    ));
});
StyleSections.displayName = 'StyleSections';

const ManualTab = observer(() => {
    const editorEngine = useEditorEngine();
    return (
        editorEngine.elements.selected.length > 0 && (
            <Accordion
                className="px-3"
                type="multiple"
                defaultValue={[...Object.values(StyleGroupKey), 'tw']}
            >
                <TailwindSection />
                <StyleSections />
            </Accordion>
        )
    );
});

export default ManualTab;
