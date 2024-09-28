import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { PositionSection } from './sections/Position';

interface Section {
    name: string;
    content: JSX.Element;
}
export function EditTab() {
    const SECTIONS: Section[] = [
        {
            name: 'Position & Dimensions',
            content: <PositionSection />,
        },
        {
            name: 'Flexbox & Layout',
            content: <PositionSection />,
        },
        {
            name: 'Style',
            content: <PositionSection />,
        },
        {
            name: 'Text',
            content: <PositionSection />,
        },
    ];
    return (
        <Accordion
            className="px-4"
            type="multiple"
            defaultValue={[...SECTIONS.map((section) => section.name)]}
        >
            {SECTIONS.map((section, index) => (
                <AccordionItem key={index} value={section.name}>
                    <AccordionTrigger>
                        <h2 className="text-xs font-semibold">{section.name}</h2>
                    </AccordionTrigger>
                    <AccordionContent>{section.content}</AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}
