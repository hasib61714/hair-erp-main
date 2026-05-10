import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, Menu, Camera, Trash2, X, KeyRound,
  Eye, EyeOff, Shield, LogOut, Loader2, ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getModulesForRole } from "@/lib/roleAccess";
import NotificationBell from "@/components/NotificationBell";
import { cn } from "@/lib/utils";

type TranslationKey = Parameters<ReturnType<typeof useLanguage>["t"]>[0];

const ROLE_LABELS: Record<string, Record<string, string>> = {
  admin:           { bn: "অ্যাডমিন",           en: "Admin" },
  factory_manager: { bn: "ফ্যাক্টরি ম্যানেজার", en: "Factory Manager" },
  accountant:      { bn: "হিসাবরক্ষক",          en: "Accountant" },
};

const ROLE_LABEL_KEYS: Record<string, "admin" | "factoryManager" | "accountant"> = {
  admin:           "admin",
  factory_manager: "factoryManager",
  accountant:      "accountant",
};

type SearchableModule = { id: string; en: string; bn: string };

const ALL_MODULES: SearchableModule[] = [
  { id: "dashboard",      en: "Dashboard",       bn: "ড্যাশবোর্ড" },
  { id: "purchase",       en: "Purchase",        bn: "ক্রয়" },
  { id: "factories",      en: "Factories",       bn: "কারখানা" },
  { id: "transfers",      en: "Transfers",       bn: "ট্রান্সফার" },
  { id: "production",     en: "Production",      bn: "উৎপাদন" },
  { id: "inventory",      en: "Inventory",       bn: "ইনভেন্টরি" },
  { id: "twobytwo_stock", en: "2×2 Stock",       bn: "টু বাই টু স্টক" },
  { id: "guti_stock",     en: "Guti Stock",      bn: "গুটি স্টক" },
  { id: "sales",          en: "Sales",           bn: "বিক্রয়" },
  { id: "party",          en: "Party",           bn: "পার্টি" },
  { id: "cash",           en: "Cash",            bn: "নগদ" },
  { id: "ledger",         en: "Ledger",          bn: "লেজার" },
  { id: "challan",        en: "Challan",         bn: "চালান" },
  { id: "booking_slip",   en: "Booking Slip",    bn: "বুকিং স্লিপ" },
  { id: "company_pad",    en: "Company Pad",     bn: "কোম্পানি প্যাড" },
  { id: "profit_loss",    en: "Profit & Loss",   bn: "লাভ-ক্ষতি" },
  { id: "daily_report",   en: "Daily Report",    bn: "দৈনিক রিপোর্ট" },
  { id: "buyer_dues",     en: "Buyer Dues",      bn: "ক্রেতার বাকি" },
  { id: "buyer_profiles", en: "Buyer Profiles",  bn: "ক্রেতার প্রোফাইল" },
  { id: "suppliers",      en: "Suppliers",       bn: "সরবরাহকারী" },
  { id: "audit_log",      en: "Audit Log",       bn: "অডিট লগ" },
  { id: "analytics",      en: "Analytics",       bn: "বিশ্লেষণ" },
  { id: "settings",       en: "Settings",        bn: "সেটিংস" },
];

interface Props {
  activeModule: string;
  onModuleChange: (module: string) => void;
  onOpenMobileMenu: () => void;
}

// ── Profile dropdown ─────────────────────────────────────────────
const ProfileMenu = ({
  user,
  role,
  avatarUrl,
  userInitials,
  onAvatarUpload,
  onAvatarDelete,
  onSignOut,
  lang,
  uploading,
}: {
  user: ReturnType<typeof useAuth>["user"];
  role: ReturnType<typeof useAuth>["role"];
  avatarUrl: string | null;
  userInitials: string;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAvatarDelete: () => void;
  onSignOut: () => void;
  lang: string;
  uploading: boolean;
}) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowPwForm(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) {
      toast.error(lang === "bn" ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে" : "Password must be at least 6 characters");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error(lang === "bn" ? "পাসওয়ার্ড মিলছে না" : "Passwords do not match");
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "পাসওয়ার্ড পরিবর্তন হয়েছে" : "Password updated successfully");
    setNewPw(""); setConfirmPw(""); setShowPwForm(false); setOpen(false);
  };

  const roleKey = ROLE_LABEL_KEYS[role ?? "accountant"] ?? "accountant";

  return (
    <div ref={menuRef} className="relative">
      <input ref={avatarRef} type="file" accept="image/*" onChange={onAvatarUpload} className="hidden" aria-label="Upload profile picture" title="Upload profile picture" />

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-accent transition-colors group"
        aria-label="Profile menu"
      >
        <div className="w-7 h-7 rounded-lg overflow-hidden border border-border ring-0 group-hover:ring-2 group-hover:ring-primary/30 transition-all">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-gold flex items-center justify-center text-[10px] font-bold text-white">
              {userInitials}
            </div>
          )}
        </div>
        <ChevronDown className={cn(
          "w-3 h-3 text-muted-foreground transition-transform duration-200",
          open && "rotate-180"
        )} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-64 bg-card border border-border rounded-xl shadow-xl z-50 animate-scale-in overflow-hidden">
          {/* User info */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg overflow-hidden border border-border shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-gold flex items-center justify-center text-xs font-bold text-white">
                    {userInitials}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-primary" />
              <span className="text-[11px] font-medium text-primary">{t(roleKey)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading
                ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                : <Camera className="w-4 h-4 text-muted-foreground" />
              }
              {uploading
                ? (lang === "bn" ? "আপলোড হচ্ছে..." : "Uploading...")
                : (lang === "bn" ? "প্রোফাইল ছবি আপলোড" : "Upload Photo")
              }
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => { onAvatarDelete(); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/8 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {lang === "bn" ? "ছবি মুছুন" : "Remove Photo"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowPwForm(v => !v)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              {lang === "bn" ? "পাসওয়ার্ড পরিবর্তন" : "Change Password"}
            </button>
          </div>

          {/* Change password form */}
          {showPwForm && (
            <form onSubmit={handleChangePassword} className="px-3 pb-3 pt-1 border-t border-border space-y-2">
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  placeholder={lang === "bn" ? "নতুন পাসওয়ার্ড" : "New password"}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="input-base pr-9 h-8 text-xs"
                />
                <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmPw ? "text" : "password"}
                  placeholder={lang === "bn" ? "পাসওয়ার্ড নিশ্চিত করুন" : "Confirm password"}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  className="input-base pr-9 h-8 text-xs"
                />
                <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirmPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button type="submit" disabled={pwLoading || !newPw} className="btn-primary w-full h-8 text-xs">
                {pwLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {lang === "bn" ? "সেভ করুন" : "Save Password"}
              </button>
            </form>
          )}

          {/* Logout */}
          <div className="border-t border-border py-1">
            <button
              type="button"
              onClick={onSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/8 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t("logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main top bar ─────────────────────────────────────────────────
const AppTopBar = ({ activeModule, onModuleChange, onOpenMobileMenu }: Props) => {
  const { t, lang } = useLanguage();
  const { user, role, signOut } = useAuth();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const allowedModules = getModulesForRole(role);

  const filteredModules =
    searchQuery.trim().length > 0
      ? ALL_MODULES.filter(
          m =>
            allowedModules.includes(m.id) &&
            (m.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
              m.bn.includes(searchQuery))
        )
      : [];

  const fetchAvatar = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.storage.from("avatars").list(user.id, { limit: 5 });
    const file = data?.find(f => f.name.startsWith("avatar"));
    if (file) {
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(`${user.id}/${file.name}`);
      setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
    } else {
      setAvatarUrl(null);
    }
  }, [user]);

  useEffect(() => { fetchAvatar(); }, [fetchAvatar]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSearchSelect = (moduleId: string) => {
    onModuleChange(moduleId);
    setSearchQuery("");
    setShowSearchResults(false);
    setMobileSearchOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { setSearchQuery(""); setShowSearchResults(false); }
    if (e.key === "Enter" && filteredModules.length > 0) handleSearchSelect(filteredModules[0].id);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { data: existing } = await supabase.storage.from("avatars").list(user.id, { limit: 10 });
      const oldFiles = existing?.filter(f => f.name.startsWith("avatar")) ?? [];
      if (oldFiles.length > 0) {
        await supabase.storage.from("avatars").remove(oldFiles.map(f => `${user.id}/${f.name}`));
      }
      const { error } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });
      if (error) throw error;
      toast.success(lang === "bn" ? "প্রোফাইল ছবি আপলোড হয়েছে" : "Profile picture uploaded");
      await fetchAvatar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleAvatarDelete = async () => {
    if (!user) return;
    const { data: existing } = await supabase.storage.from("avatars").list(user.id, { limit: 5 });
    const oldFiles = existing?.filter(f => f.name.startsWith("avatar")) ?? [];
    if (oldFiles.length > 0) {
      await supabase.storage.from("avatars").remove(oldFiles.map(f => `${user.id}/${f.name}`));
    }
    setAvatarUrl(null);
    toast.success(lang === "bn" ? "প্রোফাইল ছবি মুছে ফেলা হয়েছে" : "Profile picture removed");
  };

  const userInitials =
    user?.user_metadata?.full_name
      ? (user.user_metadata.full_name as string).split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
      : (user?.email?.slice(0, 2) ?? "MH").toUpperCase();

  const pageTitle = t(activeModule as TranslationKey);

  return (
    <header className="sticky top-0 z-10 h-14 border-b border-border bg-background/90 backdrop-blur-md flex items-center gap-3 px-4 md:px-5">
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="md:hidden btn-icon shrink-0"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title — hidden when mobile search is open */}
      {!mobileSearchOpen && (
        <div className="flex items-center gap-2.5 min-w-0 flex-1 md:flex-none">
          <h2 className="text-[15px] font-semibold text-foreground truncate">{pageTitle}</h2>
          {role && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/15 shrink-0">
              {ROLE_LABELS[role]?.[lang] ?? role}
            </span>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Desktop search */}
      <div ref={searchRef} className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={searchInputRef}
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
          onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
          onKeyDown={handleSearchKeyDown}
          placeholder={`${t("search")}  /`}
          className="h-8 w-52 rounded-lg border border-border bg-secondary/60 pl-8 pr-8 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
        />
        {searchQuery ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => { setSearchQuery(""); setShowSearchResults(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50 font-mono pointer-events-none">/</kbd>
        )}

        {showSearchResults && (
          <div className="absolute top-10 left-0 w-52 bg-card border border-border rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto animate-scale-in">
            {filteredModules.length > 0 ? (
              filteredModules.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSearchSelect(m.id)}
                  className="w-full text-left px-3 py-2 text-[13px] text-foreground hover:bg-accent transition-colors flex items-center justify-between gap-2"
                >
                  <span className="font-medium">{lang === "bn" ? m.bn : m.en}</span>
                  {lang === "bn" && <span className="text-[11px] text-muted-foreground shrink-0">{m.en}</span>}
                </button>
              ))
            ) : searchQuery.trim().length > 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">
                {lang === "bn" ? "কোনো মডিউল পাওয়া যায়নি" : "No modules found"}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Mobile search toggle */}
      <div className="md:hidden">
        {mobileSearchOpen ? (
          <div className="relative flex-1 flex items-center" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              autoFocus
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
              onKeyDown={handleSearchKeyDown}
              placeholder={t("search")}
              className="h-8 w-40 rounded-lg border border-border bg-secondary/60 pl-8 pr-8 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
            <button type="button" aria-label="Close search" onClick={() => { setMobileSearchOpen(false); setSearchQuery(""); setShowSearchResults(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
            {showSearchResults && filteredModules.length > 0 && (
              <div className="absolute top-10 left-0 w-48 bg-card border border-border rounded-lg shadow-xl z-50 py-1 max-h-56 overflow-y-auto">
                {filteredModules.map(m => (
                  <button key={m.id} type="button" onClick={() => handleSearchSelect(m.id)} className="w-full text-left px-3 py-2 text-[13px] text-foreground hover:bg-accent transition-colors">
                    {lang === "bn" ? m.bn : m.en}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button type="button" onClick={() => setMobileSearchOpen(true)} className="btn-icon">
            <Search className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Notification bell */}
      <NotificationBell onNavigate={onModuleChange} />

      {/* Profile menu */}
      <ProfileMenu
        user={user}
        role={role}
        avatarUrl={avatarUrl}
        userInitials={userInitials}
        onAvatarUpload={handleAvatarUpload}
        onAvatarDelete={handleAvatarDelete}
        onSignOut={signOut}
        lang={lang}
        uploading={uploading}
      />
    </header>
  );
};

export default AppTopBar;
