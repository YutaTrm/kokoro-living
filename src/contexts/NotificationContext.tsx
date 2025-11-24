import { createContext, useContext, ReactNode } from 'react';

import { useUnreadNotifications } from '@/src/hooks/useUnreadNotifications';

interface NotificationContextType {
  unreadCount: number;
  refetch: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
  userId: string | null;
}

export function NotificationProvider({ children, userId }: NotificationProviderProps) {
  const { unreadCount, refetch } = useUnreadNotifications(userId);

  return (
    <NotificationContext.Provider value={{ unreadCount, refetch }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    return { unreadCount: 0, refetch: () => {} };
  }
  return context;
}
