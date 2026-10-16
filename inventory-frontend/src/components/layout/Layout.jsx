import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export const Layout = ({ children }) => {
    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col pl-64">
                <Navbar />
                <main className="flex-1 p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
