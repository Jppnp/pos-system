import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionHistory from './TransactionHistory';
import { transactionService } from '../services/TransactionService';
import { productService } from '../services/ProductService';
import type { Transaction, Product } from '../lib/database';

// Mock the services
vi.mock('../services/TransactionService');
vi.mock('../services/ProductService');

const mockTransactionService = vi.mocked(transactionService);
const mockProductService = vi.mocked(productService);

describe('TransactionHistory', () => {
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      items: [
        {
          productId: 'p1',
          name: 'Mama หมู',
          sellingPrice: 30,
          costPrice: 25,
          quantity: 2
        }
      ],
      total: 60,
      totalCost: 50,
      profit: 10,
      timestamp: new Date('2024-01-15T10:30:00'),
      synced: true
    },
    {
      id: '2',
      items: [
        {
          productId: 'p2',
          name: 'น้ำดื่ม',
          sellingPrice: 15,
          costPrice: 10,
          quantity: 1
        }
      ],
      total: 15,
      totalCost: 10,
      profit: 5,
      timestamp: new Date('2024-01-14T14:20:00'),
      synced: false
    }
  ];

  const mockProducts: Product[] = [
    {
      id: 'p1',
      name: 'Mama หมู',
      description: 'บะหมี่กึ่งสำเร็จรูป รสหมู',
      costPrice: 25,
      sellingPrice: 30,
      quantity: 50,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'p2',
      name: 'น้ำดื่ม',
      description: 'น้ำดื่มบรรจุขวด 600ml',
      costPrice: 10,
      sellingPrice: 15,
      quantity: 100,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransactionService.getTransactions.mockResolvedValue(mockTransactions);
    mockTransactionService.calculateSalesTotals.mockImplementation((transactions) => ({
      totalSales: transactions.reduce((sum, t) => sum + t.total, 0),
      totalCost: transactions.reduce((sum, t) => sum + t.totalCost, 0),
      totalProfit: transactions.reduce((sum, t) => sum + t.profit, 0),
      transactionCount: transactions.length
    }));
    mockProductService.getAllProducts.mockResolvedValue(mockProducts);
  });

  it('should render transaction history with correct data', async () => {
    render(<TransactionHistory />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('ประวัติการขาย')).toBeInTheDocument();
    });

    // Wait for transactions to be displayed
    await waitFor(() => {
      expect(screen.getByText(/รายการที่ #1/)).toBeInTheDocument();
    });

    expect(screen.getByText(/รายการที่ #2/)).toBeInTheDocument();

    // Check if product names are displayed
    expect(screen.getByText('Mama หมู x2')).toBeInTheDocument();
    expect(screen.getByText('น้ำดื่ม x1')).toBeInTheDocument();

    // Check totals
    expect(screen.getByText('รายการทั้งหมด:')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // transaction count
  });

  it('should show and hide filters when toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('ประวัติการขาย')).toBeInTheDocument();
    });

    // Initially filters should be hidden
    expect(screen.queryByText('ช่วงวันที่')).not.toBeInTheDocument();

    // Click to show filters
    await user.click(screen.getByText('แสดงตัวกรอง'));
    expect(screen.getByText('ช่วงวันที่')).toBeInTheDocument();
    expect(screen.getByText('กรองตามสินค้า')).toBeInTheDocument();

    // Click to hide filters
    await user.click(screen.getByText('ซ่อนตัวกรอง'));
    expect(screen.queryByText('ช่วงวันที่')).not.toBeInTheDocument();
  });

  it('should display sync status correctly', async () => {
    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('ประวัติการขาย')).toBeInTheDocument();
    });

    // Wait for transactions to load
    await waitFor(() => {
      expect(screen.getByText('ซิงค์แล้ว')).toBeInTheDocument();
    });

    expect(screen.getByText('รอซิงค์')).toBeInTheDocument();
  });

  it('should format currency correctly', async () => {
    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('ประวัติการขาย')).toBeInTheDocument();
    });

    // Wait for data to load and check that Thai currency formatting is used
    await waitFor(() => {
      expect(screen.getByText('฿75.00')).toBeInTheDocument(); // total sales in summary
    });
    
    // Check that currency symbols are present (Thai Baht)
    const currencyElements = screen.getAllByText(/฿\d+\.\d{2}/);
    expect(currencyElements.length).toBeGreaterThan(0);
  });

  it('should show empty state when no transactions', async () => {
    mockTransactionService.getTransactions.mockResolvedValue([]);
    
    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('ไม่พบประวัติการขาย')).toBeInTheDocument();
    });
  });

  it('should handle loading state', () => {
    // Mock a delayed response
    mockTransactionService.getTransactions.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockTransactions), 100))
    );

    render(<TransactionHistory />);

    // Should show loading state - check for animate-pulse class
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    mockTransactionService.getTransactions.mockRejectedValue(new Error('Database error'));
    
    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('ไม่สามารถโหลดประวัติการขายได้')).toBeInTheDocument();
    });

    expect(screen.getByText('ลองใหม่')).toBeInTheDocument();
  });
});