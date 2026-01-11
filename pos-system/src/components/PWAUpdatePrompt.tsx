import React, { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PWAUpdatePrompt: React.FC = () => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowUpdatePrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
    setShowUpdatePrompt(false);
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    setNeedRefresh(false);
  };

  // Show offline ready notification
  if (offlineReady && !needRefresh) {
    return (
      <div className="fixed top-4 right-4 bg-green-600 text-white p-3 rounded-lg shadow-lg z-50 max-w-sm">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium">พร้อมใช้งานออฟไลน์</p>
            <p className="text-xs text-green-100">แอปพร้อมใช้งานแบบออฟไลน์แล้ว</p>
          </div>
          <button
            onClick={() => setOfflineReady(false)}
            className="text-green-200 hover:text-white ml-2"
            aria-label="ปิด"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // Show update available notification
  if (showUpdatePrompt && needRefresh) {
    return (
      <div className="fixed top-4 right-4 bg-blue-600 text-white p-3 rounded-lg shadow-lg z-50 max-w-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">อัปเดตใหม่พร้อมใช้งาน</p>
            <p className="text-xs text-blue-100 mb-3">
              มีเวอร์ชันใหม่ของแอป คลิกเพื่ออัปเดต
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                className="bg-white text-blue-600 text-xs px-3 py-1 rounded font-medium hover:bg-blue-50 transition-colors"
              >
                อัปเดต
              </button>
              <button
                onClick={handleDismiss}
                className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors"
              >
                ภายหลัง
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-blue-200 hover:text-white ml-2"
            aria-label="ปิด"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return null;
};