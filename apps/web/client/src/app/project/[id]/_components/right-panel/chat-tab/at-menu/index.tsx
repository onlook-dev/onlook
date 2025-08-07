import { useRef, useEffect, useState, useLayoutEffect } from 'react';
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

// Function to get cursor coordinates in a contenteditable element
const getCaretCoordinates = (element: HTMLElement): { top: number; left: number; bottom: number } => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    // Fallback to element position
    const rect = element.getBoundingClientRect();
    return { top: rect.top, left: rect.left, bottom: rect.bottom };
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // If the range has no width/height (collapsed cursor), insert a temporary span at the caret to measure
  if (rect.width === 0 && rect.height === 0) {
    const clonedRange = range.cloneRange();
    const tempSpan = document.createElement('span');
    tempSpan.appendChild(document.createTextNode('\u200b')); // Zero-width space

    clonedRange.insertNode(tempSpan);

    const spanRect = tempSpan.getBoundingClientRect();
    const coordinates = { top: spanRect.top, left: spanRect.left, bottom: spanRect.bottom };

    tempSpan.parentNode?.removeChild(tempSpan);

    return coordinates;
  }
  
  return { top: rect.top, left: rect.left, bottom: rect.bottom };
};

export const AtMenu = ({ state, onSelectItem, onClose, onStateChange, editorEngine }: AtMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const submenuSelectedItemRef = useRef<HTMLButtonElement>(null);
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
  const [menuHeightMeasured, setMenuHeightMeasured] = useState(0);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [mouseInMenu, setMouseInMenu] = useState(false);
  const [currentFolderContext, setCurrentFolderContext] = useState<AtMenuItem | null>(null);

  // Get all items from data providers
  useEffect(() => {
    const items = dataProviders.getAllItems();
    console.log('AtMenu: Loaded items:', items.length);
    setAllItems(items);
  }, [dataProviders]);

  // Handle submenu opening when an item with children is clicked
  const handleItemClick = (item: AtMenuItem) => {
    if (item.hasChildren && !state.isSubmenuOpen) {
      let childItems: AtMenuItem[] = [];

      // Handle special left panel parents (Brand, Images, Pages)
      if (item.category === 'leftPanel') {
        switch (item.id) {
          case 'brand':
            childItems = dataProviders.getBrandChildItems();
            break;
          case 'images':
            childItems = dataProviders.getImagesChildItems();
            break;
          case 'pages':
            childItems = dataProviders.getPagesChildItems();
            break;
          default:
            childItems = [];
        }
      }

      // Fallback to generic folder children when none of the above matched
      if (childItems.length === 0) {
        childItems = dataProviders.getChildItems(item.path);
      }

      // Open submenu regardless of whether it contains children
      console.log('AtMenu: Opening submenu for:', item.name, 'with', childItems.length, 'children');
      onStateChange({
        isSubmenuOpen: true,
        submenuParent: item,
        submenuItems: childItems,
        submenuSelectedIndex: 0
      });
      return;
    }

    // Regular item selection
    onSelectItem(item);
  };

  // Handle back button click to return to main menu
  const handleBackClick = () => {
    console.log('AtMenu: Closing submenu, returning to main menu');

    // Calculate which index the submenu parent occupies in the *current* main list so we can
    // restore focus/highlight to it when the user returns.
    const flatMainItems = [
      ...(filteredItems.recents ?? []),
      ...(filteredItems.files ?? []),
      ...(filteredItems.code ?? []),
      ...(filteredItems.leftPanel ?? [])
    ];

    // Find the index of the submenu parent in the flattened list – if it cannot be found we
    // simply fall back to 0 so that the first item is highlighted.
    const parentIndex = state.submenuParent
      ? flatMainItems.findIndex((i) => i.id === state.submenuParent?.id)
      : 0;

    onStateChange({
      isSubmenuOpen: false,
      submenuParent: null,
      submenuItems: [],
      submenuSelectedIndex: 0,
      // Restore the selection so keyboard navigation starts from a sensible place
      selectedIndex: parentIndex >= 0 ? parentIndex : 0
    });
  };

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

  // Scroll submenu selected item into view
  useEffect(() => {
    if (state.isSubmenuOpen && submenuSelectedItemRef.current) {
      submenuSelectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [state.submenuSelectedIndex, state.isSubmenuOpen]);

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

      if (state.isSubmenuOpen) {
        // Handle submenu keyboard navigation
        const submenuItems = state.submenuItems;
        
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setLastInteractionMethod('keyboard');
            setKeyboardActive(true);
            setHasUserInteracted(true);
            const nextSubmenuIndex = state.submenuSelectedIndex < submenuItems.length - 1 ? state.submenuSelectedIndex + 1 : 0;
            onStateChange({ submenuSelectedIndex: nextSubmenuIndex });
            break;
          case 'ArrowUp':
            e.preventDefault();
            setLastInteractionMethod('keyboard');
            setKeyboardActive(true);
            setHasUserInteracted(true);
            const prevSubmenuIndex = state.submenuSelectedIndex > 0 ? state.submenuSelectedIndex - 1 : submenuItems.length - 1;
            onStateChange({ submenuSelectedIndex: prevSubmenuIndex });
            break;
          case 'Enter':
            e.preventDefault();
            if (state.submenuSelectedIndex >= 0 && state.submenuSelectedIndex < submenuItems.length) {
              const selectedItem = submenuItems[state.submenuSelectedIndex];
              if (selectedItem) {
                onSelectItem(selectedItem);
              }
            }
            break;
          case 'ArrowLeft':
            e.preventDefault();
            handleBackClick();
            break;
          case 'Escape':
            e.preventDefault();
            handleBackClick();
            break;
        }
        return;
      }

      // Main menu keyboard navigation
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
        case 'ArrowRight':
          e.preventDefault();
          if (state.selectedIndex >= 0 && state.selectedIndex < allItems.length) {
            const selectedItem = allItems[state.selectedIndex];
            if (selectedItem && selectedItem.hasChildren) {
              handleItemClick(selectedItem);
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
  }, [state.isOpen, state.selectedIndex, state.isSubmenuOpen, state.submenuSelectedIndex, state.submenuItems, filteredItems, onSelectItem, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (state.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
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
    filteredItemsCount: Object.values(filteredItems).flat().length,
    isSubmenuOpen: state.isSubmenuOpen,
    submenuParent: state.submenuParent?.name
  });
  
  // Measure menu height after render to adjust positioning dynamically
  useLayoutEffect(() => {
    if (menuRef.current) {
      const newHeight = menuRef.current.getBoundingClientRect().height;
      if (Math.abs(newHeight - menuHeightMeasured) > 1) {
        setMenuHeightMeasured(newHeight);
      }
    }
  }, [state.isSubmenuOpen, state.submenuItems, state.selectedIndex, menuHeightMeasured]);

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
                  onClick={() => handleItemClick(item)}
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

  const renderSubmenu = () => {
    if (!state.isSubmenuOpen || !state.submenuParent) return null;

    return (
      <div className="px-2">
        <div className={cn(
          "space-y-1 w-full",
          state.submenuItems.length === 0 ? "mt-0" : "mt-2"
        )}>
          {state.submenuItems.length === 0 ? (
            <div className="w-full py-2 text-center text-gray-400 text-sm">
              No files here.
            </div>
          ) : (
            state.submenuItems.map((item, index) => {
              const isSelected = index === state.submenuSelectedIndex;

              return (
                <MenuItem
                  key={item.id}
                  ref={isSelected ? submenuSelectedItemRef : undefined}
                  item={item}
                  isSelected={isSelected}
                  isInitialSelection={isSelected && !hasUserInteracted}
                  keyboardActive={keyboardActive}
                  onClick={() => onSelectItem(item)}
                  onMouseEnter={() => {
                    if (!keyboardActive) {
                      setLastInteractionMethod('mouse');
                      setHasUserInteracted(true);
                      onStateChange({ submenuSelectedIndex: index });
                    }
                  }}
                  showChevron={false}
                  isChildItem={true}
                />
              );
            })
          )}
        </div>
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
    // Use measured height if available (especially important for variable-height submenus)
    const mainMenuHeightEstimate = Math.min(400, allItemsFlat.length * 40 + 100);
    // For submenus use measured height if it exists, else fallback estimate
    const submenuHeightEstimate = Math.min(400, state.submenuItems.length * 40 + 60);

    const menuHeight = menuHeightMeasured > 0
      ? menuHeightMeasured
      : (state.isSubmenuOpen ? submenuHeightEstimate : mainMenuHeightEstimate);

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let top, left;
    
    if (state.isSubmenuOpen) {
      // For submenu, get the actual cursor position from the contenteditable element
      const contentEditableElement = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (contentEditableElement) {
        const cursorCoords = getCaretCoordinates(contentEditableElement);
        const caretY = cursorCoords.top;
        
        // Position submenu just above the caret – 5 px gap
        top = caretY - 5;
        // Align submenu horizontally with caret (like main menu)
        left = cursorCoords.left;
        // Clamp within viewport
        if (left + menuWidth > viewportWidth - 10) {
          left = viewportWidth - menuWidth - 10;
        }
        if (left < 10) {
          left = 10;
        }
         
         // If the submenu would go off the top of the screen, position it below the cursor
         if (top < 10) {
           top = cursorCoords.top + 20; // 20px below cursor
         }
       } else {
         // Fallback to main-menu-relative positioning
         left = state.position.left;
         top = state.position.top - menuHeight - 5;
      }
    } else {
      // ===== Main menu positioning =====
      // We align the bottom of the menu 5 px above the caret so vertical
      // position remains consistent even as the menu height changes with
      // different fuzzy-search result counts.
      const contentEditableElement = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (contentEditableElement) {
        const cursorCoords = getCaretCoordinates(contentEditableElement);
        const caretY = cursorCoords.top;
        top = caretY - 5; // bottom 5px above caret's top
        left = cursorCoords.left;
      } else {
        // Fallback to stored textbox coordinates if caret not found
        top = state.position.top - menuHeight - 5;
        left = state.position.left;
      }

      // Clamp horizontally within viewport
      if (left + menuWidth > viewportWidth - 10) {
        left = viewportWidth - menuWidth - 10;
      }
      if (left < 10) {
        left = 10;
      }

      // If anchor very close to top, place menu below caret
      if (top < 10) {
        const fallbackY = contentEditableElement ? getCaretCoordinates(contentEditableElement).top : state.position.top;
        top = fallbackY + 20; // 20px below caret/input
      }
    }
    
    // Ensure the anchor point isn't too low in the viewport
    if (top > viewportHeight - 10) {
      top = viewportHeight - 10;
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="fixed border rounded-lg shadow-2xl z-[9999] w-[320px] max-w-[calc(100vw-2rem)] sm:min-w-[320px] overflow-y-auto border-gray-600 bg-gray-800 max-h-[400px]"
      style={{
        top: menuPosition.top,
        left: menuPosition.left,
        y: '-100%',
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
        {/* ===== SUBMENU HEADER WITH BACK BUTTON ===== */}
        {state.isSubmenuOpen && state.submenuParent && (
          <div className="px-2 py-1 border-b border-gray-700">
            <div className="flex items-center text-xs text-gray-400">
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleBackClick();
                }}
                className="flex items-center hover:text-white transition-colors mr-2"
                title="Go back to main menu"
              >
                <Icons.ArrowLeft className="w-3 h-3" />
              </button>
              <span className="font-mono">{state.submenuParent.name}/</span>
            </div>
          </div>
        )}
        
        {/* ===== FOLDER CONTEXT BREADCRUMB (for search-based navigation) ===== */}
        {!state.isSubmenuOpen && currentFolderContext && (
          <div className="px-2 py-1 border-b border-gray-700">
            <div className="flex items-center text-xs text-gray-400">
              <span className="font-mono">@{currentFolderContext.name}/</span>
            </div>
          </div>
        )}
        
        {/* ===== SUBMENU CONTENT ===== */}
        {state.isSubmenuOpen ? (
          renderSubmenu()
        ) : (
          <>
            {/* ===== AT MENU SECTION: RECENTS ===== */}
            {renderCategory('Recents', filteredItems.recents ?? [], 'recents', true)}
            
            {/* ===== AT MENU SECTION: FOLDERS AND FILES ===== */}
            {renderCategory('Folders & Files', filteredItems.files ?? [], 'files')}
            
            {/* ===== AT MENU SECTION: CODE ===== */}
            {renderCategory('Code', filteredItems.code ?? [], 'code')}
            
            {/* ===== AT MENU SECTION: LEFT PANEL ===== */}
            {renderCategory('Design Panel', filteredItems.leftPanel ?? [], 'leftPanel')}
          </>
        )}
        
        {!state.isSubmenuOpen && allItemsFlat.length === 0 && (
          <div className="p-4 text-center text-gray-400">
            <div className="text-sm">
              Loading items...
            </div>
          </div>
        )}
        
        {!state.isSubmenuOpen && state.searchQuery && allItemsFlat.length === 0 && (
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