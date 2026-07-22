import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const PRIMARY_TABS = ["/", "/documents", "/alerts", "/settings"];

export function isPrimaryTab(path) {
  return PRIMARY_TABS.includes(path);
}

function tabForPath(pathname) {
  if (pathname === "/") return "/";
  return PRIMARY_TABS.find((t) => t !== "/" && pathname.startsWith(t)) || null;
}

const TabHistoryContext = createContext(null);

export function TabHistoryProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabPaths, setTabPaths] = useState(() => ({
    "/": "/",
    "/documents": "/documents",
    "/alerts": "/alerts",
    "/settings": "/settings",
  }));

  useEffect(() => {
    const tab = tabForPath(location.pathname);
    if (tab) {
      setTabPaths((prev) => {
        if (prev[tab] === location.pathname + location.search) return prev;
        return { ...prev, [tab]: location.pathname + location.search };
      });
    }
  }, [location.pathname, location.search]);

  const navigateToTab = useCallback(
    (tabPath) => {
      const currentTab = tabForPath(location.pathname);
      if (currentTab === tabPath) {
        // Already on this tab — pop to its root (iOS-style tap-active-tab behaviour)
        navigate(tabPath);
      } else {
        navigate(tabPaths[tabPath] || tabPath);
      }
    },
    [location.pathname, navigate, tabPaths]
  );

  return (
    <TabHistoryContext.Provider value={{ tabPaths, navigateToTab }}>
      {children}
    </TabHistoryContext.Provider>
  );
}

export function useTabHistory() {
  return useContext(TabHistoryContext);
}