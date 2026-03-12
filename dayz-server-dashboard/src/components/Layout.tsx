import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ToastContainer from './ui/Toast';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-military-darker">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        <TopBar />
        <main className="p-6">{children}</main>
      </div>
      <ToastContainer />
    </div>
  );
}
