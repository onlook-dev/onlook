import type { AtMenuItem } from './types';

export class FuzzySearch {
  /**
   * Simple fuzzy search implementation
   * Checks if all characters in the query appear in order in the target string
   */
  /**
   * Perform a fuzzy-search across the supplied list of items.
   *
   * Behavioural improvements over the previous implementation:
   * 1. The query can contain *multiple* space-separated tokens (e.g. "menu item").
   *    Each token must match either the file/folder name or the full path – this
   *    allows much looser matching than a single contiguous search term.
   * 2. Matching ignores case automatically (previously handled) *and* safely
   *    handles extra whitespace.
   * 3. Basic scoring is applied so that the most relevant results appear first
   *    (shorter, earlier matches rank higher).  A dedicated fuzzy-matching
   *    library such as Fuse.js would be even better, but this lightweight
   *    approach keeps bundle size low while providing good quality results.
   */
  static search(query: string, items: AtMenuItem[]): AtMenuItem[] {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return items;

    // Break the query into individual tokens to allow queries such as
    // "menu item tsx" to match "menu-item.tsx".
    const tokens = trimmedQuery.toLowerCase().split(/\s+/).filter(Boolean);

    // Build a list of matches together with a simple relevance score so that we
    // can order the results.  Lower score == better match.
    const matches: { item: AtMenuItem; score: number }[] = [];

    items.forEach((item) => {
      const targetName = item.name.toLowerCase();
      const targetPath = item.path.toLowerCase();

      let totalScore = 0;
      for (const token of tokens) {
        // Try to find an exact substring match first – this is faster than our
        // character-by-character fallback and generally yields better results.
        let bestScore = Infinity;
        const nameIndex = targetName.indexOf(token);
        if (nameIndex !== -1) {
          bestScore = nameIndex; // earlier == better
        }
        const pathIndex = targetPath.indexOf(token);
        if (pathIndex !== -1) {
          bestScore = Math.min(bestScore, pathIndex + 50); // small bias towards name matches
        }

        // If no substring match, fall back to the original fuzzy character check.
        if (bestScore === Infinity && (this.fuzzyMatch(token, targetName) || this.fuzzyMatch(token, targetPath))) {
          // Penalise fuzzy matches compared to direct substring matches.
          bestScore = 1000;
        }

        if (bestScore === Infinity) {
          // This token failed to match either the name or the path – the whole
          // item is therefore not a match.
          return;
        }

        totalScore += bestScore;
      }

      // All tokens matched – push the result.
      matches.push({ item, score: totalScore });
    });

    // Sort by score (ascending) so that the best matches appear first.
    matches.sort((a, b) => a.score - b.score);

    return matches.map((m) => m.item);
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