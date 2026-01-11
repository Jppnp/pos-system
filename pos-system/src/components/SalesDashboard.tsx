import { useState, useEffect, useMemo } from 'react';
import { transactionService } from '../services/TransactionService';
import { productService } from '../services/ProductService';
import type { Transaction, Product } from '../lib/database';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface SalesData {
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  transactionCount: number;
}

type ViewPeriod = 'today' | 'week' | 'month' | 'custom';

interface FilterState {
  period: ViewPeriod;
  customDateRange?: DateRange;
  selectedProducts: string[];
}

const STORAGE_KEY = 'pos-dashboard-filters';

export default function SalesDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(() => {
    // Load saved filters from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          period: parsed.period || 'today',
          customDateRange: parsed.customDateRange ? {
            startDate: new Date(parsed.customDateRange.startDate),
            endDate: new Date(parsed.customDateRange.endDate)
          } : undefined,
          selectedProducts: parsed.selectedProducts || []
        };
      } catch {
        // Fall back to defaults if parsing fails
      }
    }
    return {
      period: 'today' as ViewPeriod,
      selectedProducts: []
    };
  });

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [transactionData, productData] = await Promise.all([
        transactionService.getTransactions(),
        productService.getAllProducts()
      ]);
      setTransactions(transactionData);
      setProducts(productData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate date range based on selected period
  const dateRange = useMemo((): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filters.period) {
      case 'today':
        return {
          startDate: today,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return { startDate: weekStart, endDate: weekEnd };
      
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        return { startDate: monthStart, endDate: monthEnd };
      
      case 'custom':
        return filters.customDateRange || { startDate: today, endDate: today };
      
      default:
        return { startDate: today, endDate: today };
    }
  }, [filters.period, filters.customDateRange]);

  // Filter transactions based on date range and selected products
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.timestamp);
      return transactionDate >= dateRange.startDate && transactionDate <= dateRange.endDate;
    });

    // Apply product filter if any products are selected
    if (filters.selectedProducts.length > 0) {
      filtered = filtered.filter(transaction =>
        transaction.items.some(item => filters.selectedProducts.includes(item.productId))
      );
    }

    return filtered;
  }, [transactions, dateRange, filters.selectedProducts]);

  // Calculate sales data from filtered transactions
  const salesData = useMemo((): SalesData => {
    return transactionService.calculateSalesTotals(filteredTransactions);
  }, [filteredTransactions]);

  const handlePeriodChange = (period: ViewPeriod) => {
    setFilters(prev => ({ ...prev, period }));
  };

  const handleCustomDateChange = (startDate: string, endDate: string) => {
    const customDateRange = {
      startDate: new Date(startDate),
      endDate: new Date(endDate + 'T23:59:59')
    };
    setFilters(prev => ({
      ...prev,
      period: 'custom',
      customDateRange
    }));
  };

  const handleProductFilterChange = (productId: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      selectedProducts: checked
        ? [...prev.selectedProducts, productId]
        : prev.selectedProducts.filter(id => id !== productId)
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">แดชบอร์ดยอดขาย</h2>
        
        {/* Period Selection */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => handlePeriodChange('today')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filters.period === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            วันนี้
          </button>
          <button
            onClick={() => handlePeriodChange('week')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filters.period === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            สัปดาห์นี้
          </button>
          <button
            onClick={() => handlePeriodChange('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filters.period === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            เดือนนี้
          </button>
        </div>

        {/* Custom Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              วันที่เริ่มต้น
            </label>
            <input
              type="date"
              value={dateRange.startDate.toISOString().split('T')[0]}
              onChange={(e) => handleCustomDateChange(e.target.value, dateRange.endDate.toISOString().split('T')[0])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              วันที่สิ้นสุด
            </label>
            <input
              type="date"
              value={dateRange.endDate.toISOString().split('T')[0]}
              onChange={(e) => handleCustomDateChange(dateRange.startDate.toISOString().split('T')[0], e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Date Range Display */}
        <div className="text-sm text-gray-600 mb-4">
          ช่วงเวลา: {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
        </div>
      </div>

      {/* Product Filter */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">กรองตามสินค้า</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map(product => (
            <label key={product.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.selectedProducts.includes(product.id!)}
                onChange={(e) => handleProductFilterChange(product.id!, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 truncate">{product.name}</span>
            </label>
          ))}
        </div>
        {filters.selectedProducts.length > 0 && (
          <button
            onClick={() => setFilters(prev => ({ ...prev, selectedProducts: [] }))}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800"
          >
            ล้างการกรองทั้งหมด
          </button>
        )}
      </div>

      {/* Sales Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">฿</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    ยอดขายรวม
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(salesData.totalSales)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📈</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    กำไรรวม
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(salesData.totalProfit)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">💰</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    ต้นทุนรวม
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(salesData.totalCost)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📋</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    จำนวนรายการ
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {salesData.transactionCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profit Margin */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">อัตรากำไร</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {salesData.totalSales > 0 
                ? ((salesData.totalProfit / salesData.totalSales) * 100).toFixed(2)
                : '0.00'
              }%
            </div>
            <div className="text-sm text-gray-500">
              อัตรากำไรเฉลี่ย
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-medium text-gray-900">
              {formatCurrency(salesData.totalProfit)}
            </div>
            <div className="text-sm text-gray-500">
              กำไรสุทธิ
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Summary */}
      {filteredTransactions.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            รายการขายล่าสุด ({filteredTransactions.length} รายการ)
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {filteredTransactions.slice(0, 10).map((transaction, index) => (
              <div key={transaction.id || index} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(transaction.timestamp).toLocaleString('th-TH')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {transaction.items.length} รายการ
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(transaction.total)}
                  </div>
                  <div className="text-xs text-green-600">
                    กำไร {formatCurrency(transaction.profit)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Data Message */}
      {filteredTransactions.length === 0 && (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <div className="text-gray-500">
            ไม่พบข้อมูลการขายในช่วงเวลาที่เลือก
          </div>
        </div>
      )}
    </div>
  );
}