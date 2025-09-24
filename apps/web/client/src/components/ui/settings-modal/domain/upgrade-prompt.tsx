import { Button } from '@onlook/ui/button';

export const UpgradePrompt = ({ onClick }: { onClick: () => void }) => {
    return (
        <div className="rounded-md border border-blue-600 bg-blue-600/10 p-4 text-blue-600 dark:border-blue-600 dark:bg-blue-950 dark:text-blue-100">
            <p className="flex items-center gap-2 text-sm">
                You must be on Onlook Pro to use a custom Domain.
                <Button
                    variant="link"
                    className="h-auto p-0 px-2 font-medium text-blue-600 hover:text-blue-700 dark:text-blue-100 dark:hover:text-blue-200"
                    onClick={onClick}
                >
                    Upgrade today!
                </Button>
            </p>
        </div>
    );
};
