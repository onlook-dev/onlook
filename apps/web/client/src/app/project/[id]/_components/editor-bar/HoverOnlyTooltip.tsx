import { Tooltip, TooltipTrigger, TooltipContent } from "@onlook/ui/tooltip";
import { useState } from "react";
import type { ReactNode } from "react";

interface HoverOnlyTooltipProps {
  children: ReactNode;
  content: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  hideArrow?: boolean;
  disabled?: boolean;
}

export function HoverOnlyTooltip({
  children,
  content,
  side = "bottom",
  className,
  hideArrow = false,
  disabled = false,
}: HoverOnlyTooltipProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Tooltip open={hovered && !disabled}>
      <TooltipTrigger
        asChild
        onMouseEnter={() => !disabled && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onBlur={() => setHovered(false)}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={className} hideArrow={hideArrow}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
} 