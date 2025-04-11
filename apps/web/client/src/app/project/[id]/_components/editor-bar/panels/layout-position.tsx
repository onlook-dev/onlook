"use client";

import { useState } from "react";
import { Icons } from "@onlook/ui-v4/icons";
import { InputDropdown } from "../inputs/input-dropdown";
import { cn } from "@onlook/ui/utils";

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
          <span className="text-sm font-medium text-white">Layout</span>
          <Icons.ChevronUp className="h-4 w-4 text-muted-foreground" />
        </div>
        
        {/* Type (Flex/Grid) */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Type</span>
          <div className="flex">
            <button
              className={cn(
                "px-4 py-1.5 text-sm rounded-l-md",
                layoutType === "Flex" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setLayoutType("Flex")}
            >
              Flex
            </button>
            <button
              className={cn(
                "px-4 py-1.5 text-sm rounded-r-md",
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
          <span className="text-sm text-muted-foreground">Direction</span>
          <div className="flex">
            <button
              className={cn(
                "p-2 rounded-l-md",
                direction === "vertical" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setDirection("vertical")}
            >
              <Icons.ArrowDown className="h-4 w-4" />
            </button>
            <button
              className={cn(
                "p-2 rounded-r-md",
                direction === "horizontal" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setDirection("horizontal")}
            >
              <Icons.ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Vertical Alignment */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Vertical</span>
          <div className="flex">
            <button
              className={cn(
                "p-2 rounded-l-md",
                verticalAlign === "top" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setVerticalAlign("top")}
            >
              <Icons.AlignTop className="h-4 w-4" />
            </button>
            <button
              className={cn(
                "p-2",
                verticalAlign === "center" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setVerticalAlign("center")}
            >
              <Icons.AlignCenterVertically className="h-4 w-4" />
            </button>
            <button
              className={cn(
                "p-2",
                verticalAlign === "bottom" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setVerticalAlign("bottom")}
            >
              <Icons.AlignBottom className="h-4 w-4" />
            </button>
            <button
              className={cn(
                "p-2 rounded-r-md",
                verticalAlign === "space-between" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setVerticalAlign("space-between")}
            >
              <Icons.SpaceBetweenVertically className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Horizontal Alignment */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Horizontal</span>
          <div className="flex">
            <button
              className={cn(
                "p-2 rounded-l-md",
                horizontalAlign === "left" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setHorizontalAlign("left")}
            >
              <Icons.AlignLeft className="h-4 w-4" />
            </button>
            <button
              className={cn(
                "p-2",
                horizontalAlign === "center" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setHorizontalAlign("center")}
            >
              <Icons.AlignCenterHorizontally className="h-4 w-4" />
            </button>
            <button
              className={cn(
                "p-2",
                horizontalAlign === "right" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setHorizontalAlign("right")}
            >
              <Icons.AlignRight className="h-4 w-4" />
            </button>
            <button
              className={cn(
                "p-2 rounded-r-md",
                horizontalAlign === "space-between" ? "bg-background-tertiary text-white" : "bg-background-tertiary/50 text-muted-foreground"
              )}
              onClick={() => setHorizontalAlign("space-between")}
            >
              <Icons.SpaceBetweenHorizontally className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Gap */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Gap</span>
          <InputDropdown
            value={gap}
            unit="PX"
            dropdownValue="PX"
            dropdownOptions={["PX", "%", "REM"]}
            onChange={setGap}
          />
        </div>
      </div>
      
      {/* Spacing Section */}
      <div className="rounded-lg bg-background backdrop-blur p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">Spacing</span>
          <Icons.ChevronUp className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      
      {/* Sizing Section */}
      <div className="rounded-lg bg-background backdrop-blur p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">Sizing</span>
          <Icons.ChevronUp className="h-4 w-4 text-muted-foreground" />
        </div>
        
        {/* Width */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Width</span>
          <InputDropdown
            value={width}
            unit="%"
            dropdownValue="Rel"
            dropdownOptions={["Rel", "PX", "VW"]}
            onChange={setWidth}
          />
        </div>
        
        {/* Min Width */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Min</span>
          <InputDropdown
            value="--"
            unit="-"
            dropdownValue="Rel"
            dropdownOptions={["Rel", "PX", "VW"]}
          />
        </div>
        
        {/* Max Width */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Max</span>
          <InputDropdown
            value="--"
            unit="-"
            dropdownValue="Rel"
            dropdownOptions={["Rel", "PX", "VW"]}
          />
        </div>
        
        {/* Height */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Height</span>
          <InputDropdown
            value={height}
            unit="PX"
            dropdownValue="Rel"
            dropdownOptions={["Rel", "PX", "VH"]}
            onChange={setHeight}
          />
        </div>
        
        {/* Min Height */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Min</span>
          <InputDropdown
            value="--"
            unit="-"
            dropdownValue="Rel"
            dropdownOptions={["Rel", "PX", "VH"]}
          />
        </div>
        
        {/* Max Height */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Max</span>
          <InputDropdown
            value="--"
            unit="-"
            dropdownValue="Rel"
            dropdownOptions={["Rel", "PX", "VH"]}
          />
        </div>
      </div>
      
      {/* Position Section */}
      <div className="rounded-lg bg-background backdrop-blur p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">Position</span>
          <Icons.ChevronUp className="h-4 w-4 text-muted-foreground" />
        </div>
        
        {/* Position Type */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Type</span>
          <div className="w-[160px]">
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
