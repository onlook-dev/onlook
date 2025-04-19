"use client";

import { Button } from "@onlook/ui-v4/button";
import { Icons } from "@onlook/ui-v4/icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@onlook/ui-v4/dropdown-menu";
import { StateDropdown } from "./dropdowns/state-dropdown";
import { InputDropdown } from "./inputs/input-dropdown";
import { InputIcon } from "./inputs/input-icon";
import { InputRange } from "./inputs/input-range";
import { Width } from "./dropdowns/width";
import { Height } from "./dropdowns/height";
import { Padding } from "./dropdowns/padding";
import { Margin } from "./dropdowns/margin";
import { Radius } from "./dropdowns/radius";
import { useState } from "react";
import { ImageBackground } from "./dropdowns/img-background";
import { ColorBackground } from "./dropdowns/color-background";
import { Border } from "./dropdowns/border";
import { Display } from "./dropdowns/display";
import { ViewButtons } from "./panels/panel-bar/bar";

export const DivSelected = () => {
    const [activeTab, setActiveTab] = useState('individual');

    return (
        <div className="flex items-center gap-1">
            <StateDropdown />

            <div className="h-6 w-[1px] bg-border" />

            <Display />

            <div className="h-6 w-[1px] bg-border" />

            <Width />

            <div className="h-6 w-[1px] bg-border" />

            <Height />
       
            <div className="h-6 w-[1px] bg-border" />

            <Padding />

            <div className="h-6 w-[1px] bg-border" />

            <Margin />

            <div className="h-6 w-[1px] bg-border" />
    
            <Radius />

            <div className="h-6 w-[1px] bg-border" />

            <Border />

            <div className="h-6 w-[1px] bg-border" />

            <ColorBackground />

            <div className="h-6 w-[1px] bg-border" />

            <ImageBackground />

            <ViewButtons />
        </div>
    );
};
