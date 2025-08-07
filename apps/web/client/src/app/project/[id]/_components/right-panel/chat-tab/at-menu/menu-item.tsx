import { forwardRef, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import type { AtMenuItem } from '@/components/store/editor/chat/at-menu/types';

interface MenuItemProps {
  item: AtMenuItem;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  showChevron?: boolean;
  isInitialSelection?: boolean;
  keyboardActive?: boolean;
  isChildItem?: boolean;
  onSwatchSelect?: (swatchName: string) => void;
  onChevronClick?: () => void;
}

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(
  ({ item, isSelected, onClick, onMouseEnter, showChevron, isInitialSelection = false, keyboardActive = false, isChildItem = false, onSwatchSelect, onChevronClick }, ref) => {
    const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);

    // Clamp tooltip within viewport once it is rendered
    useEffect(() => {
      if (!tooltip || !tooltipRef.current) return;
      const viewportWidth = window.innerWidth;
      const margin = 8;
      const width = tooltipRef.current.getBoundingClientRect().width;
      const half = width / 2;
      let clampedX = tooltip.x;
      if (clampedX - half < margin) clampedX = margin + half;
      if (clampedX + half > viewportWidth - margin) clampedX = viewportWidth - margin - half;
      if (Math.abs(clampedX - tooltip.x) > 0.5) {
        setTooltip({ ...tooltip, x: clampedX });
      }
    }, [tooltip]);
    const getIcon = () => {
      switch (item.icon) {
        case 'code':
          return <Icons.Code className="w-4 h-4" />;
        case 'file':
          return <Icons.File className="w-4 h-4" />;
        case 'directory':
        case 'folder':
          return <Icons.Directory className="w-4 h-4" />;
        case 'layers':
          return <Icons.Layers className="w-4 h-4" />;
        case 'brand':
          return <Icons.Brand className="w-4 h-4" />;
        case 'image':
          return <Icons.Image className="w-4 h-4" />;
        case 'viewGrid':
          return <Icons.ViewGrid className="w-4 h-4" />;
        case 'component':
          return <Icons.Component className="w-4 h-4" />;
        case 'palette':
          return <Icons.Tokens className="w-4 h-4" />;
        case 'type':
          return <Icons.Text className="w-4 h-4" />;
        default:
          return <Icons.File className="w-4 h-4" />;
      }
    };

    return (
      <>
      <button
        ref={ref}
        onMouseEnter={onMouseEnter}
        onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={cn(
          'w-full flex flex-row items-center h-6 cursor-pointer pr-1 text-left group rounded transition-colors',
          isInitialSelection && isSelected
            ? 'bg-gray-700 text-white' 
            : isSelected
            ? 'bg-gray-600 text-white'
            : keyboardActive
            ? 'text-white'
            : 'hover:bg-gray-600 focus:bg-gray-600 text-white'
        )}
      >
        <div className={cn(
          'w-4 h-4 ml-1 mr-2 flex-none',
          isInitialSelection && isSelected 
            ? 'text-white' 
            : isSelected
            ? 'text-white'
            : keyboardActive
            ? 'text-foreground-secondary'
            : 'text-foreground-secondary group-hover:text-white group-focus:text-white'
        )}>
          {item.thumbnail ? (
            <img 
              src={item.thumbnail} 
              alt={item.name}
              className="w-4 h-4 object-cover rounded"
              onError={(e) => {
                // Fallback to icon if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={cn(item.thumbnail ? 'hidden' : '')}>
            {getIcon()}
          </div>
        </div>
        
        <span className={cn(
          'truncate flex-1 text-xs',
          isInitialSelection && isSelected
            ? 'text-gray-400'
            : 'text-gray-500'
        )}>
          <span className={cn(
            'text-sm',
            isInitialSelection && isSelected 
              ? 'text-white font-medium' 
              : isSelected
              ? 'text-white'
              : keyboardActive
              ? 'text-foreground-secondary'
              : 'text-foreground-secondary group-hover:text-white group-focus:text-white'
          )}>
            {item.name}
          </span>
          {item.path && item.path !== '/' && !isChildItem && (
            <span className={cn(
              'text-xs ml-1',
              isInitialSelection && isSelected 
                ? 'text-gray-400' 
                : 'text-gray-500'
            )}>
              {item.path}
            </span>
          )}
        </span>
        
        {/* Swatches preview on the right if provided */}
        {item.swatches && item.swatches.length > 0 && (
          <div className="flex items-center gap-2 ml-auto ml-2 flex-shrink-0">
            {item.swatches.slice(0, 4).map((s, i) => (
              <span
                key={i}
                className="inline-block w-4 h-4 rounded-md"
                style={{ backgroundColor: s.color }}
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setTooltip({ text: s.name ?? s.color, x: rect.left + rect.width / 2, y: rect.top - 6 });
                }}
                onMouseLeave={() => setTooltip(null)}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSwatchSelect) onSwatchSelect(s.name ?? s.color);
                }}
                aria-hidden="true"
              />
            ))}
          </div>
        )}
        {showChevron && item.hasChildren && (
          <div
            role="button"
            tabIndex={-1}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onChevronClick && onChevronClick();
            }}
            className="ml-2 -mr-1 flex items-center justify-center flex-shrink-0 px-2 py-1 rounded cursor-pointer group"
            aria-label="Open"
            title="Open"
          >
            <Icons.ChevronRight className="w-4 h-4 text-gray-400 transition-colors group-hover:text-white" />
          </div>
        )}
      </button>
      {tooltip ? createPortal(
        <div
          className="px-2 py-1 rounded text-xs bg-gray-900 text-white whitespace-nowrap z-[100000] shadow-md"
          ref={tooltipRef}
          style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)', pointerEvents: 'none' }}
        >
          {tooltip.text}
        </div>,
        document.body
      ) : null}
      </>
    );
  }
);

MenuItem.displayName = 'MenuItem'; 