"use client";

import { useState } from "react";
import { Icons } from "@onlook/ui-v4/icons";
import { InputDropdown } from "../inputs/input-dropdown";
import { cn } from "@onlook/ui/utils";
import { InputIcon } from "../inputs/input-icon";
import { InputRadio } from "../inputs/input-radio";
import { Button } from "@onlook/ui-v4/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@onlook/ui-v4/dropdown-menu";

interface LayoutPositionProps {
  className?: string;
}

export function LayoutPosition({ className }: LayoutPositionProps) {
  const [layoutType, setLayoutType] = useState<"None" | "Flex" | "Grid">("Flex");
  const [direction, setDirection] = useState<"vertical" | "horizontal">("horizontal");
  const [verticalAlign, setVerticalAlign] = useState<"top" | "center" | "bottom" | "space-between">("center");
  const [horizontalAlign, setHorizontalAlign] = useState<"left" | "center" | "right" | "space-between">("center");
  const [gap, setGap] = useState("12");
  const [width, setWidth] = useState("100");
  const [height, setHeight] = useState("228");
  const [positionType, setPositionType] = useState("Relative");
  const [showMarginInputs, setShowMarginInputs] = useState(false);
  const [showPaddingInputs, setShowPaddingInputs] = useState(false);

  // Section collapse states
  const [layoutOpen, setLayoutOpen] = useState(true);
  const [spacingOpen, setSpacingOpen] = useState(true);
  const [sizingOpen, setSizingOpen] = useState(true);
  const [positionOpen, setPositionOpen] = useState(true);

  const typeOptions = [
    { value: "None", label: "None" },
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
    <div className={cn("space-y-1", className)}>
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
                  onChange={(value) => setLayoutType(value as "None" | "Flex" | "Grid")}
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
              <div className="w-[225px] flex items-center gap-1">
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
            {/* Margin */}
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground w-24">Margin</span>
              <div className="w-[225px] flex items-center gap-1">
                <InputIcon value={12} />
                <div 
                  onClick={() => setShowMarginInputs(!showMarginInputs)}
                  className="min-w-9 h-9 flex items-center justify-center bg-background-tertiary/50 rounded-md cursor-pointer hover:bg-background-tertiary/80"
                >
                  <Icons.Margin className="h-4 w-4 min-h-4 min-w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
            {showMarginInputs && (
              <div className="grid grid-cols-2 gap-2">
                <InputIcon icon="LeftSide" value={24} />
                <InputIcon icon="TopSide" value={16} />
                <InputIcon icon="RightSide" value={24} />
                <InputIcon icon="BottomSide" value={16} />
              </div>
            )}

            {/* Padding */}
            <div className="flex items-center gap-1 mt-2">
              <span className="text-sm text-muted-foreground w-24">Padding</span>
             
              <div className="w-[225px] flex items-center gap-1">
                <InputIcon value={12} />
                <div 
                  onClick={() => setShowPaddingInputs(!showPaddingInputs)}
                  className="min-w-9 h-9 flex items-center justify-center bg-background-tertiary/50 rounded-md cursor-pointer hover:bg-background-tertiary/80"
                >
                  <Icons.Padding className="h-4 w-4 min-h-4 min-w-4 text-muted-foreground" />
                </div>
              </div>

            </div>
            {showPaddingInputs && (
              <div className="grid grid-cols-2 gap-2">
                <InputIcon icon="LeftSide" value={24} />
                <InputIcon icon="TopSide" value={16} />
                <InputIcon icon="RightSide" value={24} />
                <InputIcon icon="BottomSide" value={16} />
              </div>
            )}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="h-[36px] w-full bg-background-tertiary/50 hover:bg-background-tertiary/80 rounded-md ml-[1px] px-2.5 flex items-center justify-between cursor-pointer"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{positionType}</span>
                        </div>
                        <Icons.ChevronDown className="h-4 w-4 min-h-4 min-w-4 text-muted-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full min-w-[100px] -mt-[1px] p-1 rounded-lg">
                    <DropdownMenuItem 
                        className="flex items-center px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white"
                        onSelect={() => setPositionType("Static")}
                    >
                        Static
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        className="flex items-center px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white"
                        onSelect={() => setPositionType("Relative")}
                    >
                        Relative
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        className="flex items-center px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white"
                        onSelect={() => setPositionType("Sticky")}
                    >
                        Sticky
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        className="flex items-center px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white"
                        onSelect={() => setPositionType("Absolute")}
                    >
                        Absolute
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>     
              </div>
            </div>
            
            {/* Position Coordinates */}
            <div className="grid grid-cols-2 gap-2">
                        <InputIcon icon="LeftSide" value={12} />
                        <InputIcon icon="TopSide" value={18} />
                        <InputIcon icon="RightSide" value={12} />
                        <InputIcon icon="BottomSide" value={18} />
                    </div>
          </div>
        )}
      </div>
    </div>
  );
}
