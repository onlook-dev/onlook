import { Button } from '@onlook/ui/button';

interface BooleanPropProps {
    value: boolean;
    change: (value: boolean) => void;
}

const BooleanProp = ({ value, change }: BooleanPropProps) => {
    return (
        <div className="flex flex-row p-0.5 w-32 h-8 text-xs rounded border-none text-foreground-active bg-background-secondary text-start">
            <Button
                className={`h-full w-full px-0.5 py-1.5 bg-background-secondary rounded-sm ${value === true ? 'bg-background-tertiary hover:bg-background-tertiary' : 'hover:bg-background-tertiary/50'}`}
                variant={'ghost'}
                onClick={() => change(true)}
            >
                True
            </Button>
            <Button
                className={`h-full w-full px-0.5 py-1.5 bg-background-secondary rounded-sm ${value === false ? 'bg-background-tertiary hover:bg-background-tertiary' : 'hover:bg-background-tertiary/50'}`}
                variant={'ghost'}
                onClick={() => change(false)}
            >
                False
            </Button>
        </div>
    );
};

export default BooleanProp;
