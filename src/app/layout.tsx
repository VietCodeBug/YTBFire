import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
    title: "IanTube - Private Streaming Gateway",
    description: "YouTube Clone với Glass Morphism UI, chặn quảng cáo và chế độ nghe nhạc",
    keywords: ["youtube", "streaming", "music", "video"],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="vi" className="dark">
            <body className={inter.className}>
                <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-orange-950/10 to-neutral-950">
                    {/* Background Gradient Orbs */}
                    <div className="fixed inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl" />
                        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl" />
                    </div>

                    {/* Main Layout */}
                    <div className="relative z-10 flex flex-col min-h-screen">
                        <Header />
                        <div className="flex flex-1 pt-16">
                            <Sidebar />
                            <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6">
                                {children}
                            </main>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
