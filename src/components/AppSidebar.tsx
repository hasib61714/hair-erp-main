import { 
  LayoutDashboard, Package, Factory, ArrowRightLeft, Layers, 
  BarChart3, Users, Wallet, FileText, TrendingUp, Settings,
  ChevronLeft, ChevronRight, Scissors, Globe, LogOut, Sun, Moon,
  BookOpen, StickyNote, DollarSign, CalendarDays, CreditCard, Truck, Shield,
  User, KeyRound, Eye, EyeOff, X, Loader2
} from "lucide-react";
import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getModulesForRole } from "@/lib/roleAccess";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const allMenuItems = [
  { icon: LayoutDashboard, labelKey: "dashboard" as const, id: "dashboard" },
  { icon: Package, labelKey: "purchase" as const, id: "purchase" },
  { icon: Factory, labelKey: "factories" as const, id: "factories" },
  { icon: ArrowRightLeft, labelKey: "transfers" as const, id: "transfers" },
  { icon: Layers, labelKey: "production" as const, id: "production" },
  { icon: Scissors, labelKey: "inventory" as const, id: "inventory" },
  { icon: ClipboardList, labelKey: "twobytwoStock" as const, id: "twobytwo_stock" },
  { icon: Package, labelKey: "gutiStock" as const, id: "guti_stock" },
  { icon: Users, labelKey: "sales" as const, id: "sales" },
  { icon: BarChart3, labelKey: "party" as const, id: "party" },
  { icon: Wallet, labelKey: "cash" as const, id: "cash" },
  { icon: BookOpen, labelKey: "ledger" as const, id: "ledger" },
  { icon: FileText, labelKey: "challan" as const, id: "challan" },
  { icon: ClipboardList, labelKey: "booking" as const, id: "booking_slip" },
  { icon: TrendingUp, labelKey: "analytics" as const, id: "analytics" },
  { icon: DollarSign, labelKey: "profitLoss" as const, id: "profit_loss" },
  { icon: CalendarDays, labelKey: "dailyReport" as const, id: "daily_report" },
  { icon: CreditCard, labelKey: "buyerDues" as const, id: "buyer_dues" },
  { icon: Users, labelKey: "buyerProfiles" as const, id: "buyer_profiles" },
  { icon: Truck, labelKey: "suppliers" as const, id: "suppliers" },
  { icon: Shield, labelKey: "auditLog" as const, id: "audit_log" },
  { icon: StickyNote, labelKey: "companyPad" as const, id: "company_pad" },
  { icon: Settings, labelKey: "settings" as const, id: "settings" },
];

const roleLabels: Record<string, "admin" | "factoryManager" | "accountant"> = {
  admin: "admin",
  factory_manager: "factoryManager",
  accountant: "accountant",
};

interface AppSidebarProps {
  activeModule: string;
  onModuleChange: (id: string) => void;
  onClose?: () => void;
}

const AppSidebar = ({ activeModule, onModuleChange, onClose }: AppSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const { t, lang, setLang } = useLanguage();
  const { user, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useCompanySettings();

  const [showProfile, setShowProfile] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে"); return; }
    if (newPassword !== confirmPassword) { toast.error("পাসওয়ার্ড মিলছে না"); return; }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে");
    setNewPassword(""); setConfirmPassword(""); setShowProfile(false);
  };

  const allowedModules = getModulesForRole(role);
  const menuItems = allMenuItems.filter((item) => allowedModules.includes(item.id));

  const handleModuleChange = (id: string) => {
    onModuleChange(id);
    onClose?.();
  };

  return (
    <>
    <aside
      className={cn(
        "h-screen flex flex-col border-r border-sidebar-border transition-all duration-300 bg-gradient-sidebar",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-gradient-gold flex items-center justify-center shrink-0 overflow-hidden">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <span className="text-sm font-bold text-primary-foreground">MH</span>
          )}
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-foreground truncate">Mahin Enterprise</h1>
            <p className="text-[11px] text-muted-foreground truncate">{t("hairProcessingErp")}</p>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && role && (
        <div className="px-4 py-2 border-b border-sidebar-border">
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-primary/15 text-primary">
            {t(roleLabels[role] || "accountant")}
          </span>
        </div>
      )}

      {/* User profile section */}
      {!collapsed && user && (
        <button
          type="button"
          onClick={() => setShowProfile(true)}
          className="mx-3 mt-2 mb-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary/60 transition-colors text-left"
        >
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-medium text-foreground truncate">
              {user.user_metadata?.full_name || user.email?.split("@")[0] || "User"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
          </div>
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {menuItems.map((item) => {
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleModuleChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                isActive
                  ? "bg-primary/15 text-primary font-medium shadow-gold"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive && "text-primary")} />
              {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
            </button>
          );
        })}
      </nav>

      {/* Theme toggle */}
      {!collapsed && (
        <div className="px-3 py-1 border-t border-sidebar-border">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      )}

      {/* Language toggle */}
      {!collapsed && (
        <div className="px-3 py-1">
          <button
            onClick={() => setLang(lang === "bn" ? "en" : "bn")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <Globe className="w-4 h-4" />
            {lang === "bn" ? "🇬🇧 English" : "🇧🇩 বাংলা"}
          </button>
        </div>
      )}

      {/* Logout */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-sidebar-border">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t("logout")}
          </button>
        </div>
      )}

      {/* Collapse toggle (hidden on mobile) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden md:flex items-center justify-center h-10 border-t border-sidebar-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Developer credit */}
      {!collapsed && (
        <div className="px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground/40">Developed by</p>
          <p className="text-[10px] font-semibold text-muted-foreground/60">Md. Hasibul Hasan</p>
        </div>
      )}
    </aside>

    {/* Profile Modal */}
    {showProfile && user && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowProfile(false)}>
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {user.user_metadata?.full_name || user.email?.split("@")[0] || "User"}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <button type="button" title="বন্ধ করুন" onClick={() => setShowProfile(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Role */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">{t(roleLabels[role || "accountant"] || "accountant")}</span>
          </div>

          {/* Change password form */}
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">পাসওয়ার্ড পরিবর্তন</span>
            </div>

            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                placeholder="নতুন পাসওয়ার্ড"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 pr-9 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="relative">
              <input
                type={showConfirmPw ? "text" : "password"}
                placeholder="পাসওয়ার্ড নিশ্চিত করুন"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 pr-9 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showConfirmPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button type="submit" disabled={pwLoading || !newPassword}
              className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              পাসওয়ার্ড সেভ করুন
            </button>
          </form>

          {/* Logout */}
          <button type="button" onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors">
            <LogOut className="w-4 h-4" />
            লগআউট
          </button>
        </div>
      </div>
    )}
    </>
  );
};

export default AppSidebar;
