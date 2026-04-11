import { Link, useLocation } from "wouter";
import { Map, ShieldAlert, Camera, Shield, BarChart3 } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-16 relative no-scrollbar">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-border z-50">
        <div className="flex items-center justify-around pb-safe">
          <NavItem href="/" icon={<Map size={22} />} label="Map" isActive={location === "/"} />
          <NavItem href="/traffic" icon={<ShieldAlert size={22} />} label="Traffic" isActive={location === "/traffic"} />

          {/* Centre Report FAB */}
          <Link href="/report">
            <div className="flex flex-col items-center -mt-5">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                location === "/report"
                  ? "bg-red-600 scale-105"
                  : "bg-[#01411C]"
              }`}>
                <Camera size={26} className="text-white" />
              </div>
              <span className={`text-[10px] mt-1 font-bold ${location === "/report" ? "text-red-600" : "text-[#01411C]"}`}>
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
    <Link href={href} className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors min-w-[3.5rem] ${
      isActive ? "text-[#01411C]" : "text-muted-foreground hover:bg-muted"
    }`}>
      {icon}
      <span className="text-[10px] mt-0.5 font-medium">{label}</span>
    </Link>
  );
}
