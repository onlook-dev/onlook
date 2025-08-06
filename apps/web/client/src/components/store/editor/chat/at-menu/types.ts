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
}

export interface AtMenuState {
  isOpen: boolean;
  position: { top: number; left: number };
  selectedIndex: number;
  searchQuery: string;
  activeMention: boolean;
  previewText: string;
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