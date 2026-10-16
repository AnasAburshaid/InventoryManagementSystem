import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Server, CheckCircle2, User } from 'lucide-react';

export const Navbar = () => {
    const { user } = useAuth();

    return (
        <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/90 px-8 backdrop-blur">
            <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <Server className="h-3.5 w-3.5" />
                    <span>API Connected (Port 5068)</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{user?.fullName || user?.email}</span>
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                        {user?.roles?.[0] || 'Member'}
                    </span>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
