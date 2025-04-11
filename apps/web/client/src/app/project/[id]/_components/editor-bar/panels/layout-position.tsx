"use client";

import { useState } from "react";
import { Icons } from "@onlook/ui-v4/icons";
import { InputDropdown } from "../inputs/input-dropdown";
import { cn } from "@onlook/ui/utils";
import { InputIcon } from "../inputs/input-icon";
import { InputRadio } from "../inputs/input-radio";

export function LayoutPosition() {
  const [layoutType, setLayoutType] = useState<"--" | "Flex" | "Grid">("Flex");
  const [direction, setDirection] = useState<"vertical" | "horizontal">("horizontal");
  const [verticalAlign, setVerticalAlign] = useState<"top" | "center" | "bottom" | "space-between">("center");
  const [horizontalAlign, setHorizontalAlign] = useState<"left" | "center" | "right" | "space-between">("center");
  const [gap, setGap] = useState("12");
  const [width, setWidth] = useState("100");
  const [height, setHeight] = useState("228");
  const [positionType, setPositionType] = useState("Relative");

  // Section collapse states
  const [layoutOpen, setLayoutOpen] = useState(true);
  const [spacingOpen, setSpacingOpen] = useState(true);
  const [sizingOpen, setSizingOpen] = useState(true);
  const [positionOpen, setPositionOpen] = useState(true);

  const typeOptions = [
    { value: "--", label: "--" },
    { value: "Flex", label: "Flex" },
    { value: "Grid", label: "Grid" },
  ];

  const directionOptions = [
    { value: "vertical", icon: <Icons.ArrowDown className="h-4 w-4" /> },
    { value: "horizontal", icon: <Icons.ArrowRight className="h-4 w-4" /> },
  ];

  const verticalOptions = [
    { value: "top", icon: <Icons.AlignTop className="h-4 w-4" /> },
    { value: "center", icon: <Icons.AlignCenterVertically className="h-4 w-4" /> },
    { value: "bottom", icon: <Icons.AlignBottom className="h-4 w-4" /> },
    { value: "space-between", icon: <Icons.SpaceBetweenVertically className="h-4 w-4" /> },
  ];

  const horizontalOptions = [
    { value: "left", icon: <Icons.AlignLeft className="h-4 w-4" /> },
    { value: "center", icon: <Icons.AlignCenterHorizontally className="h-4 w-4" /> },
    { value: "right", icon: <Icons.AlignRight className="h-4 w-4" /> },
    { value: "space-between", icon: <Icons.SpaceBetweenHorizontally className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-1">
      {/* Layout Section */}
      <div className="rounded-lg bg-background backdrop-blur p-4">
        <div className="flex items-center justify-between mb-0 cursor-pointer" onClick={() => setLayoutOpen(!layoutOpen)}>
          <span className="text-sm font-medium text-white w-24">Layout</span>
          <Icons.ChevronUp className={cn("h-4 w-4 text-muted-foreground transition-transform", !layoutOpen && "rotate-180")} />
        </div>
        
        {layoutOpen && (
          <div className="pt-3 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-24">Type</span>
              <div className="w-[225px]">
                <InputRadio 
                  options={typeOptions} 
                  value={layoutType} 
                  onChange={(value) => setLayoutType(value as "--" | "Flex" | "Grid")}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-24">Direction</span>
              <div className="w-[225px]">
                <InputRadio 
                  options={directionOptions} 
                  value={direction} 
                  onChange={(value) => setDirection(value as "vertical" | "horizontal")}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-24">Vertical</span>
              <div className="w-[225px]">
                <InputRadio 
                  options={verticalOptions} 
                  value={verticalAlign} 
                  onChange={(value) => setVerticalAlign(value as "top" | "center" | "bottom" | "space-between")}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-24">Horizontal</span>
              <div className="w-[225px]">
                <InputRadio 
                  options={horizontalOptions} 
                  value={horizontalAlign} 
                  onChange={(value) => setHorizontalAlign(value as "left" | "center" | "right" | "space-between")}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-24">Gap</span>
              <div className="w-[225px]">
                <InputIcon value={12} />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Spacing Section */}
      <div className="rounded-lg bg-background backdrop-blur p-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setSpacingOpen(!spacingOpen)}>
          <span className="text-sm font-medium text-white w-24">Spacing</span>
          <Icons.ChevronUp className={cn("h-4 w-4 text-muted-foreground transition-transform", !spacingOpen && "rotate-180")} />
        </div>
        {spacingOpen && (
          <div className="pt-3 space-y-2">
            {/* Spacing content */}
          </div>
        )}
      </div>
      
      {/* Sizing Section */}
      <div className="rounded-lg bg-background backdrop-blur p-4">
        <div className="flex items-center justify-between mb-0 cursor-pointer" onClick={() => setSizingOpen(!sizingOpen)}>
          <span className="text-sm font-medium text-white w-24">Sizing</span>
          <Icons.ChevronUp className={cn("h-4 w-4 text-muted-foreground transition-transform", !sizingOpen && "rotate-180")} />
        </div>
        
        {sizingOpen && (
          <div className="pt-3 space-y-2">
            {/* Width */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground w-24">Width</span>
              <div className="flex-1">
                <InputDropdown
                  value={width}
                  unit="%"
                  dropdownValue="Rel"
                  dropdownOptions={["Rel", "PX", "VW"]}
                  onChange={setWidth}
                />
              </div>
            </div>
            
            {/* Min Width */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground w-24">Min</span>
              <div className="flex-1">
                <InputDropdown
                  value="--"
                  unit="-"
                  dropdownValue="Rel"
                  dropdownOptions={["Rel", "PX", "VW"]}
                />
              </div>
            </div>
            
            {/* Max Width */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground w-24">Max</span>
              <div className="flex-1">
                <InputDropdown
                  value="--"
                  unit="-"
                  dropdownValue="Rel"
                  dropdownOptions={["Rel", "PX", "VW"]}
                />
              </div>
            </div>
            
            {/* Height */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground w-24">Height</span>
              <div className="flex-1">
                <InputDropdown
                  value={height}
                  unit="PX"
                  dropdownValue="Rel"
                  dropdownOptions={["Rel", "PX", "VH"]}
                  onChange={setHeight}
                />
              </div>
            </div>
            
            {/* Min Height */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground w-24">Min</span>
              <div className="flex-1">
                <InputDropdown
                  value="--"
                  unit="-"
                  dropdownValue="Rel"
                  dropdownOptions={["Rel", "PX", "VH"]}
                />
              </div>
            </div>
            
            {/* Max Height */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground w-24">Max</span>
              <div className="flex-1">
                <InputDropdown
                  value="--"
                  unit="-"
                  dropdownValue="Rel"
                  dropdownOptions={["Rel", "PX", "VH"]}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Position Section */}
      <div className="rounded-lg bg-background backdrop-blur p-4">
        <div className="flex items-center justify-between mb-0 cursor-pointer" onClick={() => setPositionOpen(!positionOpen)}>
          <span className="text-sm font-medium text-white w-24">Position</span>
          <Icons.ChevronUp className={cn("h-4 w-4 text-muted-foreground transition-transform", !positionOpen && "rotate-180")} />
        </div>
        
        {positionOpen && (
          <div className="pt-3 space-y-2">
            {/* Position Type */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground w-24">Type</span>
              <div className="flex-1">
                <InputDropdown
                  value=""
                  unit=""
                  dropdownValue={positionType}
                  dropdownOptions={["Relative", "Absolute", "Fixed", "Sticky"]}
                  onDropdownChange={(value) => setPositionType(value)}
                />
              </div>
            </div>
            
            {/* Position Coordinates */}
            <div className="flex justify-between gap-2">
              <div className="flex flex-col items-center gap-2">
                <Icons.DotsHorizontal className="h-5 w-5 text-muted-foreground" />
                <InputDropdown
                  value="--"
                  unit=""
                  dropdownValue=""
                  dropdownOptions={[]}
                />
              </div>
              <div className="flex flex-col items-center gap-2">
                <Icons.DotsHorizontal className="h-5 w-5 text-muted-foreground" />
                <InputDropdown
                  value="--"
                  unit=""
                  dropdownValue=""
                  dropdownOptions={[]}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
