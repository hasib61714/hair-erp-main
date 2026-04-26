import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CompanySettings = {
  id: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  tagline: string;
  logo_url: string;
  signature_url: string;
};

const defaultSettings: CompanySettings = {
  id: "",
  company_name: "Mahin Enterprise",
  company_address: "Head Office: Dhaka, Bangladesh",
  company_phone: "",
  company_email: "",
  tagline: "Hair Processing & Trading | Est. 2011",
  logo_url: "",
  signature_url: "",
};

export const useCompanySettings = () => {
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const { data } = await supabase.from("company_settings").select("*").limit(1).single();
    
    let logoUrl = "";
    let signatureUrl = "";
    const { data: files } = await supabase.storage.from("company-assets").list("", { limit: 20 });
    const logoFile = files?.find(f => f.name.startsWith("logo"));
    if (logoFile) {
      const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(logoFile.name);
      logoUrl = urlData.publicUrl + "?t=" + Date.now();
    }
    const sigFile = files?.find(f => f.name.startsWith("signature"));
    if (sigFile) {
      const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(sigFile.name);
      signatureUrl = urlData.publicUrl + "?t=" + Date.now();
    }

    if (data) {
      setSettings({ ...(data as unknown as CompanySettings), logo_url: logoUrl, signature_url: signatureUrl });
    } else {
      setSettings({ ...defaultSettings, logo_url: logoUrl, signature_url: signatureUrl });
    }
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  // Listen for logo changes from any component
  useEffect(() => {
    const handler = () => fetchSettings();
    window.addEventListener("company-settings-changed", handler);
    return () => window.removeEventListener("company-settings-changed", handler);
  }, []);

  return { settings, loading, refetch: fetchSettings };
};

// Call this after logo upload/delete to sync all components
export const notifyCompanySettingsChanged = () => {
  window.dispatchEvent(new Event("company-settings-changed"));
};
