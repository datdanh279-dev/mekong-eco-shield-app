import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <Sidebar />
      <main className="flex-1 overflow-x-auto p-4 lg:p-6 bg-background">
        {children}
      </main>
    </div>
  );
}
