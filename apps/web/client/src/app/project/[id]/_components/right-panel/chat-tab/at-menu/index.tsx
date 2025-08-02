import { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { MenuItem } from './menu-item';
import { AtMenuDataProviders } from '@/components/store/editor/chat/at-menu/data-providers';
import { FuzzySearch } from '@/components/store/editor/chat/at-menu/fuzzy-search';
import type { AtMenuItem, AtMenuState } from '@/components/store/editor/chat/at-menu/types';
import { createPortal } from 'react-dom';

interface AtMenuProps {
  state: AtMenuState;
  onSelectItem: (item: AtMenuItem) => void;
  onClose: () => void;
  onStateChange: (state: Partial<AtMenuState>) => void;
  editorEngine: any;
}

export const AtMenu = ({ state, onSelectItem, onClose, onStateChange, editorEngine }: AtMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [dataProviders] = useState(() => new AtMenuDataProviders(editorEngine));
  const [allItems, setAllItems] = useState<AtMenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<Record<string, AtMenuItem[]>>({
    recents: [],
    folders: [],
    code: [],
    leftPanel: []
  });

  // Get all items from data providers
  useEffect(() => {
    const items = dataProviders.getAllItems();
    console.log('AtMenu: Loaded items:', items.length);
    setAllItems(items);
  }, [dataProviders]);

  // Filter items based on search query
  useEffect(() => {
    if (state.searchQuery) {
      const results = FuzzySearch.getGroupedResults(state.searchQuery, allItems);
      setFilteredItems(results);
    } else {
      const results = {
        recents: dataProviders.getRecents(),
        folders: dataProviders.getFoldersAndFiles(),
        code: dataProviders.getCodeFiles(),
        leftPanel: dataProviders.getLeftPanelItems()
      };
      console.log('AtMenu: Filtered items:', results);
      setFilteredItems(results);
    }
  }, [state.searchQuery, allItems, dataProviders]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.isOpen) return;

      const allItems = [
        ...(filteredItems.recents || []),
        ...(filteredItems.folders || []),
        ...(filteredItems.code || []),
        ...(filteredItems.leftPanel || [])
      ];

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          const nextIndex = state.selectedIndex < allItems.length - 1 ? state.selectedIndex + 1 : 0;
          onStateChange({ selectedIndex: nextIndex });
          break;
        case 'ArrowUp':
          e.preventDefault();
          const prevIndex = state.selectedIndex > 0 ? state.selectedIndex - 1 : allItems.length - 1;
          onStateChange({ selectedIndex: prevIndex });
          break;
        case 'Enter':
          e.preventDefault();
          if (state.selectedIndex >= 0 && state.selectedIndex < allItems.length) {
            const selectedItem = allItems[state.selectedIndex];
            if (selectedItem) {
              onSelectItem(selectedItem);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    if (state.isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.isOpen, state.selectedIndex, filteredItems, onSelectItem, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (state.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [state.isOpen, onClose]);

  console.log('AtMenu render:', { 
    isOpen: state.isOpen, 
    position: state.position,
    allItemsCount: allItems.length,
    filteredItemsCount: Object.values(filteredItems).flat().length
  });
  
  if (!state.isOpen) return null;

  const allItemsFlat = [
    ...(filteredItems.recents || []),
    ...(filteredItems.folders || []),
    ...(filteredItems.code || []),
    ...(filteredItems.leftPanel || [])
  ];

  const renderCategory = (title: string, items: AtMenuItem[], category: string) => {
    if (items.length === 0) return null;

    return (
      <div key={category} className="px-2">
        <h3 className="text-gray-400 text-sm font-medium mb-1 mt-3">
          {title}
        </h3>
        <div className="space-y-1 w-full">
          {items.map((item, index) => {
            const globalIndex = getGlobalIndex(category, index);
            const isSelected = globalIndex === state.selectedIndex;

            return (
              <MenuItem
                key={item.id}
                item={item}
                isSelected={isSelected}
                onClick={() => onSelectItem(item)}
                onMouseEnter={() => {
                  onStateChange({ selectedIndex: globalIndex });
                }}
                showChevron={item.hasChildren}
              />
            );
          })}
        </div>
        {category !== 'leftPanel' && (
          <div className="border-b border-gray-700 mt-2" />
        )}
      </div>
    );
  };

  const getGlobalIndex = (category: string, localIndex: number): number => {
    const categories = ['recents', 'folders', 'code', 'leftPanel'];
    const categoryIndex = categories.indexOf(category);
    let globalIndex = localIndex;
    
    for (let i = 0; i < categoryIndex; i++) {
      const category = categories[i];
      if (category) {
        globalIndex += (filteredItems[category] || []).length;
      }
    }
    
    return globalIndex;
  };

  // Calculate menu position with better viewport handling
  const calculateMenuPosition = () => {
    const menuWidth = 300;
    const menuHeight = Math.min(400, allItemsFlat.length * 40 + 100); // Estimate height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // state.position.top is the textarea's top position
    // We want the menu's BOTTOM to be above the textarea
    let top = state.position.top - menuHeight - 10; // 10px gap between menu bottom and textarea top
    let left = state.position.left;
    
    // If the menu would go off the top of the screen, position it below the textarea
    if (top < 10) {
      top = state.position.top + 25; // 25px below textarea top
    }
    
    // If the menu would go off the bottom of the screen, adjust to fit
    if (top + menuHeight > viewportHeight - 10) {
      top = Math.max(10, viewportHeight - menuHeight - 10);
    }
    
    // Ensure menu doesn't go off the left of the screen
    if (left < 10) {
      left = 10;
    }
    
    // Ensure menu doesn't go off the right of the screen
    if (left + menuWidth > viewportWidth - 10) {
      left = viewportWidth - menuWidth - 10;
    }
    
    return { top, left };
  };

  const menuPosition = calculateMenuPosition();

  const menuContent = (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="fixed border rounded-lg shadow-2xl z-[9999] w-[300px] max-w-[calc(100vw-2rem)] sm:min-w-[300px] overflow-y-auto border-gray-600 bg-gray-800 max-h-[400px]"
      style={{
        top: menuPosition.top,
        left: menuPosition.left,
        zIndex: 99999,
        position: 'fixed'
      }}
    >
      <div className="rounded-lg bg-gray-800">
        {renderCategory('Recents', filteredItems.recents || [], 'recents')}
        {renderCategory('Folders & Files', filteredItems.folders || [], 'folders')}
        {renderCategory('Code', filteredItems.code || [], 'code')}
        {renderCategory('Left Panel', filteredItems.leftPanel || [], 'leftPanel')}
        
        {allItemsFlat.length === 0 && (
          <div className="p-4 text-center text-gray-400">
            <div className="text-sm">
              Loading items...
            </div>
          </div>
        )}
        
        {state.searchQuery && allItemsFlat.length === 0 && (
          <div className="p-4 text-center text-gray-400">
            <div className="text-sm">
              No files or folders match "{state.searchQuery}"
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  // Render the menu at the document body level to avoid overflow clipping
  return createPortal(menuContent, document.body);
}; 