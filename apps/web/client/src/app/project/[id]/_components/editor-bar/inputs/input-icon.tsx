import { Icons } from "@onlook/ui-v4/icons";

interface InputIconProps {
    icon: keyof typeof Icons;
    value: string;
}

export const InputIcon = ({ icon, value }: InputIconProps) => {
    const Icon = Icons[icon];

    return (
        <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 min-h-4 min-w-4 text-muted-foreground" />
            <div className="flex items-center bg-background-tertiary/50 rounded-md px-3 py-1.5 flex-1">
                <input 
                    type="text" 
                    value={value}
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                />
            </div>
        </div>
    );
};
