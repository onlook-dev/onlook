import { forwardRef } from 'react';
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
}

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(
  ({ item, isSelected, onClick, onMouseEnter, showChevron, isInitialSelection = false, keyboardActive = false, isChildItem = false }, ref) => {
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
      <button
        ref={ref}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
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
        
        <span className="truncate text-sm flex-1">
          <span className={cn(
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
        
        {showChevron && item.hasChildren && (
          <Icons.ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0 ml-auto" />
        )}
      </button>
    );
  }
);

MenuItem.displayName = 'MenuItem'; 