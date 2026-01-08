"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Home,
    TrendingUp,
    Clock,
    ThumbsUp,
    ListVideo,
    Music2,
    Settings,
    History,
    Flame
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
    { icon: Home, label: "Trang chủ", href: "/" },
    { icon: Flame, label: "Trending", href: "/trending" },
    { icon: Music2, label: "Âm nhạc", href: "/music" },
];

const libraryItems = [
    { icon: History, label: "Lịch sử", href: "/history" },
    { icon: ThumbsUp, label: "Đã thích", href: "/liked" },
    { icon: ListVideo, label: "Playlist", href: "/playlists" },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-16 bottom-0 w-64 glass border-r border-white/5 hidden md:block overflow-y-auto">
            <div className="p-4 space-y-6">
                {/* Main Menu */}
                <nav className="space-y-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                                    isActive
                                        ? "bg-primary/20 text-white border border-primary/30"
                                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
                                <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Divider */}
                <div className="h-px bg-white/10" />

                {/* Library */}
                <div>
                    <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Thư viện của bạn
                    </h3>
                    <nav className="space-y-1">
                        {libraryItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                                        isActive
                                            ? "bg-primary/20 text-white border border-primary/30"
                                            : "text-muted-foreground hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
                                    <span className="text-sm font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Divider */}
                <div className="h-px bg-white/10" />

                {/* Footer */}
                <div className="px-4 text-xs text-muted-foreground">
                    <p className="mb-2">IanTube © 2026</p>
                    <p className="opacity-60">Private Streaming Gateway</p>
                </div>
            </div>
        </aside>
    );
}
