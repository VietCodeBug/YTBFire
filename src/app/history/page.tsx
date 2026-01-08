"use client";

import { useState, useEffect } from "react";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import { auth, db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { History, Trash2, LogIn, Loader2, Clock } from "lucide-react";
import Link from "next/link";

interface HistoryItem {
    videoId: string;
    title: string;
    thumbnail: string;
    channelName: string;
    lastViewedAt: any;
    type: 'video' | 'audio';
}

export default function HistoryPage() {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                try {
                    setIsLoading(true);
                    const historyRef = collection(db, "users", currentUser.uid, "history");
                    const q = query(historyRef, orderBy("lastViewedAt", "desc"));
                    const snapshot = await getDocs(q);

                    const items: HistoryItem[] = [];
                    snapshot.forEach((doc) => {
                        items.push({
                            videoId: doc.id,
                            ...doc.data()
                        } as HistoryItem);
                    });

                    setHistory(items);
                } catch (error) {
                    console.error("Error fetching history:", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setHistory([]);
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const clearHistory = async () => {
        if (!user || !confirm("Bạn có chắc muốn xóa toàn bộ lịch sử xem?")) return;

        try {
            const historyRef = collection(db, "users", user.uid, "history");
            const snapshot = await getDocs(historyRef);

            const deletePromises = snapshot.docs.map((document) =>
                deleteDoc(doc(db, "users", user.uid, "history", document.id))
            );

            await Promise.all(deletePromises);
            setHistory([]);
        } catch (error) {
            console.error("Error clearing history:", error);
        }
    };

    const removeItem = async (videoId: string) => {
        if (!user) return;

        try {
            await deleteDoc(doc(db, "users", user.uid, "history", videoId));
            setHistory(history.filter(item => item.videoId !== videoId));
        } catch (error) {
            console.error("Error removing item:", error);
        }
    };

    // Not logged in
    if (!user && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] glass-card rounded-xl p-12">
                <LogIn className="w-16 h-16 mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-2">Đăng nhập để xem lịch sử</h2>
                <p className="text-muted-foreground text-center mb-6">
                    Lịch sử xem video của bạn sẽ được lưu tự động khi đăng nhập
                </p>
                <Link
                    href="/login"
                    className="px-6 py-3 bg-primary hover:bg-primary/80 rounded-lg transition-colors font-medium"
                >
                    Đăng nhập ngay
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between glass-card rounded-xl p-4 md:p-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                        <History className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold">Lịch sử xem</h1>
                        <p className="text-sm text-muted-foreground">
                            {isLoading ? 'Đang tải...' : `${history.length} video đã xem`}
                        </p>
                    </div>
                </div>

                {history.length > 0 && (
                    <button
                        onClick={clearHistory}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Xóa tất cả</span>
                    </button>
                )}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <VideoCardSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* History Grid */}
            {!isLoading && history.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {history.map((item) => (
                        <div key={item.videoId} className="relative group">
                            <VideoCard
                                videoId={item.videoId}
                                title={item.title}
                                thumbnail={item.thumbnail}
                                channelName={item.channelName}
                            />

                            {/* Remove button */}
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    removeItem(item.videoId);
                                }}
                                className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            {/* Type badge */}
                            <div className="absolute bottom-16 left-2 px-2 py-1 rounded bg-black/70 text-xs">
                                {item.type === 'audio' ? '🎵 Audio' : '📹 Video'}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && history.length === 0 && user && (
                <div className="flex flex-col items-center justify-center min-h-[40vh] glass-card rounded-xl p-12">
                    <Clock className="w-16 h-16 mb-4 text-muted-foreground" />
                    <h2 className="text-xl font-semibold mb-2">Chưa có lịch sử xem</h2>
                    <p className="text-muted-foreground text-center mb-6">
                        Bắt đầu xem video để lưu lịch sử của bạn
                    </p>
                    <Link
                        href="/"
                        className="px-6 py-3 bg-primary hover:bg-primary/80 rounded-lg transition-colors"
                    >
                        Khám phá video
                    </Link>
                </div>
            )}
        </div>
    );
}
