import { createContext, useContext } from 'react';

export interface SidebarContextValue {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    return {
      drawerOpen: false,
      openDrawer: () => undefined,
      closeDrawer: () => undefined,
    };
  }
  return ctx;
}
