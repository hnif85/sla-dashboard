"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Target, Activity, FileText, TrendingUp, Settings, ClipboardList, Megaphone, Briefcase } from "lucide-react";

const navItems = [
  { href: "/dashboard",  label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { href: "/pipeline",   label: "Pipeline",   icon: Target,          roles: ["admin", "sales"] },
  { href: "/crm",        label: "CRM",        icon: Briefcase,       roles: ["admin", "crm"] },
  { href: "/activities", label: "Aktivitas",  icon: Activity,        roles: ["admin", "sales"] },
  { href: "/mom",        label: "MOM",        icon: FileText,        roles: ["admin", "sales"] },
  { href: "/events",     label: "Events",     icon: Megaphone,       roles: ["admin", "trainer"] },
  { href: "/reports",    label: "Laporan",    icon: TrendingUp,      roles: ["admin", "sales", "crm"] },
  { href: "/wip",        label: "WIP",        icon: ClipboardList,   roles: ["admin", "sales"] },
  { href: "/admin/users",label: "Admin",      icon: Settings,        roles: ["admin"] },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const items = navItems.filter((i) => i.roles.includes(user?.role || "sales"));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-700 md:hidden">
      <div className="flex">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors ${
                active ? "text-yellow-400" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span>{item.label}</span>
              {active && <div className="absolute top-0 w-8 h-0.5 bg-yellow-400 rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
