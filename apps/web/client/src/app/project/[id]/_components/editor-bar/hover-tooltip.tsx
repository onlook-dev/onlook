import { Tooltip, TooltipTrigger, TooltipContent } from "@onlook/ui/tooltip";
import type { ReactNode } from "react";

interface HoverOnlyTooltipProps {
  children: ReactNode;
  content: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  hideArrow?: boolean;
  disabled?: boolean;
  sideOffset?: number;
}

export function HoverOnlyTooltip({
  children,
  content,
  side = "bottom",
  className,
  hideArrow = true,
  disabled = false,
  sideOffset = 5,
}: HoverOnlyTooltipProps) {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <Tooltip disableHoverableContent>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className={className} hideArrow={hideArrow} sideOffset={sideOffset}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
} 