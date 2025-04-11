"use client";

import { useState } from "react";
import { Icons } from "@onlook/ui-v4/icons";
import { InputDropdown } from "../inputs/input-dropdown";
import { cn } from "@onlook/ui/utils";
import { InputIcon } from "../inputs/input-icon";

export function LayoutPosition() {
  const [layoutType, setLayoutType] = useState<"Flex" | "Grid">("Flex");
  const [direction, setDirection] = useState<"horizontal" | "vertical">("horizontal");
  const [verticalAlign, setVerticalAlign] = useState<"top" | "center" | "bottom" | "space-between">("center");
  const [horizontalAlign, setHorizontalAlign] = useState<"left" | "center" | "right" | "space-between">("center");
  const [gap, setGap] = useState("12");
  const [width, setWidth] = useState("100");
  const [height, setHeight] = useState("228");
  const [positionType, setPositionType] = useState("Relative");

  return (
    <div className="space-y-1">
      {/* Layout Section */}
      <div className="rounded-lg bg-background backdrop-blur p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white w-24">Layout</span>
          <Icons.ChevronUp className="h-4 w-4 text-muted-foreground" />
        </div>
        
        {/* Type (Flex/Grid) */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground w-24">Type</span>
          <div className="flex flex-1">
            <button
              className={cn(
                "px-4 py-1.5 text-sm rounded-l-md flex-1",
                layoutType === "Flex" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setLayoutType("Flex")}
            >
              Flex
            </button>
            <button
              className={cn(
                "px-4 py-1.5 text-sm rounded-r-md flex-1",
                layoutType === "Grid" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setLayoutType("Grid")}
            >
              Grid
            </button>
          </div>
        </div>
        
        {/* Direction */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground w-24">Direction</span>
          <div className="flex flex-1">
            <button
              className={cn(
                "p-2 rounded-l-md flex-1",
                direction === "vertical" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setDirection("vertical")}
            >
              <Icons.ArrowDown className="h-4 w-4 mx-auto" />
            </button>
            <button
              className={cn(
                "p-2 rounded-r-md flex-1",
                direction === "horizontal" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setDirection("horizontal")}
            >
              <Icons.ArrowRight className="h-4 w-4 mx-auto" />
            </button>
          </div>
        </div>
        
        {/* Vertical Alignment */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground w-24">Vertical</span>
          <div className="flex flex-1">
            <button
              className={cn(
                "p-2 rounded-l-md flex-1",
                verticalAlign === "top" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setVerticalAlign("top")}
            >
              <Icons.AlignTop className="h-4 w-4 mx-auto" />
            </button>
            <button
              className={cn(
                "p-2 flex-1",
                verticalAlign === "center" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setVerticalAlign("center")}
            >
              <Icons.AlignCenterVertically className="h-4 w-4 mx-auto" />
            </button>
            <button
              className={cn(
                "p-2 flex-1",
                verticalAlign === "bottom" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setVerticalAlign("bottom")}
            >
              <Icons.AlignBottom className="h-4 w-4 mx-auto" />
            </button>
            <button
              className={cn(
                "p-2 rounded-r-md flex-1",
                verticalAlign === "space-between" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setVerticalAlign("space-between")}
            >
              <Icons.SpaceBetweenVertically className="h-4 w-4 mx-auto" />
            </button>
          </div>
        </div>
        
        {/* Horizontal Alignment */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground w-24">Horizontal</span>
          <div className="flex flex-1">
            <button
              className={cn(
                "p-2 rounded-l-md flex-1",
                horizontalAlign === "left" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setHorizontalAlign("left")}
            >
              <Icons.AlignLeft className="h-4 w-4 mx-auto" />
            </button>
            <button
              className={cn(
                "p-2 flex-1",
                horizontalAlign === "center" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setHorizontalAlign("center")}
            >
              <Icons.AlignCenterHorizontally className="h-4 w-4 mx-auto" />
            </button>
            <button
              className={cn(
                "p-2 flex-1",
                horizontalAlign === "right" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setHorizontalAlign("right")}
            >
              <Icons.AlignRight className="h-4 w-4 mx-auto" />
            </button>
            <button
              className={cn(
                "p-2 rounded-r-md flex-1",
                horizontalAlign === "space-between" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setHorizontalAlign("space-between")}
            >
              <Icons.SpaceBetweenHorizontally className="h-4 w-4 mx-auto" />
            </button>
          </div>
        </div>
        
        {/* Gap */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground w-24">Gap</span>
          <div className="flex-1">
            <InputIcon value={12} />
          </div>
        </div>
      </div>
      
      {/* Spacing Section */}
      <div className="rounded-lg bg-background backdrop-blur p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white w-24">Spacing</span>
          <Icons.ChevronUp className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      
      {/* Sizing Section */}
      <div className="rounded-lg bg-background backdrop-blur p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white w-24">Sizing</span>
          <Icons.ChevronUp className="h-4 w-4 text-muted-foreground" />
        </div>
        
        {/* Width */}
        <div className="flex items-center justify-between mb-3">
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
        <div className="flex items-center justify-between mb-3">
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
        <div className="flex items-center justify-between mb-3">
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
        <div className="flex items-center justify-between mb-3">
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
        <div className="flex items-center justify-between mb-3">
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
      
      {/* Position Section */}
      <div className="rounded-lg bg-background backdrop-blur p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white w-24">Position</span>
          <Icons.ChevronUp className="h-4 w-4 text-muted-foreground" />
        </div>
        
        {/* Position Type */}
        <div className="flex items-center justify-between mb-3">
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
    </div>
  );
}
