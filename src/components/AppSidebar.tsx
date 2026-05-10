import {
  LayoutDashboard, Package, Factory, ArrowRightLeft, Layers,
  BarChart3, Users, Wallet, FileText, TrendingUp, Settings,
  ChevronLeft, ChevronRight, Scissors, Globe, LogOut, Sun, Moon,
  BookOpen, StickyNote, DollarSign, CalendarDays, CreditCard, Truck, Shield,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getModulesForRole } from "@/lib/roleAccess";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ── Navigation groups ────────────────────────────────────────────
type NavItem = { icon: React.ComponentType<{ className?: string }>; labelKey: Parameters<ReturnType<typeof useLanguage>["t"]>[0]; id: string };
type NavGroup = { labelKey: Parameters<ReturnType<typeof useLanguage>["t"]>[0]; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "dashboard",
    items: [
      { icon: LayoutDashboard, labelKey: "dashboard", id: "dashboard" },
    ],
  },
  {
    labelKey: "production",
    items: [
      { icon: Package,        labelKey: "purchase",     id: "purchase" },
      { icon: Factory,        labelKey: "factories",    id: "factories" },
      { icon: ArrowRightLeft, labelKey: "transfers",    id: "transfers" },
      { icon: Layers,         labelKey: "production",   id: "production" },
      { icon: Scissors,       labelKey: "inventory",    id: "inventory" },
      { icon: ClipboardList,  labelKey: "twobytwoStock",id: "twobytwo_stock" },
      { icon: Package,        labelKey: "gutiStock",    id: "guti_stock" },
    ],
  },
  {
    labelKey: "sales",
    items: [
      { icon: Users,        labelKey: "sales",        id: "sales" },
      { icon: BarChart3,    labelKey: "party",        id: "party" },
      { icon: FileText,     labelKey: "challan",      id: "challan" },
      { icon: ClipboardList,labelKey: "booking",      id: "booking_slip" },
    ],
  },
  {
    labelKey: "cash",
    items: [
      { icon: Wallet,      labelKey: "cash",          id: "cash" },
      { icon: BookOpen,    labelKey: "ledger",        id: "ledger" },
      { icon: DollarSign,  labelKey: "profitLoss",    id: "profit_loss" },
      { icon: CreditCard,  labelKey: "buyerDues",     id: "buyer_dues" },
      { icon: Users,       labelKey: "buyerProfiles", id: "buyer_profiles" },
      { icon: Truck,       labelKey: "suppliers",     id: "suppliers" },
    ],
  },
  {
    labelKey: "analytics",
    items: [
      { icon: TrendingUp,   labelKey: "analytics",   id: "analytics" },
      { icon: CalendarDays, labelKey: "dailyReport",  id: "daily_report" },
      { icon: Shield,       labelKey: "auditLog",     id: "audit_log" },
      { icon: StickyNote,   labelKey: "companyPad",   id: "company_pad" },
    ],
  },
  {
    labelKey: "settings",
    items: [
      { icon: Settings, labelKey: "settings", id: "settings" },
    ],
  },
];

const ROLE_LABEL_KEYS: Record<string, "admin" | "factoryManager" | "accountant"> = {
  admin:           "admin",
  factory_manager: "factoryManager",
  accountant:      "accountant",
};

interface AppSidebarProps {
  activeModule: string;
  onModuleChange: (id: string) => void;
  onClose?: () => void;
}

const NavButton = ({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) => {
  const { t } = useLanguage();
  const label = t(item.labelKey);

  const btn = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 rounded-lg text-sm transition-all duration-150 group",
        collapsed ? "h-9 w-9 justify-center px-0 mx-auto" : "px-3 py-2",
        active
          ? "bg-primary/10 text-primary font-semibold"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <item.icon className={cn(
        "shrink-0 transition-colors",
        collapsed ? "w-[18px] h-[18px]" : "w-[17px] h-[17px]",
        active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
      )} />
      {!collapsed && <span className="truncate leading-none">{label}</span>}
      {!collapsed && active && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
      )}
    </button>
  );

  if (!collapsed) return btn;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
};

const AppSidebar = ({ activeModule, onModuleChange, onClose }: AppSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const { t, lang, setLang } = useLanguage();
  const { role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useCompanySettings();

  const allowedModules = getModulesForRole(role);

  const handleModuleChange = (id: string) => {
    onModuleChange(id);
    onClose?.();
  };

  const visibleGroups = NAV_GROUPS
    .map(group => ({
      ...group,
      items: group.items.filter(item => allowedModules.includes(item.id)),
    }))
    .filter(group => group.items.length > 0);

  const roleKey = ROLE_LABEL_KEYS[role ?? "accountant"] ?? "accountant";

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          "h-screen flex flex-col bg-gradient-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
          collapsed ? "w-[60px]" : "w-[248px]"
        )}
      >
        {/* ── Logo ─────────────────────────────────────────────── */}
        <div className={cn(
          "flex items-center h-14 border-b border-sidebar-border shrink-0",
          collapsed ? "justify-center px-0" : "gap-2.5 px-4"
        )}>
          <div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center shrink-0 overflow-hidden shadow-gold">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-[11px] font-extrabold text-primary-foreground tracking-tight">MH</span>
            )}
          </div>
          {!collapsed && (
            <div className="overflow-hidden min-w-0">
              <h1 className="text-[13px] font-bold text-foreground truncate leading-tight">
                {settings.company_name || "Mahin Enterprise"}
              </h1>
              <p className="text-[10px] text-muted-foreground truncate">{t("hairProcessingErp")}</p>
            </div>
          )}
        </div>

        {/* ── Role badge ───────────────────────────────────────── */}
        {!collapsed && role && (
          <div className="px-4 pt-3 pb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/15">
              {t(roleKey)}
            </span>
          </div>
        )}

        {/* ── Navigation ───────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 scrollbar-thin">
          {visibleGroups.map((group, gi) => (
            <div key={gi} className={collapsed ? "px-2" : "px-2"}>
              {!collapsed && gi > 0 && (
                <div className="pt-3 pb-1 px-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {t(group.labelKey)}
                  </span>
                </div>
              )}
              {collapsed && gi > 0 && (
                <div className="my-1.5 h-px bg-sidebar-border mx-1" />
              )}
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavButton
                    key={item.id}
                    item={item}
                    active={activeModule === item.id}
                    collapsed={collapsed}
                    onClick={() => handleModuleChange(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Bottom actions ───────────────────────────────────── */}
        <div className={cn(
          "border-t border-sidebar-border pb-2 pt-1.5 shrink-0",
          collapsed ? "flex flex-col items-center gap-0.5 px-2" : "px-3 space-y-0.5"
        )}>
          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleTheme}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg text-[12px] text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
                  collapsed ? "w-9 h-9 justify-center" : "w-full px-3 py-2"
                )}
              >
                {theme === "dark"
                  ? <Sun className="w-4 h-4 shrink-0" />
                  : <Moon className="w-4 h-4 shrink-0" />}
                {!collapsed && (theme === "dark" ? "Light Mode" : "Dark Mode")}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="text-xs">
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </TooltipContent>
            )}
          </Tooltip>

          {/* Language toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setLang(lang === "bn" ? "en" : "bn")}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg text-[12px] text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
                  collapsed ? "w-9 h-9 justify-center" : "w-full px-3 py-2"
                )}
              >
                <Globe className="w-4 h-4 shrink-0" />
                {!collapsed && (lang === "bn" ? "🇬🇧 English" : "🇧🇩 বাংলা")}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="text-xs">
                {lang === "bn" ? "Switch to English" : "বাংলায় পরিবর্তন"}
              </TooltipContent>
            )}
          </Tooltip>

          {/* Logout */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={signOut}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg text-[12px] text-destructive hover:bg-destructive/10 transition-colors",
                  collapsed ? "w-9 h-9 justify-center" : "w-full px-3 py-2"
                )}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                {!collapsed && t("logout")}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="text-xs text-destructive">
                {t("logout")}
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* ── Collapse toggle ──────────────────────────────────── */}
        <button
          type="button"
          onClick={() => setCollapsed(v => !v)}
          className="hidden md:flex items-center justify-center h-9 border-t border-sidebar-border text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>
    </TooltipProvider>
  );
};

export default AppSidebar;
