
"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

type NotificationType = 'new_order' | 'new_booking' | 'chef_update' | 'generic';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: Date;
}

interface NotificationContextType {
  notifications: Notification[];
  lastNotification: Notification | null;
  addNotification: (type: NotificationType, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastNotification, setLastNotification] = useState<Notification | null>(null);

  const addNotification = useCallback((type: NotificationType, message: string) => {
    const newNotification: Notification = {
      id: `${type}-${Date.now()}`,
      type,
      message,
      timestamp: new Date(),
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 20)); // Keep last 20 notifications
    setLastNotification(newNotification); // Set this to trigger sound player
  }, []);

  const contextValue = useMemo(() => ({
    notifications,
    lastNotification,
    addNotification,
  }), [notifications, lastNotification, addNotification]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
