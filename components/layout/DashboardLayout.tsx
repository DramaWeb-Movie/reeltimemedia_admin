import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ContentWidth } from "./ContentWidth";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-slate-100/80 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          <ContentWidth>{children}</ContentWidth>
        </main>
      </div>
    </div>
  );
}
