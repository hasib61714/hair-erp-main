import { useState, useEffect, lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

import AppSidebar from "@/components/AppSidebar";
import AppTopBar from "@/components/layout/AppTopBar";
import MobileSidebarOverlay from "@/components/layout/MobileSidebarOverlay";
import DashboardContent from "@/components/DashboardContent";

const PurchaseModule     = lazy(() => import("@/components/modules/PurchaseModule"));
const ProductionModule   = lazy(() => import("@/components/modules/ProductionModule"));
const InventoryModule    = lazy(() => import("@/components/modules/InventoryModule"));
const TwoByTwoStockModule= lazy(() => import("@/components/modules/TwoByTwoStockModule"));
const SalesModule        = lazy(() => import("@/components/modules/SalesModule"));
const GutiStockModule    = lazy(() => import("@/components/modules/GutiStockModule"));
const LedgerModule       = lazy(() => import("@/components/modules/LedgerModule"));
const PartyModule        = lazy(() => import("@/components/modules/PartyModule"));
const CashModule         = lazy(() => import("@/components/modules/CashModule"));
const TransferModule     = lazy(() => import("@/components/modules/TransferModule"));
const FactoryModule      = lazy(() => import("@/components/modules/FactoryModule"));
const ChallanModule      = lazy(() => import("@/components/modules/ChallanModule"));
const AnalyticsModule    = lazy(() => import("@/components/modules/AnalyticsModule"));
const BookingSlipModule  = lazy(() => import("@/components/modules/BookingSlipModule"));
const CompanyPadModule   = lazy(() => import("@/components/modules/CompanyPadModule"));
const ProfitLossModule   = lazy(() => import("@/components/modules/ProfitLossModule"));
const DailyReportModule  = lazy(() => import("@/components/modules/DailyReportModule"));
const BuyerDueModule     = lazy(() => import("@/components/modules/BuyerDueModule"));
const BuyerProfileModule = lazy(() => import("@/components/modules/BuyerProfileModule"));
const SupplierModule     = lazy(() => import("@/components/modules/SupplierModule"));
const AuditLogModule     = lazy(() => import("@/components/modules/AuditLogModule"));
const SettingsModule     = lazy(() => import("@/components/modules/SettingsModule"));

const ROLE_LABELS: Record<string, Record<string, string>> = {
  admin: { bn: "অ্যাডমিন", en: "Admin" },
  factory_manager: { bn: "ফ্যাক্টরি ম্যানেজার", en: "Factory Manager" },
  accountant: { bn: "হিসাবরক্ষক", en: "Accountant" },
};

const ModuleFallback = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-8 h-8 rounded-xl bg-gradient-gold animate-pulse" />
  </div>
);

const renderModule = (activeModule: string) => {
  let content: React.ReactNode;
  switch (activeModule) {
    case "purchase":       content = <PurchaseModule />;      break;
    case "factories":      content = <FactoryModule />;       break;
    case "transfers":      content = <TransferModule />;      break;
    case "production":     content = <ProductionModule />;    break;
    case "inventory":      content = <InventoryModule />;     break;
    case "twobytwo_stock": content = <TwoByTwoStockModule />; break;
    case "sales":          content = <SalesModule />;         break;
    case "guti_stock":     content = <GutiStockModule />;     break;
    case "party":          content = <PartyModule />;         break;
    case "cash":           content = <CashModule />;          break;
    case "ledger":         content = <LedgerModule />;        break;
    case "challan":        content = <ChallanModule />;       break;
    case "booking_slip":   content = <BookingSlipModule />;   break;
    case "company_pad":    content = <CompanyPadModule />;    break;
    case "profit_loss":    content = <ProfitLossModule />;    break;
    case "daily_report":   content = <DailyReportModule />;   break;
    case "buyer_dues":     content = <BuyerDueModule />;      break;
    case "buyer_profiles": content = <BuyerProfileModule />;  break;
    case "suppliers":      content = <SupplierModule />;      break;
    case "audit_log":      content = <AuditLogModule />;      break;
    case "analytics":      content = <AnalyticsModule />;     break;
    case "settings":       content = <SettingsModule />;      break;
    default:               content = <DashboardContent />;
  }
  return <Suspense fallback={<ModuleFallback />}>{content}</Suspense>;
};

const Index = () => {
  const [activeModule, setActiveModule] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [welcomeShown, setWelcomeShown] = useState(false);

  const { user, role } = useAuth();
  const { lang } = useLanguage();

  useEffect(() => {
    if (user && role && !welcomeShown) {
      const roleName = ROLE_LABELS[role]?.[lang] ?? role;
      toast.success(
        lang === "bn"
          ? `স্বাগতম! আপনি ${roleName} হিসেবে লগইন করেছেন`
          : `Welcome! You are logged in as ${roleName}`
      );
      setWelcomeShown(true);
    }
  }, [user, role, lang, welcomeShown]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block sticky top-0 h-screen">
        <AppSidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      </div>

      {/* Mobile sidebar */}
      <MobileSidebarOverlay
        isOpen={mobileMenuOpen}
        activeModule={activeModule}
        onModuleChange={module => { setActiveModule(module); setMobileMenuOpen(false); }}
        onClose={() => setMobileMenuOpen(false)}
      />

      <main className="flex-1 overflow-y-auto min-w-0">
        <AppTopBar
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <div className="p-4 md:p-6 max-w-[1400px]">
          {renderModule(activeModule)}
        </div>
      </main>
    </div>
  );
};

export default Index;
