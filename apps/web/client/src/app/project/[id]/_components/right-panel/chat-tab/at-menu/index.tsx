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
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const [dataProviders] = useState(() => new AtMenuDataProviders(editorEngine));
  const [allItems, setAllItems] = useState<AtMenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<Record<string, AtMenuItem[]>>({
    recents: [],
    files: [],
    code: [],
    leftPanel: []
  });
  const [lastInteractionMethod, setLastInteractionMethod] = useState<'keyboard' | 'mouse'>('keyboard');
  const [keyboardActive, setKeyboardActive] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [mouseInMenu, setMouseInMenu] = useState(false);
  const [currentFolderContext, setCurrentFolderContext] = useState<AtMenuItem | null>(null);

  // Get all items from data providers
  useEffect(() => {
    const items = dataProviders.getAllItems();
    console.log('AtMenu: Loaded items:', items.length);
    setAllItems(items);
  }, [dataProviders]);

  // Filter items based on search query
  useEffect(() => {
    if (state.searchQuery) {
      // Check if this is a folder navigation (contains /)
      const folderMatch = /^([^\/]+)\/$/.exec(state.searchQuery);
      if (folderMatch?.[1]) {
        const folderName = folderMatch[1];
        console.log('AtMenu: Detected folder navigation for:', folderName);
        
        // Check if this is brand navigation
        if (folderName.toLowerCase() === 'brand') {
          console.log('AtMenu: Detected brand navigation');
          // Get brand child items
          const brandChildItems = dataProviders.getBrandChildItems();
          
          const results = {
            recents: [],
            files: [],
            code: [],
            leftPanel: brandChildItems // Show brand child items in leftPanel section
          };
          
          console.log('AtMenu: Brand child items:', brandChildItems);
          setFilteredItems(results);
          setCurrentFolderContext({
            id: 'brand',
            type: 'tab',
            name: 'Brand',
            path: '/brand',
            category: 'leftPanel',
            icon: 'brand'
          });
          return;
        }
        
        // Check if this is images navigation
        if (folderName.toLowerCase() === 'images') {
          console.log('AtMenu: Detected images navigation');
          // Get images child items
          const imagesChildItems = dataProviders.getImagesChildItems();
          
          const results = {
            recents: [],
            files: imagesChildItems, // Show image items in files section
            code: [],
            leftPanel: []
          };
          
          console.log('AtMenu: Images child items:', imagesChildItems);
          setFilteredItems(results);
          setCurrentFolderContext({
            id: 'images',
            type: 'tab',
            name: 'Images',
            path: '/images',
            category: 'leftPanel',
            icon: 'image'
          });
          return;
        }
        
        // Check if this is pages navigation
        if (folderName.toLowerCase() === 'pages') {
          console.log('AtMenu: Detected pages navigation');
          // Get pages child items
          const pagesChildItems = dataProviders.getPagesChildItems();
          
          const results = {
            recents: [],
            files: [],
            code: [],
            leftPanel: pagesChildItems // Show page items in leftPanel section
          };
          
          console.log('AtMenu: Pages child items:', pagesChildItems);
          setFilteredItems(results);
          setCurrentFolderContext({
            id: 'pages',
            type: 'tab',
            name: 'Pages',
            path: '/pages',
            category: 'leftPanel',
            icon: 'file'
          });
          return;
        }
        
        // Find the folder in our data
        const allFolders = dataProviders.getFolders();
        const targetFolder = allFolders.find(folder => 
          folder.name.toLowerCase() === folderName.toLowerCase()
        );
        
        if (targetFolder) {
          console.log('AtMenu: Found folder:', targetFolder);
          // Get child items for this folder
          const childItems = dataProviders.getChildItems(targetFolder.path);
          
          const results = {
            recents: [],
            files: childItems, // Show child items in files section
            code: [],
            leftPanel: []
          };
          
          console.log('AtMenu: Child items for folder:', childItems);
          setFilteredItems(results);
          setCurrentFolderContext(targetFolder);
          return;
        }
      }
      
      // Regular fuzzy search
      const results = FuzzySearch.getGroupedResults(state.searchQuery, allItems);
      setFilteredItems(results);
      setCurrentFolderContext(null);
    } else {
      const results = {
        recents: dataProviders.getRecents(),
        files: dataProviders.getFoldersAndFiles(),
        code: dataProviders.getCodeFiles(),
        leftPanel: dataProviders.getLeftPanelItems()
      };
      console.log('AtMenu: Filtered items:', results);
      console.log('AtMenu: Files count:', results.files.length);
      console.log('AtMenu: Code count:', results.code.length);
      setFilteredItems(results);
      setCurrentFolderContext(null);
    }
  }, [state.searchQuery, allItems, dataProviders]);

  // Scroll selected item into view when selection changes
  useEffect(() => {
    if (state.isOpen && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [state.selectedIndex, state.isOpen]);

  // Reset keyboard active state after a delay of no keyboard interaction
  useEffect(() => {
    if (keyboardActive && state.isOpen) {
      const timeout = setTimeout(() => {
        setKeyboardActive(false);
      }, 2000); // Reset after 2 seconds of no keyboard interaction

      return () => clearTimeout(timeout);
    }
  }, [keyboardActive, state.isOpen, state.selectedIndex]);

  // Reset user interaction state when menu opens
  useEffect(() => {
    if (state.isOpen) {
      setHasUserInteracted(false);
      setMouseInMenu(false);
    }
  }, [state.isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.isOpen) return;

              const allItems = [
          ...(filteredItems.recents ?? []),
          ...(filteredItems.files ?? []),
          ...(filteredItems.code ?? []),
          ...(filteredItems.leftPanel ?? [])
        ];

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setLastInteractionMethod('keyboard');
          setKeyboardActive(true);
          setHasUserInteracted(true);
          const nextIndex = state.selectedIndex < allItems.length - 1 ? state.selectedIndex + 1 : 0;
          onStateChange({ selectedIndex: nextIndex });
          
          // If wrapping to top, scroll to beginning
          if (nextIndex === 0 && state.selectedIndex === allItems.length - 1) {
            setTimeout(() => {
              if (menuRef.current) {
                menuRef.current.scrollTo({
                  top: 0,
                  behavior: 'smooth'
                });
              }
            }, 50); // Small delay to ensure state update completes
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setLastInteractionMethod('keyboard');
          setKeyboardActive(true);
          setHasUserInteracted(true);
          const prevIndex = state.selectedIndex > 0 ? state.selectedIndex - 1 : allItems.length - 1;
          onStateChange({ selectedIndex: prevIndex });
          
          // If wrapping to bottom, scroll to end
          if (prevIndex === allItems.length - 1 && state.selectedIndex === 0) {
            setTimeout(() => {
              if (menuRef.current) {
                menuRef.current.scrollTo({
                  top: menuRef.current.scrollHeight,
                  behavior: 'smooth'
                });
              }
            }, 50); // Small delay to ensure state update completes
          }
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

  // Add debugging for render
  useEffect(() => {
    if (state.isOpen) {
      console.log('AtMenu render: Files section items:', filteredItems.files ?? []);
      console.log('AtMenu render: Code section items:', filteredItems.code ?? []);
    }
  }, [state.isOpen, filteredItems.files, filteredItems.code]);

  console.log('AtMenu render:', { 
    isOpen: state.isOpen, 
    position: state.position,
    allItemsCount: allItems.length,
    filteredItemsCount: Object.values(filteredItems).flat().length
  });
  
  if (!state.isOpen) return null;

  const allItemsFlat = [
    ...(filteredItems.recents ?? []),
    ...(filteredItems.files ?? []),
    ...(filteredItems.code ?? []),
    ...(filteredItems.leftPanel ?? [])
  ];

  const renderCategory = (title: string, items: AtMenuItem[], category: string, isFirst = false) => {
    // For recents: only show if there are actual recent items
    if (category === 'recents' && items.length === 0) return null;
    
    // For other categories: only show if there are items
    if (items.length === 0) return null;

    // Don't show section headers when in any child view (folder navigation)
    const isChildView = currentFolderContext !== null;
    const shouldShowHeader = !isChildView;

    return (
      <div key={category} className="px-2">
        {shouldShowHeader && (
          <h3 className={cn(
            "text-gray-400 text-sm font-medium mb-1",
            isFirst ? "mt-0" : "mt-2"
          )}>
            {title}
          </h3>
        )}
        <div className="space-y-1 w-full">
          {items.length === 0 ? (
            <div className="text-gray-500 text-xs py-1 px-2">
              No items found
            </div>
          ) : (
            items.map((item, index) => {
              const globalIndex = getGlobalIndex(category, index);
              const isSelected = globalIndex === state.selectedIndex;

              return (
                <MenuItem
                  key={item.id}
                  ref={isSelected ? selectedItemRef : undefined}
                  item={item}
                  isSelected={isSelected}
                  isInitialSelection={isSelected && !hasUserInteracted}
                  keyboardActive={keyboardActive}
                  onClick={() => onSelectItem(item)}
                  onMouseEnter={() => {
                    if (!keyboardActive) {
                      setLastInteractionMethod('mouse');
                      setHasUserInteracted(true);
                      onStateChange({ selectedIndex: globalIndex });
                    }
                  }}
                  showChevron={item.hasChildren}
                  isChildItem={currentFolderContext !== null}
                />
              );
            })
          )}
        </div>
        {category !== 'leftPanel' && (
          <div className="border-b border-gray-700 mt-2" />
        )}
      </div>
    );
  };

  const getGlobalIndex = (category: string, localIndex: number): number => {
    const categories = ['recents', 'files', 'code', 'leftPanel'];
    const categoryIndex = categories.indexOf(category);
    let globalIndex = localIndex;
    
    for (let i = 0; i < categoryIndex; i++) {
      const category = categories[i];
      if (category) {
        globalIndex += (filteredItems[category] ?? []).length;
      }
    }
    
    return globalIndex;
  };

  // Calculate menu position with better viewport handling
  const calculateMenuPosition = () => {
    const menuWidth = 320;
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
      className="fixed border rounded-lg shadow-2xl z-[9999] w-[320px] max-w-[calc(100vw-2rem)] sm:min-w-[320px] overflow-y-auto border-gray-600 bg-gray-800 max-h-[400px]"
      style={{
        top: menuPosition.top,
        left: menuPosition.left,
        zIndex: 99999,
        position: 'fixed'
      }}
      onMouseEnter={() => {
        setKeyboardActive(false);
        setLastInteractionMethod('mouse');
        setMouseInMenu(true);
      }}
      onMouseLeave={() => {
        setLastInteractionMethod('keyboard');
        setKeyboardActive(false);
        setHasUserInteracted(false);
        setMouseInMenu(false);
      }}
    >
      <div className="rounded-lg bg-gray-800 py-2">
        {/* ===== FOLDER CONTEXT BREADCRUMB ===== */}
        {currentFolderContext && (
          <div className="px-2 py-1 border-b border-gray-700">
            <div className="flex items-center text-xs text-gray-400">
              <span className="font-mono">@{currentFolderContext.name}/</span>
            </div>
          </div>
        )}
        
        {/* ===== AT MENU SECTION: RECENTS ===== */}
        {renderCategory('Recents', filteredItems.recents ?? [], 'recents', true)}
        
        {/* ===== AT MENU SECTION: FOLDERS AND FILES ===== */}
        {renderCategory('Folders and Files', filteredItems.files ?? [], 'files')}
        
        {/* ===== AT MENU SECTION: CODE ===== */}
        {renderCategory('Code', filteredItems.code ?? [], 'code')}
        
        {/* ===== AT MENU SECTION: LEFT PANEL ===== */}
        {renderCategory('Design Panel', filteredItems.leftPanel ?? [], 'leftPanel')}
        
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
              No files or folders match &quot;{state.searchQuery}&quot;
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  // Render the menu at the document body level to avoid overflow clipping
  return createPortal(menuContent, document.body);
}; 