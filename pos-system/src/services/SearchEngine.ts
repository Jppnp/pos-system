import { db, type Product } from '../lib/database';

export interface SearchResult {
  product: Product;
  score: number;
  matchedFields: string[];
  highlightedName: string;
  highlightedDescription: string;
}

export interface SearchOptions {
  maxResults?: number;
  fuzzyThreshold?: number;
  includeInactive?: boolean;
}

/**
 * Advanced search engine with fuzzy matching, Thai/romanized support, and frequency-based ranking
 */
export class SearchEngine {
  private products: Product[] = [];
  private searchFrequency: Map<string, number> = new Map();
  private isInitialized = false;

  /**
   * Initialize the search engine by loading products into memory
   */
  async initialize(): Promise<void> {
    try {
      await this.loadProducts();
      await this.loadSearchFrequency();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize search engine:', error);
      throw error;
    }
  }

  /**
   * Load all active products into memory for fast searching
   */
  private async loadProducts(): Promise<void> {
    this.products = await db.products.filter(product => product.isActive === true).toArray();
  }

  /**
   * Load search frequency data from database
   */
  private async loadSearchFrequency(): Promise<void> {
    const frequencies = await db.searchFrequency.toArray();
    this.searchFrequency.clear();
    frequencies.forEach(freq => {
      this.searchFrequency.set(freq.productId, freq.count);
    });
  }

  /**
   * Refresh products cache (call after product updates)
   */
  async refreshProducts(): Promise<void> {
    await this.loadProducts();
  }

  /**
   * Main search function with fuzzy matching and ranking
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!query.trim()) {
      return await this.getAllProductsAsResults(options);
    }

    const {
      maxResults = 50,
      fuzzyThreshold = 0.6, // Lowered threshold for better fuzzy matching
      includeInactive = false
    } = options;

    const tokens = this.tokenizeQuery(query);
    const results: SearchResult[] = [];

    const productsToSearch = includeInactive 
      ? await db.products.toArray()
      : this.products;

    for (const product of productsToSearch) {
      const result = this.scoreProduct(product, tokens, fuzzyThreshold);
      if (result.score > 0) {
        results.push(result);
      }
    }

    // Sort by score (descending) and limit results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  /**
   * Tokenize search query by spaces and normalize
   */
  private tokenizeQuery(query: string): string[] {
    return query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * Score a product against search tokens
   */
  private scoreProduct(product: Product, tokens: string[], fuzzyThreshold: number): SearchResult {
    const searchText = `${product.name} ${product.description}`.toLowerCase();
    const nameText = product.name.toLowerCase();
    const descriptionText = product.description.toLowerCase();

    let totalScore = 0;
    const matchedFields: string[] = [];
    const nameMatches: Array<{start: number, end: number, token: string}> = [];
    const descriptionMatches: Array<{start: number, end: number, token: string}> = [];

    for (const token of tokens) {
      let tokenScore = 0;
      let fieldMatched = false;

      // Exact match in name (highest score)
      if (nameText.includes(token)) {
        tokenScore += 10;
        fieldMatched = true;
        if (!matchedFields.includes('name')) matchedFields.push('name');
        this.findMatches(nameText, token, nameMatches, token);
      }

      // Exact match in description
      if (descriptionText.includes(token)) {
        tokenScore += 5;
        fieldMatched = true;
        if (!matchedFields.includes('description')) matchedFields.push('description');
        this.findMatches(descriptionText, token, descriptionMatches, token);
      }

      // Fuzzy matching if no exact match found
      if (!fieldMatched) {
        const fuzzyNameScore = this.fuzzyMatch(nameText, token);
        const fuzzyDescScore = this.fuzzyMatch(descriptionText, token);

        if (fuzzyNameScore >= fuzzyThreshold) {
          tokenScore += fuzzyNameScore * 8;
          if (!matchedFields.includes('name')) matchedFields.push('name');
        }

        if (fuzzyDescScore >= fuzzyThreshold) {
          tokenScore += fuzzyDescScore * 4;
          if (!matchedFields.includes('description')) matchedFields.push('description');
        }
      }

      // Thai/romanized matching
      const thaiScore = this.thaiRomanizedMatch(searchText, token);
      if (thaiScore > 0) {
        tokenScore += thaiScore * 3;
        fieldMatched = true;
      }

      totalScore += tokenScore;
    }

    // Apply frequency boost
    const frequency = this.searchFrequency.get(product.id || '') || 0;
    const frequencyBoost = Math.log(frequency + 1) * 0.5;
    totalScore += frequencyBoost;

    // Boost for exact name matches
    if (tokens.length === 1 && nameText === tokens[0]) {
      totalScore += 20;
    }

    return {
      product,
      score: totalScore,
      matchedFields,
      highlightedName: this.highlightMatches(product.name, nameMatches),
      highlightedDescription: this.highlightMatches(product.description, descriptionMatches)
    };
  }

  /**
   * Find all matches of a token in text
   */
  private findMatches(
    text: string, 
    token: string, 
    matches: Array<{start: number, end: number, token: string}>,
    originalToken: string
  ): void {
    let index = 0;
    while ((index = text.indexOf(token, index)) !== -1) {
      matches.push({
        start: index,
        end: index + token.length,
        token: originalToken
      });
      index += token.length;
    }
  }

  /**
   * Highlight matched portions in text
   */
  private highlightMatches(
    originalText: string, 
    matches: Array<{start: number, end: number, token: string}>
  ): string {
    if (matches.length === 0) return originalText;

    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start);

    let result = '';
    let lastEnd = 0;

    for (const match of matches) {
      // Add text before match
      result += originalText.slice(lastEnd, match.start);
      // Add highlighted match
      result += `<mark>${originalText.slice(match.start, match.end)}</mark>`;
      lastEnd = match.end;
    }

    // Add remaining text
    result += originalText.slice(lastEnd);
    return result;
  }

  /**
   * Fuzzy string matching using Levenshtein distance
   */
  private fuzzyMatch(text: string, pattern: string): number {
    if (pattern.length === 0) return 0;
    if (text.includes(pattern)) return 1;

    // Find best substring match
    let bestScore = 0;
    const patternLen = pattern.length;

    for (let i = 0; i <= text.length - patternLen; i++) {
      const substring = text.substr(i, patternLen);
      const distance = this.levenshteinDistance(substring, pattern);
      const similarity = 1 - (distance / Math.max(substring.length, pattern.length));
      bestScore = Math.max(bestScore, similarity);
    }

    return bestScore;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Thai/romanized text matching
   */
  private thaiRomanizedMatch(text: string, token: string): number {
    // Basic Thai to romanized mapping
    const thaiToRoman: Record<string, string> = {
      'ก': 'k', 'ข': 'kh', 'ค': 'kh', 'ง': 'ng',
      'จ': 'j', 'ฉ': 'ch', 'ช': 'ch', 'ซ': 's',
      'ญ': 'y', 'ด': 'd', 'ต': 't', 'ถ': 'th',
      'ท': 'th', 'น': 'n', 'บ': 'b', 'ป': 'p',
      'ผ': 'ph', 'ฝ': 'f', 'พ': 'ph', 'ฟ': 'f',
      'ภ': 'ph', 'ม': 'm', 'ย': 'y', 'ร': 'r',
      'ล': 'l', 'ว': 'w', 'ศ': 's', 'ษ': 's',
      'ส': 's', 'ห': 'h', 'ฬ': 'l', 'อ': '',
      'ฮ': 'h', 'า': 'a', 'ิ': 'i', 'ี': 'i',
      'ึ': 'ue', 'ื': 'ue', 'ุ': 'u', 'ู': 'u',
      'เ': 'e', 'แ': 'ae', 'โ': 'o', 'ใ': 'ai',
      'ไ': 'ai', '่': '', '้': '', '๊': '', '๋': '',
      'ั': 'a', 'ำ': 'am'
    };

    // Convert Thai text to romanized
    let romanized = '';
    for (const char of text) {
      romanized += thaiToRoman[char] || char;
    }

    // Check if token matches romanized version
    if (romanized.includes(token)) {
      return 1;
    }

    // Check reverse: if token is Thai and text contains romanized equivalent
    let tokenRomanized = '';
    for (const char of token) {
      tokenRomanized += thaiToRoman[char] || char;
    }

    if (text.includes(tokenRomanized)) {
      return 1;
    }

    return 0;
  }

  /**
   * Get all products as search results (for empty queries)
   */
  private async getAllProductsAsResults(options: SearchOptions): Promise<SearchResult[]> {
    const { maxResults = 50, includeInactive = false } = options;
    
    let productsToReturn;
    if (includeInactive) {
      productsToReturn = await db.products.toArray();
    } else {
      productsToReturn = this.products.filter(p => p.isActive);
    }

    const results = productsToReturn.map(product => ({
      product,
      score: this.searchFrequency.get(product.id || '') || 0,
      matchedFields: [],
      highlightedName: product.name,
      highlightedDescription: product.description
    })).sort((a, b) => b.score - a.score);

    return results.slice(0, maxResults);
  }

  /**
   * Record that a product was accessed (for frequency tracking)
   */
  async recordProductAccess(productId: string): Promise<void> {
    try {
      const currentCount = this.searchFrequency.get(productId) || 0;
      const newCount = currentCount + 1;
      
      this.searchFrequency.set(productId, newCount);
      
      // Update database
      await db.searchFrequency.put({
        productId,
        count: newCount
      });
    } catch (error) {
      console.error('Failed to record product access:', error);
    }
  }

  /**
   * Get search suggestions based on partial input
   */
  async getSuggestions(partialQuery: string, limit: number = 5): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const suggestions = new Set<string>();
    const query = partialQuery.toLowerCase();

    for (const product of this.products) {
      const words = `${product.name} ${product.description}`.toLowerCase().split(/\s+/);
      
      for (const word of words) {
        if (word.startsWith(query) && word.length > query.length) {
          suggestions.add(word);
          if (suggestions.size >= limit) break;
        }
      }
      
      if (suggestions.size >= limit) break;
    }

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Clear search frequency data
   */
  async clearSearchFrequency(): Promise<void> {
    try {
      await db.searchFrequency.clear();
      this.searchFrequency.clear();
    } catch (error) {
      console.error('Failed to clear search frequency:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const searchEngine = new SearchEngine();