import { Link, useLocation } from "wouter";
import { Map, ShieldAlert, Camera, Shield, BarChart3 } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-background flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden">
      <main className="flex flex-col flex-1 min-h-0 overflow-y-auto overscroll-y-contain pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] relative no-scrollbar">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-border z-50 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-end justify-around pt-1 px-1 min-h-[4.25rem]">
          <NavItem href="/" icon={<Map size={22} />} label="Map" isActive={location === "/"} />
          <NavItem href="/traffic" icon={<ShieldAlert size={22} />} label="Traffic" isActive={location === "/traffic"} />

          {/* Centre Report FAB */}
          <Link href="/report">
            <div className="flex flex-col items-center -mt-3 mb-0.5">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
                location === "/report"
                  ? "bg-red-600 scale-105"
                  : "bg-[#01411C]"
              }`}>
                <Camera size={22} className="text-white" />
              </div>
              <span className={`text-[10px] mt-1 font-bold leading-none ${location === "/report" ? "text-red-600" : "text-[#01411C]"}`}>
                Report
              </span>
            </div>
          </Link>

          <NavItem href="/police" icon={<Shield size={22} />} label="Police" isActive={location.startsWith("/police")} />
          <NavItem href="/dashboard" icon={<BarChart3 size={22} />} label="Dash" isActive={location === "/dashboard"} />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label, isActive }: { href: string; icon: React.ReactNode; label: string; isActive: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors min-w-0 flex-1 max-w-[4.5rem] ${
      isActive ? "text-[#01411C]" : "text-muted-foreground hover:bg-muted"
    }`}>
      {icon}
      <span className="text-[10px] mt-0.5 font-medium text-center leading-tight">{label}</span>
    </Link>
  );
}
