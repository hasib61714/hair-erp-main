import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

import AppSidebar from "@/components/AppSidebar";
import AppTopBar from "@/components/layout/AppTopBar";
import MobileSidebarOverlay from "@/components/layout/MobileSidebarOverlay";
import DashboardContent from "@/components/DashboardContent";

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

const ROLE_LABELS: Record<string, Record<string, string>> = {
  admin: { bn: "অ্যাডমিন", en: "Admin" },
  factory_manager: { bn: "ফ্যাক্টরি ম্যানেজার", en: "Factory Manager" },
  accountant: { bn: "হিসাবরক্ষক", en: "Accountant" },
};

const renderModule = (activeModule: string) => {
  switch (activeModule) {
    case "purchase":       return <PurchaseModule />;
    case "factories":      return <FactoryModule />;
    case "transfers":      return <TransferModule />;
    case "production":     return <ProductionModule />;
    case "inventory":      return <InventoryModule />;
    case "twobytwo_stock": return <TwoByTwoStockModule />;
    case "sales":          return <SalesModule />;
    case "guti_stock":     return <GutiStockModule />;
    case "party":          return <PartyModule />;
    case "cash":           return <CashModule />;
    case "ledger":         return <LedgerModule />;
    case "challan":        return <ChallanModule />;
    case "booking_slip":   return <BookingSlipModule />;
    case "company_pad":    return <CompanyPadModule />;
    case "profit_loss":    return <ProfitLossModule />;
    case "daily_report":   return <DailyReportModule />;
    case "buyer_dues":     return <BuyerDueModule />;
    case "buyer_profiles": return <BuyerProfileModule />;
    case "suppliers":      return <SupplierModule />;
    case "audit_log":      return <AuditLogModule />;
    case "analytics":      return <AnalyticsModule />;
    case "settings":       return <SettingsModule />;
    default:               return <DashboardContent />;
  }
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
