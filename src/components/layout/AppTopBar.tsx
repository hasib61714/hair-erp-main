import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Menu, Camera, Trash2, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getModulesForRole } from "@/lib/roleAccess";
import NotificationBell from "@/components/NotificationBell";

type TranslationKey = Parameters<ReturnType<typeof useLanguage>["t"]>[0];

const ROLE_LABELS: Record<string, Record<string, string>> = {
  admin: { bn: "অ্যাডমিন", en: "Admin" },
  factory_manager: { bn: "ফ্যাক্টরি ম্যানেজার", en: "Factory Manager" },
  accountant: { bn: "হিসাবরক্ষক", en: "Accountant" },
};

type SearchableModule = { id: string; en: string; bn: string };

const ALL_MODULES: SearchableModule[] = [
  { id: "dashboard",      en: "Dashboard",       bn: "ড্যাশবোর্ড" },
  { id: "purchase",       en: "Purchase",        bn: "ক্রয়" },
  { id: "factories",      en: "Factories",       bn: "কারখানা" },
  { id: "transfers",      en: "Transfers",       bn: "ট্রান্সফার" },
  { id: "production",     en: "Production",      bn: "উৎপাদন" },
  { id: "inventory",      en: "Inventory",       bn: "ইনভেন্টরি" },
  { id: "twobytwo_stock", en: "2x2 Stock",       bn: "টু বাই টু স্টক" },
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

const AppTopBar = ({ activeModule, onModuleChange, onOpenMobileMenu }: Props) => {
  const { t, lang } = useLanguage();
  const { user, role } = useAuth();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    fetchAvatar();
  }, [fetchAvatar]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearchSelect = (moduleId: string) => {
    onModuleChange(moduleId);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setSearchQuery("");
      setShowSearchResults(false);
    }
    if (e.key === "Enter" && filteredModules.length > 0) {
      handleSearchSelect(filteredModules[0].id);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { data: existing } = await supabase.storage.from("avatars").list(user.id, { limit: 5 });
    const oldFiles = existing?.filter(f => f.name.startsWith("avatar")) ?? [];
    if (oldFiles.length > 0) {
      await supabase.storage.from("avatars").remove(oldFiles.map(f => `${user.id}/${f.name}`));
    }
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "প্রোফাইল পিকচার আপলোড হয়েছে" : "Profile picture uploaded");
    fetchAvatar();
    setShowAvatarMenu(false);
  };

  const handleAvatarDelete = async () => {
    if (!user) return;
    const { data: existing } = await supabase.storage.from("avatars").list(user.id, { limit: 5 });
    const oldFiles = existing?.filter(f => f.name.startsWith("avatar")) ?? [];
    if (oldFiles.length > 0) {
      await supabase.storage.from("avatars").remove(oldFiles.map(f => `${user.id}/${f.name}`));
    }
    setAvatarUrl(null);
    toast.success(lang === "bn" ? "প্রোফাইল পিকচার মুছে ফেলা হয়েছে" : "Profile picture deleted");
    setShowAvatarMenu(false);
  };

  const userInitials =
    user?.user_metadata?.full_name
      ? (user.user_metadata.full_name as string)
          .split(" ")
          .map((w: string) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "MH";

  return (
    <header
      className="sticky top-0 z-10 h-14 md:h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6"
      onClick={() => showAvatarMenu && setShowAvatarMenu(false)}
    >
      {/* Left: mobile menu + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>

        <div>
          <h2 className="text-base md:text-lg font-semibold text-foreground">
            {t(activeModule as TranslationKey)}
          </h2>
          <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
            Mahin Enterprise — {t("hairProcessingErp")}
          </p>
        </div>

        {role && (
          <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-primary/15 text-primary border border-primary/20">
            {ROLE_LABELS[role]?.[lang] ?? role}
          </span>
        )}
      </div>

      {/* Right: search + notifications + avatar */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Search */}
        <div ref={searchRef} className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t("search")}
            className="h-9 w-56 rounded-lg border border-border bg-secondary/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setShowSearchResults(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {showSearchResults && filteredModules.length > 0 && (
            <div className="absolute top-11 left-0 w-56 bg-card border border-border rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
              {filteredModules.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleSearchSelect(m.id)}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors flex items-center gap-2"
                >
                  <span className="font-medium">{lang === "bn" ? m.bn : m.en}</span>
                  {lang === "bn" && (
                    <span className="text-xs text-muted-foreground ml-auto">{m.en}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {showSearchResults && searchQuery.trim().length > 0 && filteredModules.length === 0 && (
            <div className="absolute top-11 left-0 w-56 bg-card border border-border rounded-lg shadow-lg z-50 py-3 px-3 text-xs text-muted-foreground">
              {lang === "bn" ? "কোনো মডিউল পাওয়া যায়নি" : "No modules found"}
            </div>
          )}
        </div>

        <NotificationBell onNavigate={onModuleChange} />

        {/* Avatar menu */}
        <div
          className="relative"
          onClick={e => e.stopPropagation()}
        >
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <button
            onClick={() => setShowAvatarMenu(prev => !prev)}
            className="w-9 h-9 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary/50 transition-all"
            aria-label="Profile menu"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-gold flex items-center justify-center text-xs font-bold text-primary-foreground">
                {userInitials}
              </div>
            )}
          </button>

          {showAvatarMenu && (
            <div className="absolute right-0 top-11 w-44 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                {lang === "bn" ? "ছবি আপলোড করুন" : "Upload Photo"}
              </button>
              {avatarUrl && (
                <button
                  onClick={handleAvatarDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {lang === "bn" ? "ছবি মুছুন" : "Delete Photo"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppTopBar;
