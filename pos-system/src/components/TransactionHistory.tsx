import { useState, useEffect } from 'react';
import { transactionService } from '../services/TransactionService';
import { productService } from '../services/ProductService';
import type { Transaction, Product } from '../lib/database';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface TransactionHistoryProps {
  className?: string;
}

export default function TransactionHistory({ className = '' }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: ''
  });
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [transactions, dateRange, selectedProductIds]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [transactionsData, productsData] = await Promise.all([
        transactionService.getTransactions(),
        productService.getAllProducts()
      ]);
      
      setTransactions(transactionsData);
      setProducts(productsData);
    } catch (err) {
      console.error('Failed to load transaction history:', err);
      setError('ไม่สามารถโหลดประวัติการขายได้');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Apply date range filter
    if (dateRange.startDate && dateRange.endDate) {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.timestamp);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }

    // Apply product filter
    if (selectedProductIds.length > 0) {
      filtered = filtered.filter(transaction =>
        transaction.items.some(item => selectedProductIds.includes(item.productId))
      );
    }

    setFilteredTransactions(filtered);
  };

  const handleDateRangeChange = (field: keyof DateRange, value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProductFilterChange = (productId: string, checked: boolean) => {
    setSelectedProductIds(prev => {
      if (checked) {
        return [...prev, productId];
      } else {
        return prev.filter(id => id !== productId);
      }
    });
  };

  const clearFilters = () => {
    setDateRange({ startDate: '', endDate: '' });
    setSelectedProductIds([]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date));
  };

  const calculateTotals = () => {
    return transactionService.calculateSalesTotals(filteredTransactions);
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="animate-pulse" data-testid="loading-skeleton">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="text-red-600 text-center">
          <p>{error}</p>
          <button
            onClick={loadData}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            ประวัติการขาย
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="space-y-4">
            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ช่วงวันที่
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="วันที่เริ่มต้น"
                />
                <span className="flex items-center text-gray-500">ถึง</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="วันที่สิ้นสุด"
                />
              </div>
            </div>

            {/* Product Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                กรองตามสินค้า
              </label>
              <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                {products.map((product) => (
                  <label key={product.id} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(product.id!)}
                      onChange={(e) => handleProductFilterChange(product.id!, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{product.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">รายการทั้งหมด:</span>
            <span className="ml-2 font-medium">{totals.transactionCount}</span>
          </div>
          <div>
            <span className="text-gray-600">ยอดขาย:</span>
            <span className="ml-2 font-medium text-green-600">
              {formatCurrency(totals.totalSales)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">ต้นทุน:</span>
            <span className="ml-2 font-medium text-red-600">
              {formatCurrency(totals.totalCost)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">กำไร:</span>
            <span className="ml-2 font-medium text-blue-600">
              {formatCurrency(totals.totalProfit)}
            </span>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="divide-y divide-gray-200">
        {filteredTransactions.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            ไม่พบประวัติการขาย
          </div>
        ) : (
          filteredTransactions.map((transaction) => (
            <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      รายการที่ #{transaction.id}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDateTime(transaction.timestamp)}
                    </span>
                  </div>
                  
                  {/* Transaction Items */}
                  <div className="space-y-1">
                    {transaction.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">
                          {item.name} x{item.quantity}
                        </span>
                        <div className="flex space-x-4 text-xs text-gray-500">
                          <span>ขาย: {formatCurrency(item.sellingPrice)}</span>
                          <span>ต้นทุน: {formatCurrency(item.costPrice)}</span>
                          <span className="font-medium text-gray-900">
                            รวม: {formatCurrency(item.sellingPrice * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Transaction Totals */}
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex space-x-4">
                        <span className="text-gray-600">
                          ยอดขาย: <span className="font-medium text-green-600">
                            {formatCurrency(transaction.total)}
                          </span>
                        </span>
                        <span className="text-gray-600">
                          ต้นทุน: <span className="font-medium text-red-600">
                            {formatCurrency(transaction.totalCost)}
                          </span>
                        </span>
                        <span className="text-gray-600">
                          กำไร: <span className="font-medium text-blue-600">
                            {formatCurrency(transaction.profit)}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {transaction.synced ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ซิงค์แล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            รอซิงค์
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}