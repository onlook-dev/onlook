import type { AtMenuItem } from './types';

export class FuzzySearch {
  /**
   * Simple fuzzy search implementation
   * Checks if all characters in the query appear in order in the target string
   */
  static search(query: string, items: AtMenuItem[]): AtMenuItem[] {
    if (!query.trim()) return items;

    const searchTerm = query.toLowerCase();
    
    return items.filter((item) => {
      const itemName = item.name.toLowerCase();
      const itemPath = item.path.toLowerCase();

      // Check if all characters in query appear in order in the name
      const nameMatch = this.fuzzyMatch(searchTerm, itemName);
      
      // Check if all characters in query appear in order in the path
      const pathMatch = this.fuzzyMatch(searchTerm, itemPath);

      return nameMatch || pathMatch;
    });
  }

  /**
   * Check if all characters in query appear in order in target
   */
  private static fuzzyMatch(query: string, target: string): boolean {
    let queryIndex = 0;
    
    for (let i = 0; i < target.length && queryIndex < query.length; i++) {
      if (target[i] === query[queryIndex]) {
        queryIndex++;
      }
    }

    return queryIndex === query.length;
  }

  /**
   * Search within specific categories
   */
  static searchByCategory(query: string, items: AtMenuItem[], category: AtMenuItem['category']): AtMenuItem[] {
    const categoryItems = items.filter(item => item.category === category);
    return this.search(query, categoryItems);
  }

  /**
   * Get search results grouped by category
   */
  static getGroupedResults(query: string, items: AtMenuItem[]) {
    const categories = ['recents', 'files', 'code', 'leftPanel'] as const;
    
    const results: Record<string, AtMenuItem[]> = {};
    
    categories.forEach(category => {
      results[category] = this.searchByCategory(query, items, category);
    });

    return results;
  }
} 