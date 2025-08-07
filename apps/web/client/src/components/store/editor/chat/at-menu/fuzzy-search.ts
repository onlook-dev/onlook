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
    const trimmed = query.trim();
    if (!trimmed) return items;

    // Allow multiple whitespace-separated tokens so that e.g. "menu item tsx"
    // still matches "menu-item.tsx".
    const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);

    const matches: { item: AtMenuItem; score: number }[] = [];

    items.forEach((item) => {
      const name = item.name.toLowerCase();
      const path = item.path.toLowerCase();

      let totalScore = 0;

      for (const token of tokens) {
        // Calculate the score against the name and the path.
        const nameScore = this.computeTokenScore(token, name);
        const pathScore = this.computeTokenScore(token, path) + 10; // small bias towards name matches

        const bestScore = Math.min(nameScore, pathScore);

        if (bestScore === Infinity) {
          // If any token fails to match, skip this item entirely.
          return;
        }

        totalScore += bestScore;
      }

      matches.push({ item, score: totalScore });
    });

    // Lower scores are better – sort ascending.
    matches.sort((a, b) => a.score - b.score);

    return matches.map((m) => m.item);
  }

  /**
   * Determine how well a single token matches the target string.
   * Returns a numeric score where lower is better, or `Infinity` if the token
   * cannot be matched at all.
   */
  private static computeTokenScore(token: string, target: string): number {
    // Fast path – exact substring.
    const idx = target.indexOf(token);
    if (idx !== -1) {
      return idx;
    }

    // Fallback – subsequence (character-by-character) match with a simple gap
    // penalty so that contiguous matches rank higher.
    let lastPos = -1;
    let score = 0;

    for (let i = 0; i < token.length; i++) {
      const ch = token.charAt(i);
      const pos = target.indexOf(ch, lastPos + 1);
      if (pos === -1) {
        return Infinity;
      }
      score += pos - lastPos - 1; // gap penalty
      lastPos = pos;
    }

    // Add a constant so that fuzzy subsequence matches always score worse than
    // direct substring matches.
    return 1000 + score;
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