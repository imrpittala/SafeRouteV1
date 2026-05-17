import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';



interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {


  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans antialiased text-foreground selection:bg-primary/30">
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-900/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
      </div>

      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Header />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 custom-scrollbar relative">
          <div className="max-w-[1600px] mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
