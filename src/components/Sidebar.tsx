"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Target, Activity, FileText, Settings,
  Users, Sliders, LogOut, ChevronRight, TrendingUp, CalendarDays,
  ClipboardList, Megaphone, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",  label: "Dashboard",         icon: LayoutDashboard, roles: ["admin", "sales"] },
  { href: "/pipeline",   label: "Pipeline",           icon: Target,          roles: ["admin", "sales"] },
  { href: "/activities", label: "Activity Log",       icon: Activity,        roles: ["admin", "sales"] },
  { href: "/plans",      label: "Rencana",            icon: CalendarDays,    roles: ["admin", "sales"] },
  { href: "/mom",        label: "Minutes of Meeting", icon: FileText,        roles: ["admin", "sales"] },
  { href: "/events",     label: "Events",             icon: Megaphone,       roles: ["admin", "sales", "trainer"] },
  { href: "/reports",    label: "Laporan",            icon: TrendingUp,      roles: ["admin", "sales"] },
  { href: "/wip",        label: "WIP Report",         icon: ClipboardList,   roles: ["admin", "sales"] },
];

const adminItems = [
  { href: "/admin/users",         label: "Kelola User",   icon: Users    },
  { href: "/admin/config",        label: "Konfigurasi",   icon: Settings },
  { href: "/admin/funnel-stages", label: "Funnel Stages", icon: Sliders  },
];

export default function Sidebar({
  collapsed = false,
  onToggle,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navLink = (href: string, label: string, icon: React.ElementType, active: boolean) => {
    const Icon = icon;
    if (collapsed) {
      return (
        <Link
          key={href}
          href={href}
          title={label}
          className={`flex items-center justify-center p-2.5 rounded-lg mb-1 transition-colors ${
            active ? "bg-yellow-500 text-gray-900" : "text-gray-300 hover:bg-gray-800"
          }`}
        >
          <Icon size={18} />
        </Link>
      );
    }
    return (
      <Link
        key={href}
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm transition-colors ${
          active ? "bg-yellow-500 text-gray-900 font-semibold" : "text-gray-300 hover:bg-gray-800"
        }`}
      >
        <Icon size={16} />
        <span className="truncate">{label}</span>
        {active && <ChevronRight size={14} className="ml-auto shrink-0" />}
      </Link>
    );
  };

  return (
    <aside className="w-full bg-gray-900 text-white flex flex-col h-full">

      {/* Header */}
      <div className={`border-b border-gray-700 flex items-center shrink-0 ${collapsed ? "justify-center py-4 px-2" : "justify-between px-5 py-4"}`}>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-lg font-bold text-yellow-400 truncate">MWX Partnership</div>
            <div className="text-xs text-gray-400 mt-0.5">SLA Dashboard</div>
          </div>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors shrink-0"
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        )}
      </div>

      {/* Nav items */}
      <div className={`py-4 border-b border-gray-700 flex-shrink-0 ${collapsed ? "px-2" : "px-3"}`}>
        {!collapsed && (
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 px-2">Menu</div>
        )}
        {navItems
          .filter((item) => item.roles.includes(user?.role || "sales"))
          .map((item) => navLink(item.href, item.label, item.icon, pathname.startsWith(item.href)))}
      </div>

      {/* Admin items */}
      {user?.role === "admin" && (
        <div className={`py-4 border-b border-gray-700 flex-shrink-0 ${collapsed ? "px-2" : "px-3"}`}>
          {!collapsed && (
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 px-2">Admin</div>
          )}
          {adminItems.map((item) => navLink(item.href, item.label, item.icon, pathname.startsWith(item.href)))}
        </div>
      )}

      {/* User footer */}
      <div className={`mt-auto border-t border-gray-700 shrink-0 ${collapsed ? "px-2 py-3 flex flex-col items-center gap-2" : "p-4"}`}>
        {collapsed ? (
          <>
            <div
              title={`${user?.name} (${user?.role})`}
              className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-gray-900 font-bold text-sm cursor-default"
            >
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <button
              onClick={logout}
              title="Keluar"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-gray-900 font-bold text-sm shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{user?.name}</div>
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
          </>
        )}
      </div>
    </aside>
  );
}
