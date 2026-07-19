import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Package, PlusCircle, Search, Download, LogOut, Store, ChevronRight } from "lucide-react";

const NAV_ITEMS = [
  { href: "/operator/dashboard", icon: Package, label: "My Orders", short: "Orders" },
  { href: "/operator/order", icon: PlusCircle, label: "Order PVC Card", short: "Order" },
  { href: "/operator/track", icon: Search, label: "Track Order", short: "Track" },
  { href: "/operator/download", icon: Download, label: "Download e-Card", short: "Download" },
];

interface Props {
  children: ReactNode;
  operatorName?: string;
  shopName?: string;
  district?: string;
  onLogout?: () => void;
}

export function OperatorLayout({ children, operatorName, shopName, district, onLogout }: Props) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .nav-item { animation: slideInLeft 0.25s ease both; }
      `}</style>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed inset-y-0 z-40 shadow-xl">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">Operator Portal</span>
          </div>
          {shopName && (
            <div className="bg-white/10 rounded-lg px-3 py-2 mt-1">
              <p className="text-xs font-semibold text-white truncate">{shopName}</p>
              {district && <p className="text-xs text-slate-400 truncate">{district}, West Bengal</p>}
              {operatorName && <p className="text-xs text-slate-500 mt-0.5">{operatorName}</p>}
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }, i) => {
            const active = location === href || location.startsWith(href + "/");
            return (
              <Link key={href} href={href}>
                <div
                  className={`nav-item flex items-center gap-3 px-3 py-3 rounded-xl transition-all cursor-pointer group ${
                    active
                      ? "bg-primary shadow-lg shadow-primary/30 text-white"
                      : "text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0 w-5 h-5" />
                  <span className="text-sm font-medium flex-1">{label}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {onLogout && (
          <div className="p-3 border-t border-white/10">
            <button
              onClick={onLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors w-full"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        )}
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile top header */}
        <header className="md:hidden bg-slate-900 text-white px-4 h-14 flex items-center justify-between sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Store className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{shopName || "Operator Portal"}</p>
              {district && <p className="text-xs text-slate-400 leading-tight">{district}</p>}
            </div>
          </div>
          {onLogout && (
            <button onClick={onLogout} className="text-slate-400 hover:text-white p-1">
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-50 shadow-lg">
          {NAV_ITEMS.map(({ href, icon: Icon, short }) => {
            const active = location === href || location.startsWith(href + "/");
            return (
              <Link key={href} href={href} className="flex-1">
                <div className={`flex flex-col items-center gap-1 py-2 px-1 transition-colors ${active ? "text-primary" : "text-slate-400"}`}>
                  <div className={`p-1 rounded-lg transition-all ${active ? "bg-primary/10" : ""}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-semibold leading-none">{short}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
