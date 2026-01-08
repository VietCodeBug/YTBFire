"use client";

import { useState } from "react";
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
    History,
    Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
    const [searchQuery, setSearchQuery] = useState("");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
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
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Video className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xl font-bold gradient-text hidden sm:block">
                            IanTube
                        </span>
                    </Link>
                </div>

                {/* Center: Search Bar */}
                <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-4 hidden md:block">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Tìm kiếm video..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={cn(
                                "w-full px-4 py-2.5 pl-12 rounded-full",
                                "glass-input text-sm placeholder:text-muted-foreground",
                                "transition-all duration-300"
                            )}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <button
                            type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-primary/20 hover:bg-primary/30 text-sm transition-colors"
                        >
                            Tìm
                        </button>
                    </div>
                </form>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Mobile Search */}
                    <button className="p-2 rounded-lg hover:bg-white/5 transition-colors md:hidden">
                        <Search className="w-5 h-5" />
                    </button>

                    {/* Audio Mode Toggle (will be enhanced later) */}
                    <button className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group">
                        <Music className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-muted-foreground group-hover:text-white">
                            Audio
                        </span>
                    </button>

                    {/* User Menu */}
                    <div className="relative">
                        <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Search Bar */}
            <div className="block md:hidden px-4 pb-3">
                <form onSubmit={handleSearch}>
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
