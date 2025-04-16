"use client";

import { useState } from "react";
import { Border } from "./dropdowns/border";
import { ColorBackground } from "./dropdowns/color-background";
import { Display } from "./dropdowns/display";
import { Height } from "./dropdowns/height";
import { ImageBackground } from "./dropdowns/img-background";
import { Margin } from "./dropdowns/margin";
import { Padding } from "./dropdowns/padding";
import { Radius } from "./dropdowns/radius";
import { StateDropdown } from "./dropdowns/state-dropdown";
import { Width } from "./dropdowns/width";
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
