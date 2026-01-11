import { useState, useEffect } from 'react'
import { syncService, type SyncStatus as SyncStatusType } from '../services/SyncService'

interface SyncStatusProps {
  className?: string
}

export function SyncStatus({ className = '' }: SyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>({
    isOnline: navigator.onLine,
    lastSyncTime: null,
    pendingTransactions: 0,
    pendingProducts: 0,
    syncInProgress: false
  })
  const [isManualSyncing, setIsManualSyncing] = useState(false)

  useEffect(() => {
    // Update sync status
    const updateStatus = async () => {
      const status = await syncService.getSyncStatus()
      setSyncStatus(status)
    }

    // Initial status
    updateStatus()

    // Listen for online status changes
    const unsubscribe = syncService.onOnlineStatusChange((isOnline) => {
      setSyncStatus(prev => ({ ...prev, isOnline }))
    })

    // Update status every 30 seconds
    const interval = setInterval(updateStatus, 30000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const handleManualSync = async () => {
    if (isManualSyncing || syncStatus.syncInProgress) return

    setIsManualSyncing(true)
    try {
      const result = await syncService.forcSync()
      if (result.success) {
        console.log('Manual sync completed:', result)
      } else {
        console.error('Manual sync failed:', result.error)
      }
    } catch (error) {
      console.error('Manual sync error:', error)
    } finally {
      setIsManualSyncing(false)
      // Refresh status after sync
      const status = await syncService.getSyncStatus()
      setSyncStatus(status)
    }
  }

  const formatLastSyncTime = (time: Date | null): string => {
    if (!time) return 'ไม่เคยซิงค์'
    
    const now = new Date()
    const diffMs = now.getTime() - time.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    if (diffMinutes < 1) return 'เมื่อสักครู่'
    if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} วันที่แล้ว`
  }

  const getStatusColor = (): string => {
    if (!syncStatus.isOnline) return 'text-red-600'
    if (syncStatus.pendingTransactions > 0) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getStatusIcon = (): string => {
    if (syncStatus.syncInProgress || isManualSyncing) return '🔄'
    if (!syncStatus.isOnline) return '📴'
    if (syncStatus.pendingTransactions > 0) return '⏳'
    return '✅'
  }

  const getStatusText = (): string => {
    if (syncStatus.syncInProgress || isManualSyncing) return 'กำลังซิงค์...'
    if (!syncStatus.isOnline) return 'ออฟไลน์'
    if (syncStatus.pendingTransactions > 0) return `รอซิงค์ ${syncStatus.pendingTransactions} รายการ`
    return 'ซิงค์แล้ว'
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        <span className="text-lg">{getStatusIcon()}</span>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>
      
      {syncStatus.lastSyncTime && (
        <span className="text-xs text-gray-500">
          ({formatLastSyncTime(syncStatus.lastSyncTime)})
        </span>
      )}
      
      {syncStatus.isOnline && !syncStatus.syncInProgress && !isManualSyncing && (
        <button
          onClick={handleManualSync}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
          title="ซิงค์ทันที"
        >
          ซิงค์
        </button>
      )}
    </div>
  )
}