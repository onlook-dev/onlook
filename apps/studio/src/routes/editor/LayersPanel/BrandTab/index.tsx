import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';

const BrandTab = observer(() => {
    return (
        <div className="flex flex-col gap-2 h-[calc(100vh-8.25rem)] text-xs text-active flex-grow w-full p-0.5">
            {/* Site Colors Section */}
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Site colors</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        View all
                    </Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    <div className="w-12 h-12 rounded-lg bg-[#1E1E1E] cursor-pointer hover:ring-2 hover:ring-border-primary" />
                    <div className="w-12 h-12 rounded-lg bg-[#2E2E2E] cursor-pointer hover:ring-2 hover:ring-border-primary" />
                    <div className="w-12 h-12 rounded-lg bg-[#3E3E3E] cursor-pointer hover:ring-2 hover:ring-border-primary" />
                    <Button
                        variant="outline"
                        size="icon"
                        className="w-12 h-12 rounded-lg border border-dashed"
                    >
                        <Icons.Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Text Styles Section */}
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Text styles</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        View all
                    </Button>
                </div>
                <div className="flex flex-col gap-2">
                    <Button
                        variant="outline"
                        className="h-12 justify-start text-left px-4 hover:bg-background-secondary"
                    >
                        <span className="text-xl font-semibold">Heading</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-12 justify-start text-left px-4 hover:bg-background-secondary"
                    >
                        <span className="text-lg font-medium">Subheading</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-12 justify-start text-left px-4 hover:bg-background-secondary"
                    >
                        <span className="text-base">Body</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-12 justify-start text-left border-dashed"
                    >
                        <span className="text-sm text-muted-foreground">
                            Add a custom text style
                        </span>
                    </Button>
                </div>
            </div>

            {/* Site Fonts Section */}
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Site fonts</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        View all
                    </Button>
                </div>
                <div className="flex flex-col gap-1">
                    <Button
                        variant="ghost"
                        className="justify-between h-8 px-2 hover:bg-background-secondary"
                    >
                        <span className="font-poppins">Poppins</span>
                        <Icons.ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                        variant="ghost"
                        className="justify-between h-8 px-2 hover:bg-background-secondary"
                    >
                        <span className="font-switzer">Switzer</span>
                        <Icons.ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                        variant="ghost"
                        className="justify-start h-8 px-2 text-muted-foreground"
                    >
                        Add a new font
                    </Button>
                </div>
            </div>
        </div>
    );
});

export default BrandTab;
