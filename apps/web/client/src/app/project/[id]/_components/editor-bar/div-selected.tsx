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
import { InputSeparator } from "./separator";
export const DivSelected = () => {
    const [activeTab, setActiveTab] = useState('individual');

    return (
        <div className="flex items-center gap-1">
            <StateDropdown />

            <InputSeparator />

            <Display />

            <InputSeparator />

            <Width />

            <InputSeparator />

            <Height />

            <InputSeparator />

            <Padding />

            <InputSeparator />

            <Margin />

            <InputSeparator />

            <Radius />

            <InputSeparator />

            <Border />

            <InputSeparator />

            <ColorBackground />

            <InputSeparator />

            <ImageBackground />

            <ViewButtons />
        </div>
    );
};
