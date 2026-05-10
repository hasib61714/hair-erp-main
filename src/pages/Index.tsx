import { useState, useEffect, lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

import AppSidebar from "@/components/AppSidebar";
import AppTopBar from "@/components/layout/AppTopBar";
import MobileSidebarOverlay from "@/components/layout/MobileSidebarOverlay";
import DashboardContent from "@/components/DashboardContent";
import { ErrorBoundary } from "@/components/ui/error-boundary";

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
  admin:           { bn: "অ্যাডমিন",           en: "Admin" },
  factory_manager: { bn: "ফ্যাক্টরি ম্যানেজার", en: "Factory Manager" },
  accountant:      { bn: "হিসাবরক্ষক",          en: "Accountant" },
};

// Loading skeleton shown while a lazy module chunk is being fetched
const ModuleFallback = () => (
  <div className="page-container animate-fade-in">
    <div className="flex items-center gap-3 mb-6">
      <div className="skeleton w-9 h-9 rounded-lg" />
      <div className="space-y-1.5">
        <div className="skeleton w-40 h-5 rounded" />
        <div className="skeleton w-24 h-3 rounded" />
      </div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="rounded-xl border border-border p-5 bg-card space-y-3">
          <div className="skeleton w-10 h-10 rounded-lg" />
          <div className="skeleton w-20 h-4 rounded" />
          <div className="skeleton w-28 h-7 rounded" />
        </div>
      ))}
    </div>
    <div className="skeleton w-full h-48 rounded-xl" />
  </div>
);

const MODULE_MAP: Record<string, React.ReactNode> = {
  purchase:       <PurchaseModule />,
  factories:      <FactoryModule />,
  transfers:      <TransferModule />,
  production:     <ProductionModule />,
  inventory:      <InventoryModule />,
  twobytwo_stock: <TwoByTwoStockModule />,
  sales:          <SalesModule />,
  guti_stock:     <GutiStockModule />,
  party:          <PartyModule />,
  cash:           <CashModule />,
  ledger:         <LedgerModule />,
  challan:        <ChallanModule />,
  booking_slip:   <BookingSlipModule />,
  company_pad:    <CompanyPadModule />,
  profit_loss:    <ProfitLossModule />,
  daily_report:   <DailyReportModule />,
  buyer_dues:     <BuyerDueModule />,
  buyer_profiles: <BuyerProfileModule />,
  suppliers:      <SupplierModule />,
  audit_log:      <AuditLogModule />,
  analytics:      <AnalyticsModule />,
  settings:       <SettingsModule />,
};

const renderModule = (activeModule: string) => {
  const content = MODULE_MAP[activeModule] ?? <DashboardContent />;
  return (
    <ErrorBoundary>
      <Suspense fallback={<ModuleFallback />}>{content}</Suspense>
    </ErrorBoundary>
  );
};

const Index = () => {
  const [activeModule,  setActiveModule]  = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [welcomeShown,  setWelcomeShown]  = useState(false);

  const { user, role } = useAuth();
  const { lang } = useLanguage();

  useEffect(() => {
    if (user && role && !welcomeShown) {
      const roleName = ROLE_LABELS[role]?.[lang] ?? role;
      toast.success(
        lang === "bn"
          ? `স্বাগতম! আপনি ${roleName} হিসেবে লগইন করেছেন`
          : `Welcome! Logged in as ${roleName}`
      );
      setWelcomeShown(true);
    }
  }, [user, role, lang, welcomeShown]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block sticky top-0 h-screen shrink-0">
        <AppSidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      </div>

      {/* Mobile sidebar overlay */}
      <MobileSidebarOverlay
        isOpen={mobileMenuOpen}
        activeModule={activeModule}
        onModuleChange={module => { setActiveModule(module); setMobileMenuOpen(false); }}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <AppTopBar
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <div className="flex-1 p-4 md:p-6 max-w-[1440px] w-full mx-auto">
          {renderModule(activeModule)}
        </div>
      </main>
    </div>
  );
};

export default Index;
