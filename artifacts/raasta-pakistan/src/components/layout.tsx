import { Link, useLocation } from "wouter";
import { Map, Tag, Store, ShieldAlert, BarChart3 } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-16 relative no-scrollbar">
        {children}
      </main>
      
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-border z-50">
        <div className="flex items-center justify-around p-2 pb-safe">
          <NavItem href="/" icon={<Map size={24} />} label="Map" isActive={location === "/"} />
          <NavItem href="/traffic" icon={<ShieldAlert size={24} />} label="Traffic" isActive={location === "/traffic"} />
          <NavItem href="/offers" icon={<Tag size={24} />} label="Offers" isActive={location.startsWith("/offers")} />
          <NavItem href="/merchants" icon={<Store size={24} />} label="Shops" isActive={location.startsWith("/merchants")} />
          <NavItem href="/dashboard" icon={<BarChart3 size={24} />} label="Dash" isActive={location === "/dashboard"} />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label, isActive }: { href: string; icon: React.ReactNode; label: string; isActive: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:bg-muted"}`}>
      {icon}
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </Link>
  );
}
