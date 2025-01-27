import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import type { Prop } from '.';

interface CodePropProps {
    prop: Prop;
    onClick: () => void;
}

const CodeProp = ({ prop, onClick }: CodePropProps) => {
    return (
        <Button
            className="w-32 flex items-center text-smallPlus justify-center bg-background-secondary hover:bg-background-tertiary disabled:text-foreground-onlook h-8 px-2.5 rounded-l-md hover:text-foreground-active/90 transition-all duration-300 ease-in-out"
            variant={'secondary'}
            onClick={onClick}
        >
            <Icons.Code className="h-4 w-4 mr-2" /> {prop.value}
        </Button>
    );
};

export default CodeProp;
