"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Target, Activity, FileText, Settings,
  Users, Sliders, LogOut, ChevronRight, TrendingUp, CalendarDays, ClipboardList, Megaphone,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",  label: "Dashboard",          icon: LayoutDashboard, roles: ["admin", "sales"] },
  { href: "/pipeline",   label: "Pipeline",            icon: Target,          roles: ["admin", "sales"] },
  { href: "/activities", label: "Activity Log",        icon: Activity,        roles: ["admin", "sales"] },
  { href: "/plans",      label: "Rencana",             icon: CalendarDays,    roles: ["admin", "sales"] },
  { href: "/mom",        label: "Minutes of Meeting",  icon: FileText,        roles: ["admin", "sales"] },
  { href: "/events",     label: "Events",              icon: Megaphone,       roles: ["admin", "sales", "trainer"] },
  { href: "/reports",    label: "Laporan",             icon: TrendingUp,      roles: ["admin", "sales"] },
  { href: "/wip",        label: "WIP Report",          icon: ClipboardList,   roles: ["admin", "sales"] },
];

const adminItems = [
  { href: "/admin/users", label: "Kelola User", icon: Users },
  { href: "/admin/config", label: "Konfigurasi", icon: Settings },
  { href: "/admin/funnel-stages", label: "Funnel Stages", icon: Sliders },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-full">
      <div className="p-5 border-b border-gray-700">
        <div className="text-lg font-bold text-yellow-400">MWX Partnership</div>
        <div className="text-xs text-gray-400 mt-0.5">SLA Dashboard</div>
      </div>

      <div className="px-3 py-4 border-b border-gray-700">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 px-2">Menu</div>
        {navItems
          .filter((item) => item.roles.includes(user?.role || "sales"))
          .map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm transition-colors ${
                  active ? "bg-yellow-500 text-gray-900 font-semibold" : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
      </div>

      {user?.role === "admin" && (
        <div className="px-3 py-4 border-b border-gray-700">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 px-2">Admin</div>
          {adminItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm transition-colors ${
                  active ? "bg-yellow-500 text-gray-900 font-semibold" : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-auto p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-gray-900 font-bold text-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium">{user?.name}</div>
            <div className="text-xs text-gray-400 capitalize">{user?.role}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors w-full"
        >
          <LogOut size={14} />
          Keluar
        </button>
      </div>
    </aside>
  );
}
