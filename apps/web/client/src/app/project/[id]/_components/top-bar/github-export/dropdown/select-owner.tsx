import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';

interface Organization {
    id: number;
    login: string;
    avatar_url: string;
    description?: string;
}

interface SelectOwnerStepProps {
    organizations: Organization[];
    isLoading: boolean;
    selectedOwner: string;
    onOwnerSelect: (owner: string) => void;
    onBack: () => void;
}

export const SelectOwnerStep = observer(({ 
    organizations, 
    isLoading, 
    selectedOwner, 
    onOwnerSelect, 
    onBack 
}: SelectOwnerStepProps) => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center gap-4 py-8">
                <Icons.LoadingSpinner className="h-8 w-8 animate-spin text-foreground-secondary" />
                <p className="text-sm text-foreground-secondary">Loading organizations...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground-primary">
                    Where should we create your repository?
                </h4>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="h-6 px-2 text-xs"
                >
                    <Icons.ArrowLeft className="mr-1 h-3 w-3" />
                    Back
                </Button>
            </div>
            
            <p className="text-xs text-foreground-secondary mb-2">
                Select whether to create the repository under your personal account or an organization.
            </p>

            <div className="space-y-2">
                {/* Personal Account Option */}
                <OwnerOption
                    id="personal"
                    name="Personal Account"
                    description="Create under your personal GitHub account"
                    avatar="/api/placeholder-avatar" // You might want to get user's avatar
                    icon={<Icons.Person className="h-4 w-4" />}
                    isSelected={selectedOwner === 'personal'}
                    onSelect={() => onOwnerSelect('personal')}
                />

                {/* Organization Options */}
                {organizations.map((org) => (
                    <OwnerOption
                        key={org.id}
                        id={org.login}
                        name={org.login}
                        description={org.description || 'Organization'}
                        avatar={org.avatar_url}
                        icon={<Icons.Group className="h-4 w-4" />}
                        isSelected={selectedOwner === org.login}
                        onSelect={() => onOwnerSelect(org.login)}
                    />
                ))}
            </div>

            {organizations.length === 0 && (
                <div className="text-center py-4">
                    <Icons.Group className="h-8 w-8 mx-auto text-foreground-secondary mb-2" />
                    <p className="text-xs text-foreground-secondary">
                        No organizations found. You can still create repositories under your personal account.
                    </p>
                </div>
            )}
        </div>
    );
});

interface OwnerOptionProps {
    id: string;
    name: string;
    description: string;
    avatar: string;
    icon: React.ReactNode;
    isSelected: boolean;
    onSelect: () => void;
}

const OwnerOption = ({ id, name, description, avatar, icon, isSelected, onSelect }: OwnerOptionProps) => (
    <button
        onClick={onSelect}
        className={cn(
            'w-full p-3 rounded-md border text-left transition-all duration-200',
            isSelected
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                : 'border-border hover:border-foreground-secondary bg-background hover:bg-background-secondary'
        )}
    >
        <div className="flex items-center gap-3">
            <div className="relative">
                {id === 'personal' ? (
                    <div className="w-8 h-8 rounded-full bg-background-secondary flex items-center justify-center">
                        {icon}
                    </div>
                ) : (
                    <img
                        src={avatar}
                        alt={`${name} avatar`}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.removeAttribute('style');
                        }}
                    />
                )}
                <div 
                    className="w-8 h-8 rounded-full bg-background-secondary flex items-center justify-center" 
                    style={{ display: 'none' }}
                >
                    {icon}
                </div>
            </div>
            
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground-primary">
                        {name}
                    </span>
                    {isSelected && (
                        <Icons.Check className="h-4 w-4 text-blue-500" />
                    )}
                </div>
                <p className="text-xs text-foreground-secondary">
                    {description}
                </p>
            </div>
        </div>
    </button>
);

function cn(...classes: (string | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}