import React from 'react';
import { useCart } from '../contexts/CartContext';
import ProductSearch from './ProductSearch';

interface CartProps {
  className?: string;
}

export const Cart: React.FC<CartProps> = ({ className = "" }) => {
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    saveDraft,
    loadDraft,
    drafts,
    loading,
    checkout
  } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(price);
  };

  const handleCheckout = async () => {
    try {
      const result = await checkout();
      if (result.success) {
        console.log('Transaction completed successfully:', result.transaction);
        // In a real app, you'd show a success notification and possibly print receipt
      } else {
        console.error('Transaction failed:', result.error);
        // In a real app, you'd show an error notification
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      // In a real app, you'd show an error notification
    }
  };

  const handleSaveDraft = async () => {
    try {
      await saveDraft();
    } catch (error) {
      console.error('Failed to save draft:', error);
      // In a real app, you'd show a toast notification here
    }
  };

  const handleLoadDraft = async (draftId: string) => {
    try {
      await loadDraft(draftId);
    } catch (error) {
      console.error('Failed to load draft:', error);
      // In a real app, you'd show a toast notification here
    }
  };

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          ตะกร้าสินค้า
        </h3>

        {/* Product Search */}
        <div className="mb-6">
          <ProductSearch
            onProductSelect={addItem}
            placeholder="ค้นหาและเพิ่มสินค้า..."
            className="w-full"
          />
        </div>

        {/* Drafts Section */}
        {drafts.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">แบบร่างที่บันทึกไว้</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex items-center justify-between p-2 bg-blue-50 rounded-md cursor-pointer hover:bg-blue-100"
                  onClick={() => handleLoadDraft(draft.id!)}
                >
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">
                      {new Date(draft.createdAt).toLocaleString('th-TH')}
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {draft.items.length} รายการ - {formatPrice(draft.total)}
                    </p>
                  </div>
                  <button
                    className="text-blue-600 hover:text-blue-800 text-sm"
                    disabled={loading}
                  >
                    โหลด
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cart Items */}
        <div className="space-y-3">
          {items.length > 0 ? (
            <>
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatPrice(item.sellingPrice)} × {item.quantity}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="ml-2 w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="ml-4 text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatPrice(item.sellingPrice * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}

              {/* Cart Total */}
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">
                    รวมทั้งสิ้น:
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <button
                  onClick={clearCart}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
                  disabled={loading}
                >
                  ล้างตะกร้า
                </button>
                <button
                  onClick={handleSaveDraft}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  disabled={items.length === 0 || loading}
                >
                  บันทึกแบบร่าง
                </button>
                <button
                  onClick={handleCheckout}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  disabled={items.length === 0 || loading}
                >
                  ชำระเงิน
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-500">
                ตะกร้าว่าง - ค้นหาและเพิ่มสินค้าเพื่อเริ่มต้น
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;