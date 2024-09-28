import { ElementStyle, ElementStyleGroup, ElementStyleType } from '@/lib/editor/styles/models';
import { ChevronDownIcon } from '@radix-ui/react-icons';

export const PositionSection = () => {
    return <WidthInput />;
};

const WidthInput = () => {
    const elementStyle: ElementStyle = {
        key: 'width',
        value: 'fit-content',
        displayName: 'Width',
        type: ElementStyleType.Dimensions,
        group: ElementStyleGroup.Position,
        units: ['px', '%', 'em', 'rem', 'vw', 'vh', 'fit-content'],
    };

    const OPTIONS = ['fill', 'fit', 'relative', 'auto'];

    const resolveCssValue = (value: string, type: string) => {};

    return (
        <div className={`flex flex-row items-center mt-2`} key={elementStyle.key}>
            <p className="text-xs w-24 mr-2 text-start text-text">{elementStyle.displayName}</p>
            <div className="text-end ml-auto">
                <div className="flex flex-row gap-1 justify-end">
                    <input
                        value={elementStyle.value === 'fit-content' ? '' : elementStyle.value}
                        type="text"
                        className={`w-16 rounded p-1 px-2 text-xs border-none text-active bg-bg/75 text-start focus:outline-none focus:ring-0`}
                        placeholder="--"
                    />
                    <div className="relative w-16">
                        <select
                            name={elementStyle.displayName}
                            value={elementStyle.units}
                            className="p-[6px] w-full px-2 text-start rounded border-none text-xs text-active bg-bg/75 appearance-none focus:outline-none focus:ring-0 capitalize"
                        >
                            {OPTIONS.map((option) => (
                                <option key={option} className="bg-bg/75" value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        <div className="text-text absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none">
                            <ChevronDownIcon />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
