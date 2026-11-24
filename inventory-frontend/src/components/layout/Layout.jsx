import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import CommandPalette from '../common/CommandPalette';
import ShortcutsModal from '../common/ShortcutsModal';

export const Layout = ({ children }) => {
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
    const navigate = useNavigate();

    // Global keyboard shortcut listeners
    useEffect(() => {
        let lastKey = '';
        let lastKeyTime = 0;

        const handleKeyDown = (e) => {
            // Check if user is typing inside an input, textarea, or contentEditable element
            const tag = e.target.tagName?.toLowerCase();
            const isTyping = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;

            // 1. Ctrl+K or Cmd+K: Open Command Palette
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setCommandPaletteOpen((prev) => !prev);
                return;
            }

            // 2. Escape: Close modals
            if (e.key === 'Escape') {
                if (commandPaletteOpen) {
                    e.preventDefault();
                    setCommandPaletteOpen(false);
                } else if (shortcutsModalOpen) {
                    e.preventDefault();
                    setShortcutsModalOpen(false);
                }
                return;
            }

            // If user is currently typing in an input, do not trigger sequence navigation shortcuts
            if (isTyping) return;

            // 3. Question mark '?': Open Shortcuts Guide
            if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                setShortcutsModalOpen(true);
                return;
            }

            // 4. G-sequences (e.g. 'g' then 'c' for Stock Counts)
            const now = Date.now();
            if (e.key.toLowerCase() === 'g') {
                lastKey = 'g';
                lastKeyTime = now;
                return;
            }

            if (lastKey === 'g' && now - lastKeyTime < 1000) {
                lastKey = '';
                const destKey = e.key.toLowerCase();
                switch (destKey) {
                    case 'c':
                        e.preventDefault();
                        navigate('/stock-counts');
                        break;
                    case 'r':
                        e.preventDefault();
                        navigate('/replenishment');
                        break;
                    case 'a':
                        e.preventDefault();
                        navigate('/audit-logs');
                        break;
                    case 'w':
                        e.preventDefault();
                        navigate('/warehouses');
                        break;
                    case 'p':
                        e.preventDefault();
                        navigate('/products');
                        break;
                    case 'm':
                        e.preventDefault();
                        navigate('/stock-movements');
                        break;
                    case 'o':
                        e.preventDefault();
                        navigate('/purchase-orders');
                        break;
                    case 's':
                        e.preventDefault();
                        navigate('/sales-orders');
                        break;
                    case 'd':
                        e.preventDefault();
                        navigate('/');
                        break;
                    default:
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [commandPaletteOpen, shortcutsModalOpen, navigate]);

    return (
        <div className="min-h-screen bg-slate-50/70 dark:bg-[#0B1120] text-slate-800 dark:text-[#F1F5F9] flex selection:bg-blue-600 selection:text-white transition-colors duration-200 relative overflow-x-hidden">
            {/* Sidebar */}
            <Sidebar
                onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                onOpenShortcuts={() => setShortcutsModalOpen(true)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col pl-68 transition-all duration-300">
                <Navbar
                    onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                    onOpenShortcuts={() => setShortcutsModalOpen(true)}
                />
                <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
                    {children}
                </main>
            </div>

            {/* Global Command Palette */}
            <CommandPalette
                isOpen={commandPaletteOpen}
                onClose={() => setCommandPaletteOpen(false)}
                onOpenShortcuts={() => {
                    setCommandPaletteOpen(false);
                    setShortcutsModalOpen(true);
                }}
            />

            {/* Keyboard Shortcuts Cheatsheet Modal */}
            <ShortcutsModal
                isOpen={shortcutsModalOpen}
                onClose={() => setShortcutsModalOpen(false)}
            />
        </div>
    );
};

export default Layout;
