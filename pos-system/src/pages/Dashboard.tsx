import { useState } from 'react';
import Cart from '../components/Cart';
import TransactionHistory from '../components/TransactionHistory';
import SalesDashboard from '../components/SalesDashboard';

type DashboardView = 'pos' | 'history' | 'sales';

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<DashboardView>('pos');

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setCurrentView('pos')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'pos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              หน้าขาย
            </button>
            <button
              onClick={() => setCurrentView('sales')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'sales'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              แดชบอร์ดยอดขาย
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ประวัติการขาย
            </button>
          </nav>
        </div>
      </div>

      {/* Content based on current view */}
      {currentView === 'pos' && (
        <>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                หน้าหลัก
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>ยินดีต้อนรับสู่ระบบขายหน้าร้าน</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Statistics */}
            <div className="space-y-5">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">฿</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          ยอดขายวันนี้
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          ฿0.00
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
                        <span className="text-white text-sm font-medium">📦</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          สินค้าทั้งหมด
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          0
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
                        <span className="text-white text-sm font-medium">📋</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          รายการขายวันนี้
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          0
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cart Component */}
            <div>
              <Cart />
            </div>
          </div>
        </>
      )}

      {currentView === 'sales' && (
        <SalesDashboard />
      )}

      {currentView === 'history' && (
        <TransactionHistory />
      )}
    </div>
  )
}