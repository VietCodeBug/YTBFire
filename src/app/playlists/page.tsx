"use client";
import { useState, useEffect } from "react";
import { ListVideo, LogIn, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function PlaylistsPage() {
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] glass-card rounded-xl p-12">
                <ListVideo className="w-16 h-16 mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-2">Playlist của bạn</h2>
                <p className="text-muted-foreground text-center mb-6">
                    Đăng nhập để tạo và quản lý playlist
                </p>
                <Link
                    href="/login"
                    className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors font-medium"
                >
                    <LogIn className="w-4 h-4" />
                    Đăng nhập
                </Link>
            </div>
        );
    }

    // User is logged in - show empty state
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500">
                        <ListVideo className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Playlist của bạn</h1>
                        <p className="text-sm text-muted-foreground">Tạo và quản lý playlist cá nhân</p>
                    </div>
                </div>

                <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Tạo mới</span>
                </button>
            </div>

            <div className="flex flex-col items-center justify-center py-20 glass-card rounded-xl">
                <Clock className="w-12 h-12 mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Chưa có playlist nào</h3>
                <p className="text-muted-foreground text-center text-sm">
                    Tạo playlist để lưu và sắp xếp video yêu thích
                </p>
            </div>
        </div>
    );
}
