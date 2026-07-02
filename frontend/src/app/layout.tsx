import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'Mekong Eco-Shield AI - Giám sát nông nghiệp Đồng bằng sông Cửu Long',
  description:
    'Hệ thống giám sát sinh thái nông nghiệp sử dụng AI cho Đồng bằng sông Cửu Long. Theo dõi cảm biến, dự báo lũ/xâm nhập mặn, chấm điểm tín dụng xanh.',
  keywords: ['Mekong', 'eco', 'shield', 'nông nghiệp', 'cảm biến', 'Đồng bằng sông Cửu Long'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-background">
            <Navbar />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
