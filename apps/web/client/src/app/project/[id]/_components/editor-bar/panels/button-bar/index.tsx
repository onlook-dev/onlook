import { Icons } from "@onlook/ui-v4/icons";
import { PanelButton } from "./button";

export const ViewButtons = () => {
    return (
        <div className="ml-auto flex items-center gap-1">
            <PanelButton icon={Icons.Text} />
            <PanelButton icon={Icons.ViewGrid} />
        </div>
    );
};
