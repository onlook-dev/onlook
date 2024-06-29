import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export default function SharePopover() {
    const url = "https://onlook.dev/"
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                    Share
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                    <Label className="">Copy Share Link</Label>
                    <div className="flex items-center justify-between rounded-md border bg-background px-4 py-2">
                        <p className="text-sm text-muted-foreground">{url}</p>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                navigator.clipboard.writeText(url)
                            }}
                        >
                            Copy
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}