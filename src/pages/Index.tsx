import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Menu, X, Camera, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AppSidebar from "@/components/AppSidebar";
import NotificationBell from "@/components/NotificationBell";
import StatsCard from "@/components/StatsCard";
import ProductionFlow from "@/components/ProductionFlow";
import GradeInventory from "@/components/GradeInventory";
import FactorySummary from "@/components/FactorySummary";
import RecentTransactions from "@/components/RecentTransactions";
import CashSummary from "@/components/CashSummary";
import PurchaseModule from "@/components/modules/PurchaseModule";
import ProductionModule from "@/components/modules/ProductionModule";
import InventoryModule from "@/components/modules/InventoryModule";
import TwoByTwoStockModule from "@/components/modules/TwoByTwoStockModule";
import SalesModule from "@/components/modules/SalesModule";

import GutiStockModule from "@/components/modules/GutiStockModule";
import LedgerModule from "@/components/modules/LedgerModule";
import PartyModule from "@/components/modules/PartyModule";
import CashModule from "@/components/modules/CashModule";
import TransferModule from "@/components/modules/TransferModule";
import FactoryModule from "@/components/modules/FactoryModule";
import ChallanModule from "@/components/modules/ChallanModule";
import AnalyticsModule from "@/components/modules/AnalyticsModule";
import BookingSlipModule from "@/components/modules/BookingSlipModule";
import CompanyPadModule from "@/components/modules/CompanyPadModule";
import ProfitLossModule from "@/components/modules/ProfitLossModule";
import DailyReportModule from "@/components/modules/DailyReportModule";
import BuyerDueModule from "@/components/modules/BuyerDueModule";
import BuyerProfileModule from "@/components/modules/BuyerProfileModule";
import SupplierModule from "@/components/modules/SupplierModule";
import AuditLogModule from "@/components/modules/AuditLogModule";
import SettingsModule from "@/components/modules/SettingsModule";
import { Package, Factory, Wallet, Users, TrendingUp, Layers } from "lucide-react";

const roleLabels: Record<string, Record<string, string>> = {
  admin: { bn: "অ্যাডমিন", en: "Admin" },
  factory_manager: { bn: "ফ্যাক্টরি ম্যানেজার", en: "Factory Manager" },
  accountant: { bn: "হিসাবরক্ষক", en: "Accountant" },
};

const Index = () => {
  const [activeModule, setActiveModule] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t, lang } = useLanguage();
  const { user, role } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [welcomeShown, setWelcomeShown] = useState(false);

  // Show welcome toast with role after login
  useEffect(() => {
    if (user && role && !welcomeShown) {
      const roleName = roleLabels[role]?.[lang] || role;
      toast.success(
        lang === "bn"
          ? `স্বাগতম! আপনি ${roleName} হিসেবে লগইন করেছেন`
          : `Welcome! You are logged in as ${roleName}`
      );
      setWelcomeShown(true);
    }
  }, [user, role]);

  const fetchAvatar = async () => {
    if (!user) return;
    const { data } = await supabase.storage.from("avatars").list(user.id, { limit: 5 });
    const file = data?.find(f => f.name.startsWith("avatar"));
    if (file) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(`${user.id}/${file.name}`);
      setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
    } else {
      setAvatarUrl(null);
    }
  };

  useEffect(() => { fetchAvatar(); }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    // Remove old avatars
    const { data: existing } = await supabase.storage.from("avatars").list(user.id, { limit: 5 });
    const oldFiles = existing?.filter(f => f.name.startsWith("avatar")) || [];
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
    const oldFiles = existing?.filter(f => f.name.startsWith("avatar")) || [];
    if (oldFiles.length > 0) {
      await supabase.storage.from("avatars").remove(oldFiles.map(f => `${user.id}/${f.name}`));
    }
    setAvatarUrl(null);
    toast.success(lang === "bn" ? "প্রোফাইল পিকচার মুছে ফেলা হয়েছে" : "Profile picture deleted");
    setShowAvatarMenu(false);
  };

  const renderModule = () => {
    switch (activeModule) {
      case "purchase": return <PurchaseModule />;
      case "factories": return <FactoryModule />;
      case "transfers": return <TransferModule />;
      case "production": return <ProductionModule />;
      case "inventory": return <InventoryModule />;
      case "twobytwo_stock": return <TwoByTwoStockModule />;
      case "sales": return <SalesModule />;
      case "guti_stock": return <GutiStockModule />;
      case "party": return <PartyModule />;
      case "cash": return <CashModule />;
      case "ledger": return <LedgerModule />;
      case "challan": return <ChallanModule />;
      case "booking_slip": return <BookingSlipModule />;
      case "company_pad": return <CompanyPadModule />;
      case "profit_loss": return <ProfitLossModule />;
      case "daily_report": return <DailyReportModule />;
      case "buyer_dues": return <BuyerDueModule />;
      case "buyer_profiles": return <BuyerProfileModule />;
      case "suppliers": return <SupplierModule />;
      case "audit_log": return <AuditLogModule />;
      case "analytics": return <AnalyticsModule />;
      case "settings": return <SettingsModule />;
      default: return <DashboardContent />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background" onClick={() => showAvatarMenu && setShowAvatarMenu(false)}>
      {/* Desktop sidebar */}
      <div className="hidden md:block sticky top-0 h-screen">
        <AppSidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full z-50 shadow-xl">
            <AppSidebar
              activeModule={activeModule}
              onModuleChange={setActiveModule}
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-4 right-4 z-50 w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-10 h-14 md:h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            {/* Hamburger menu - mobile only */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h2 className="text-base md:text-lg font-semibold text-foreground">{t(activeModule as any)}</h2>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">Mahin Enterprise — {t("hairProcessingErp")}</p>
            </div>
            {role && (
              <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-primary/15 text-primary border border-primary/20">
                {roleLabels[role]?.[lang] || role}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder={t("search")}
                className="h-9 w-56 rounded-lg border border-border bg-secondary/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <NotificationBell onNavigate={setActiveModule} />
            <div className="relative">
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <button
                onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                className="w-9 h-9 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary/50 transition-all"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-gold flex items-center justify-center text-xs font-bold text-primary-foreground">MH</div>
                )}
              </button>
              {showAvatarMenu && (
                <div className="absolute right-0 top-11 w-44 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                  <button
                    onClick={() => { avatarInputRef.current?.click(); }}
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

        {/* Content */}
        <div className="p-4 md:p-6 max-w-[1400px]">
          {renderModule()}
        </div>
      </main>
    </div>
  );
};

const DashboardContent = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    totalRawStock: 0, activeFactories: 0, totalFactories: 0,
    cashBalance: 0, pendingDues: 0, dueCount: "",
    activeBatches: 0, avgEfficiency: 0, activeBuyers: 0, pendingTransfers: 0,
    activeFactoryNames: "",
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { data: inv }, { data: factories }, { data: cashEntries },
        { data: salesDues }, { data: partyDues },
        { data: batches }, { data: transfers }, { data: buyers },
      ] = await Promise.all([
        supabase.from("inventory").select("stock_kg"),
        supabase.from("factories").select("name, is_active"),
        supabase.from("cash_entries").select("entry_type, amount"),
        supabase.from("sales").select("due_amount").gt("due_amount", 0),
        supabase.from("party_settlements").select("due").gt("due", 0),
        supabase.from("production_batches").select("status, efficiency_pct"),
        supabase.from("transfers").select("status").eq("status", "in_transit"),
        supabase.from("sales").select("buyer_name"),
      ]);

      const totalStock = (inv || []).reduce((s, r) => s + Number(r.stock_kg || 0), 0);
      const activeF = (factories || []).filter(f => f.is_active);
      const cashIn = (cashEntries || []).filter(e => e.entry_type === "in").reduce((s, e) => s + Number(e.amount), 0);
      const cashOut = (cashEntries || []).filter(e => e.entry_type === "out").reduce((s, e) => s + Number(e.amount), 0);
      const salesDueTotal = (salesDues || []).reduce((s, r) => s + Number(r.due_amount || 0), 0);
      const partyDueTotal = (partyDues || []).reduce((s, r) => s + Number(r.due || 0), 0);
      const activeBatches = (batches || []).filter(b => b.status === "in_progress");
      const avgEff = activeBatches.length > 0
        ? Math.round(activeBatches.reduce((s, b) => s + Number(b.efficiency_pct || 0), 0) / activeBatches.length)
        : 0;
      const uniqueBuyers = new Set((buyers || []).map(b => b.buyer_name)).size;

      setStats({
        totalRawStock: Math.round(totalStock),
        activeFactories: activeF.length,
        totalFactories: (factories || []).length,
        cashBalance: cashIn - cashOut,
        pendingDues: salesDueTotal + partyDueTotal,
        dueCount: `${(salesDues || []).length} buyers, ${(partyDues || []).length} party`,
        activeBatches: activeBatches.length,
        avgEfficiency: avgEff,
        activeBuyers: uniqueBuyers,
        pendingTransfers: (transfers || []).length,
        activeFactoryNames: activeF.map(f => f.name).join(", "),
      });
    };
    fetchStats();
  }, []);

  const fmt = (n: number) => "৳" + n.toLocaleString("en-IN");

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatsCard icon={Package} title={t("totalRawStock")} value={`${stats.totalRawStock} KG`} subtitle={t("acrossAllFactories")} variant="gold" />
        <StatsCard icon={Factory} title={t("activeFactories")} value={`${stats.activeFactories} / ${stats.totalFactories}`} subtitle={stats.activeFactoryNames || "—"} variant="info" />
        <StatsCard icon={Wallet} title={t("todaysCashBalance")} value={fmt(stats.cashBalance)} subtitle={t("afterAllTransactions")} variant="success" />
        <StatsCard icon={Users} title={t("pendingDues")} value={fmt(stats.pendingDues)} subtitle={stats.dueCount} variant="default" />
      </div>
      <ProductionFlow />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <GradeInventory />
        <CashSummary />
      </div>
      <RecentTransactions />
      <FactorySummary />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="rounded-xl border border-border bg-gradient-card p-3 md:p-4 text-center">
          <Layers className="w-5 h-5 mx-auto text-primary mb-2" />
          <p className="text-base md:text-lg font-bold text-foreground">{stats.activeBatches}</p>
          <p className="text-[10px] md:text-[11px] text-muted-foreground">{t("activeBatches")}</p>
        </div>
        <div className="rounded-xl border border-border bg-gradient-card p-3 md:p-4 text-center">
          <TrendingUp className="w-5 h-5 mx-auto text-success mb-2" />
          <p className="text-base md:text-lg font-bold text-foreground">{stats.avgEfficiency}%</p>
          <p className="text-[10px] md:text-[11px] text-muted-foreground">{t("avgEfficiency")}</p>
        </div>
        <div className="rounded-xl border border-border bg-gradient-card p-3 md:p-4 text-center">
          <Users className="w-5 h-5 mx-auto text-info mb-2" />
          <p className="text-base md:text-lg font-bold text-foreground">{stats.activeBuyers}</p>
          <p className="text-[10px] md:text-[11px] text-muted-foreground">{t("activeBuyers")}</p>
        </div>
        <div className="rounded-xl border border-border bg-gradient-card p-3 md:p-4 text-center">
          <Package className="w-5 h-5 mx-auto text-warning mb-2" />
          <p className="text-base md:text-lg font-bold text-foreground">{stats.pendingTransfers}</p>
          <p className="text-[10px] md:text-[11px] text-muted-foreground">{t("pendingTransfers")}</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
