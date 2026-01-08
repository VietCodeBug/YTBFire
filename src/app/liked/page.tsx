"use client";
import { useState, useEffect } from "react";
import { ThumbsUp, LogIn, Clock } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function LikedPage() {
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
                <ThumbsUp className="w-16 h-16 mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-2">Video đã thích</h2>
                <p className="text-muted-foreground text-center mb-6">
                    Đăng nhập để xem các video bạn đã thích
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

    // User is logged in - show empty state (feature coming soon)
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500">
                    <ThumbsUp className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Video đã thích</h1>
                    <p className="text-sm text-muted-foreground">Danh sách video bạn đã thích</p>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center py-20 glass-card rounded-xl">
                <Clock className="w-12 h-12 mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Chưa có video nào</h3>
                <p className="text-muted-foreground text-center text-sm">
                    Khi bạn thích video, chúng sẽ xuất hiện ở đây
                </p>
                <Link
                    href="/"
                    className="mt-4 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg transition-colors text-sm"
                >
                    Khám phá video
                </Link>
            </div>
        </div>
    );
}
