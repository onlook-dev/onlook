export interface AtMenuItem {
  id: string;
  type: 'folder' | 'file' | 'tab' | 'recent';
  name: string;
  path: string;
  hasChildren?: boolean;
  children?: AtMenuItem[];
  icon?: string;
  category: 'recents' | 'files' | 'code' | 'leftPanel';
  thumbnail?: string; // Path to image for thumbnail display
  swatches?: { color: string; name?: string }[]; // Optional color swatches with names
}

export interface AtMenuState {
  isOpen: boolean;
  position: { top: number; left: number };
  selectedIndex: number;
  searchQuery: string;
  activeMention: boolean;
  previewText: string;
  // New nested menu state
  isSubmenuOpen: boolean;
  submenuParent: AtMenuItem | null;
  submenuItems: AtMenuItem[];
  submenuSelectedIndex: number;
  // Optional stack of submenu parents for multi-level navigation
  submenuHistory?: AtMenuItem[];
}

export interface AtMenuContext {
  items: AtMenuItem[];
  state: AtMenuState;
  setState: (state: Partial<AtMenuState>) => void;
  selectItem: (item: AtMenuItem) => void;
  closeMenu: () => void;
}

export interface Mention {
  id: string;
  name: string;
  startIndex: number;
  endIndex: number;
} 