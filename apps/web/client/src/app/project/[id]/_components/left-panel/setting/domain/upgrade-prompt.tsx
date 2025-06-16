import { Button } from '@onlook/ui/button';

export const UpgradePrompt = ({ onClick }: { onClick: () => void }) => {
    return (
        <div className="rounded-md p-4 border bg-blue-600/10 text-blue-600 border-blue-600 dark:bg-blue-950 dark:border-blue-600 dark:text-blue-100">
            <p className="text-sm flex items-center gap-2">
                You must be on Onlook Pro to use a custom Domain.
                <Button
                    variant="link"
                    className="px-2 h-auto p-0 text-blue-600 hover:text-blue-700 dark:text-blue-100 dark:hover:text-blue-200 font-medium"
                    onClick={onClick}
                >
                    Upgrade today!
                </Button>
            </p>
        </div>
    );
};