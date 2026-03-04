type AppRole = "admin" | "factory_manager" | "accountant";

// Define which modules each role can access
const roleModules: Record<AppRole, string[]> = {
  admin: [
    "dashboard", "purchase", "factories", "transfers", "production",
    "inventory", "twobytwo_stock", "guti_stock", "sales", "party", "cash", "ledger", "challan", "booking_slip",
    "analytics", "profit_loss", "daily_report", "buyer_dues", "buyer_profiles", "suppliers", "audit_log", "company_pad", "settings",
  ],
  factory_manager: [
    "dashboard", "factories", "transfers", "production",
    "inventory", "twobytwo_stock", "guti_stock", "challan", "booking_slip",
  ],
  accountant: [
    "dashboard", "purchase", "sales", "cash", "ledger", "challan", "analytics",
    "profit_loss", "daily_report", "buyer_dues", "buyer_profiles", "suppliers",
  ],
};

export const getModulesForRole = (role: AppRole | null): string[] => {
  if (!role) return ["dashboard"];
  return roleModules[role] || ["dashboard"];
};

export const canAccessModule = (role: AppRole | null, moduleId: string): boolean => {
  return getModulesForRole(role).includes(moduleId);
};
