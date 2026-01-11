import React, { useState, useEffect, useRef, useCallback } from 'react';
import { searchEngine, type SearchResult } from '../services/SearchEngine';
import { productService } from '../services/ProductService';
import { type Product } from '../lib/database';

interface ProductSearchProps {
  onProductSelect?: (product: Product) => void;
  placeholder?: string;
  className?: string;
  maxResults?: number;
  showHighlighting?: boolean;
}

interface SearchResultItemProps {
  result: SearchResult;
  onSelect: (product: Product) => void;
  showHighlighting: boolean;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ 
  result, 
  onSelect, 
  showHighlighting 
}) => {
  const handleClick = () => {
    onSelect(result.product);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(price);
  };

  const createMarkup = (text: string) => {
    return { __html: text };
  };

  return (
    <div
      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {showHighlighting ? (
                  <span dangerouslySetInnerHTML={createMarkup(result.highlightedName)} />
                ) : (
                  result.product.name
                )}
              </p>
              {result.product.description && (
                <p className="text-sm text-gray-500 truncate">
                  {showHighlighting ? (
                    <span dangerouslySetInnerHTML={createMarkup(result.highlightedDescription)} />
                  ) : (
                    result.product.description
                  )}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {formatPrice(result.product.sellingPrice)}
              </p>
              <p className="text-xs text-gray-500">
                คงเหลือ: {result.product.quantity}
              </p>
            </div>
          </div>
          {result.matchedFields.length > 0 && (
            <div className="mt-1">
              <span className="text-xs text-blue-600">
                ตรงกับ: {result.matchedFields.join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ProductSearch: React.FC<ProductSearchProps> = ({
  onProductSelect,
  placeholder = "ค้นหาสินค้า...",
  className = "",
  maxResults = 10,
  showHighlighting = true
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  // Initialize search engine
  useEffect(() => {
    const initializeSearch = async () => {
      try {
        await productService.initializeSearch();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize search:', error);
      }
    };

    initializeSearch();
  }, []);

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!isInitialized) return;

    setIsLoading(true);
    try {
      const searchResults = await searchEngine.search(searchQuery, { 
        maxResults 
      });
      setResults(searchResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, maxResults]);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce search for 150ms
    debounceRef.current = window.setTimeout(() => {
      if (value.trim()) {
        performSearch(value);
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 150);
  };

  // Handle product selection
  const handleProductSelect = async (product: Product) => {
    // Record product access for frequency tracking
    if (product.id) {
      await productService.recordProductAccess(product.id);
    }

    // Clear search
    setQuery('');
    setResults([]);
    setShowResults(false);

    // Notify parent component
    if (onProductSelect) {
      onProductSelect(product);
    }

    // Focus back to input for next search
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (query.trim() && results.length > 0) {
      setShowResults(true);
    }
  };

  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowResults(false);
      setQuery('');
      setResults([]);
    }
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          disabled={!isInitialized}
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {showResults && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-96 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {results.length > 0 ? (
            <>
              {results.map((result, index) => (
                <SearchResultItem
                  key={result.product.id || index}
                  result={result}
                  onSelect={handleProductSelect}
                  showHighlighting={showHighlighting}
                />
              ))}
              {results.length === maxResults && (
                <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50">
                  แสดง {maxResults} รายการแรก - พิมพ์เพิ่มเติมเพื่อกรองผลลัพธ์
                </div>
              )}
            </>
          ) : query.trim() ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              ไม่พบสินค้าที่ตรงกับ "{query}"
            </div>
          ) : null}
        </div>
      )}

      {/* Initialization Status */}
      {!isInitialized && (
        <div className="absolute z-40 mt-1 w-full bg-yellow-50 border border-yellow-200 rounded-md p-2">
          <p className="text-sm text-yellow-800">กำลังโหลดข้อมูลสินค้า...</p>
        </div>
      )}
    </div>
  );
};

export default ProductSearch;