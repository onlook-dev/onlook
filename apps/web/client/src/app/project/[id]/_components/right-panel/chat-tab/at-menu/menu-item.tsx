import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import type { AtMenuItem } from '@/components/store/editor/chat/at-menu/types';

interface MenuItemProps {
  item: AtMenuItem;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  showChevron?: boolean;
}

export const MenuItem = ({ item, isSelected, onClick, onMouseEnter, showChevron }: MenuItemProps) => {
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
      default:
        return <Icons.File className="w-4 h-4" />;
    }
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        'w-full flex flex-row items-center h-6 cursor-pointer pr-1 text-left group rounded transition-colors',
        isSelected 
          ? 'bg-gray-700 text-white' 
          : 'hover:bg-gray-600 text-white'
      )}
    >
      <div className={cn(
        'w-4 h-4 ml-1 mr-2 flex-none',
        isSelected ? 'text-white' : 'text-gray-400 group-hover:text-white'
      )}>
        {getIcon()}
      </div>
      
      <span className="truncate group-hover:text-white text-sm text-slate-300 flex-1">
        {item.name}
        {item.path && item.path !== '/' && (
          <span className="text-gray-500 text-xs ml-1">
            {item.path}
          </span>
        )}
      </span>
      
      {showChevron && item.hasChildren && (
        <Icons.ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0 ml-auto" />
      )}
    </button>
  );
}; 