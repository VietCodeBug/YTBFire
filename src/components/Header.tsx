"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Search,
    Menu,
    User,
    Music,
    Video,
    LogIn,
    LogOut,
    Clock,
    TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

// Popular search suggestions
const TRENDING_SEARCHES = [
    "nhạc remix 2026",
    "lofi chill",
    "nhạc tiktok",
    "nhạc không lời",
    "edm",
    "v-pop",
    "k-pop",
    "nhạc trữ tình",
];

export function Header() {
    const [searchQuery, setSearchQuery] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const router = useRouter();
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Load recent searches from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('recentSearches');
        if (saved) {
            setRecentSearches(JSON.parse(saved).slice(0, 5));
        }
    }, []);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Generate suggestions based on query
    useEffect(() => {
        if (searchQuery.trim().length > 0) {
            const query = searchQuery.toLowerCase();
            const filtered = TRENDING_SEARCHES.filter(s =>
                s.toLowerCase().includes(query)
            );
            // Add query-based suggestions
            const querySuggestions = [
                `${searchQuery} remix`,
                `${searchQuery} lofi`,
                `${searchQuery} cover`,
            ];
            setSuggestions([...filtered, ...querySuggestions].slice(0, 6));
        } else {
            setSuggestions([]);
        }
    }, [searchQuery]);

    const handleSearch = (query: string) => {
        const trimmed = query.trim();
        if (trimmed) {
            // Save to recent searches
            const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 5);
            setRecentSearches(updated);
            localStorage.setItem('recentSearches', JSON.stringify(updated));

            setShowSuggestions(false);
            setSearchQuery("");
            router.push(`/search?q=${encodeURIComponent(trimmed)}`);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSearch(searchQuery);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setShowUserMenu(false);
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-white/5">
            <div className="flex items-center justify-between h-full px-4 md:px-6">
                {/* Left: Menu & Logo */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors md:hidden"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <Video className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xl font-bold gradient-text hidden sm:block">
                            IanTube
                        </span>
                    </Link>
                </div>

                {/* Center: Search Bar with Suggestions */}
                <div ref={searchRef} className="flex-1 max-w-2xl mx-4 hidden md:block relative">
                    <form onSubmit={handleSubmit}>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Tìm kiếm video..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setShowSuggestions(true)}
                                className={cn(
                                    "w-full px-4 py-2.5 pl-12 rounded-full",
                                    "glass-input text-sm placeholder:text-muted-foreground",
                                    "transition-all duration-300",
                                    showSuggestions && "rounded-b-none rounded-t-2xl"
                                )}
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <button
                                type="submit"
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-orange-500/20 hover:bg-orange-500/30 text-sm transition-colors"
                            >
                                Tìm
                            </button>
                        </div>
                    </form>

                    {/* Suggestions Dropdown */}
                    {showSuggestions && (
                        <div className="absolute top-full left-0 right-0 glass-card rounded-b-2xl border-t-0 overflow-hidden shadow-xl">
                            {/* Recent Searches */}
                            {recentSearches.length > 0 && searchQuery.length === 0 && (
                                <div className="p-2">
                                    <p className="text-xs text-muted-foreground px-3 py-1 flex items-center gap-2">
                                        <Clock className="w-3 h-3" /> Tìm kiếm gần đây
                                    </p>
                                    {recentSearches.map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSearch(item)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded-lg flex items-center gap-3"
                                        >
                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Search Suggestions */}
                            {suggestions.length > 0 && (
                                <div className="p-2 border-t border-white/5">
                                    {suggestions.map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSearch(item)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded-lg flex items-center gap-3"
                                        >
                                            <Search className="w-4 h-4 text-muted-foreground" />
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Trending when empty */}
                            {searchQuery.length === 0 && recentSearches.length === 0 && (
                                <div className="p-2">
                                    <p className="text-xs text-muted-foreground px-3 py-1 flex items-center gap-2">
                                        <TrendingUp className="w-3 h-3" /> Xu hướng
                                    </p>
                                    {TRENDING_SEARCHES.slice(0, 5).map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSearch(item)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded-lg flex items-center gap-3"
                                        >
                                            <TrendingUp className="w-4 h-4 text-orange-400" />
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Mobile Search */}
                    <button className="p-2 rounded-lg hover:bg-white/5 transition-colors md:hidden">
                        <Search className="w-5 h-5" />
                    </button>

                    {/* Audio Mode Link */}
                    <Link
                        href="/music"
                        className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
                    >
                        <Music className="w-4 h-4 text-orange-400" />
                        <span className="text-sm text-muted-foreground group-hover:text-white">
                            Nhạc
                        </span>
                    </Link>

                    {/* User Menu */}
                    <div className="relative">
                        {user ? (
                            <>
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
                                >
                                    {user.photoURL ? (
                                        <img
                                            src={user.photoURL}
                                            alt={user.displayName}
                                            className="w-8 h-8 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                                            <span className="text-sm font-bold text-white">
                                                {user.email?.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </button>

                                {/* Dropdown Menu */}
                                {showUserMenu && (
                                    <div className="absolute right-0 top-12 w-56 glass-card rounded-xl overflow-hidden shadow-xl">
                                        <div className="p-4 border-b border-white/10">
                                            <p className="font-medium truncate">{user.displayName || user.email}</p>
                                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                        </div>
                                        <div className="p-2">
                                            <Link
                                                href="/history"
                                                onClick={() => setShowUserMenu(false)}
                                                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                                            >
                                                <User className="w-4 h-4" />
                                                <span className="text-sm">Lịch sử</span>
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-red-400"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span className="text-sm">Đăng xuất</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                            >
                                <LogIn className="w-4 h-4" />
                                <span className="text-sm font-medium hidden sm:inline">Đăng nhập</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Search Bar (visible on small screens) */}
            <div className="md:hidden px-4 pb-3">
                <form onSubmit={handleSubmit}>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 pl-10 rounded-full glass-input text-sm"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                </form>
            </div>
        </header>
    );
}
