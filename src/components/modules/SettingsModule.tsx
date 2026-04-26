import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Building2, Users, Shield, ImagePlus, Save, MapPin, Phone, Mail, Trash2, UserPlus, Loader2, PenTool } from "lucide-react";
import { toast } from "sonner";
import { useCompanySettings, notifyCompanySettingsChanged } from "@/hooks/useCompanySettings";
import { getModulesForRole } from "@/lib/roleAccess";
import type { Database } from "@/integrations/supabase/types";

type RolePerm = { id: string; role: string; module: string; can_edit: boolean; can_delete: boolean; can_print: boolean; can_download: boolean };
type PermToggleField = "can_edit" | "can_delete" | "can_print" | "can_download";

type UserWithRole = {
  user_id: string;
  full_name: string | null;
  role: string;
  role_id: string;
};

const moduleLabels: Record<string, { bn: string; en: string }> = {
  dashboard: { bn: "ড্যাশবোর্ড", en: "Dashboard" },
  purchase: { bn: "ক্রয়", en: "Purchase" },
  factories: { bn: "কারখানা", en: "Factories" },
  transfers: { bn: "ট্রান্সফার", en: "Transfers" },
  production: { bn: "উৎপাদন", en: "Production" },
  inventory: { bn: "ইনভেন্টরি", en: "Inventory" },
  twobytwo_stock: { bn: "টু বাই টু স্টক", en: "2x2 Stock" },
  guti_stock: { bn: "গুটি স্টক", en: "Guti Stock" },
  sales: { bn: "বিক্রয়", en: "Sales" },
  party: { bn: "পার্টি", en: "Party" },
  cash: { bn: "ক্যাশ", en: "Cash" },
  challan: { bn: "চালান", en: "Challan" },
  booking: { bn: "বুকিং", en: "Booking" },
  analytics: { bn: "বিশ্লেষণ", en: "Analytics" },
  settings: { bn: "সেটিংস", en: "Settings" },
};

const SettingsModule = () => {
  const { t, lang, setLang } = useLanguage();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { settings, loading: settingsLoading, refetch } = useCompanySettings();

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [perms, setPerms] = useState<RolePerm[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [uploadingSig, setUploadingSig] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  // New user form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<string>("accountant");
  const [creatingUser, setCreatingUser] = useState(false);

  // Company info form
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [tagline, setTagline] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    if (!settingsLoading && settings) {
      setCompanyName(settings.company_name);
      setCompanyAddress(settings.company_address);
      setCompanyPhone(settings.company_phone);
      setCompanyEmail(settings.company_email);
      setTagline(settings.tagline);
    }
  }, [settingsLoading, settings]);

  const fetchUsers = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name"),
      supabase.from("user_roles").select("id, user_id, role"),
    ]);
    if (profiles && roles) {
      const merged = roles.map(r => {
        const profile = profiles.find(p => p.user_id === r.user_id);
        return { user_id: r.user_id, full_name: profile?.full_name || null, role: r.role, role_id: r.id };
      });
      setUsers(merged);
    }
    setLoadingUsers(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (isAdmin) { fetchUsers(); fetchPerms(); } }, [isAdmin]);

  const fetchPerms = async () => {
    setLoadingPerms(true);
    const { data } = await supabase.from("role_permissions").select("*");
    setPerms((data || []) as unknown as RolePerm[]);
    setLoadingPerms(false);
  };

  const togglePerm = async (permId: string, field: PermToggleField, val: boolean) => {
    const { error } = await supabase.from("role_permissions").update({ [field]: val } as Partial<Record<PermToggleField, boolean>>).eq("id", permId);
    if (error) { toast.error(error.message); return; }
    toast.success(t("saved"));
    fetchPerms();
  };

  // Logo
  const fetchLogo = async () => {
    const { data } = await supabase.storage.from("company-assets").list("", { limit: 20 });
    const logoFile = data?.find(f => f.name.startsWith("logo"));
    if (logoFile) {
      const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(logoFile.name);
      setLogoUrl(urlData.publicUrl + "?t=" + Date.now());
    }
    const sigFile = data?.find(f => f.name.startsWith("signature"));
    if (sigFile) {
      const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(sigFile.name);
      setSignatureUrl(urlData.publicUrl + "?t=" + Date.now());
    }
  };
  useEffect(() => { fetchLogo(); }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const ext = file.name.split(".").pop();
    const fileName = `logo.${ext}`;
    const { data: existing } = await supabase.storage.from("company-assets").list("", { limit: 10 });
    const oldLogos = existing?.filter(f => f.name.startsWith("logo")) || [];
    if (oldLogos.length > 0) {
      await supabase.storage.from("company-assets").remove(oldLogos.map(f => f.name));
    }
    const { error } = await supabase.storage.from("company-assets").upload(fileName, file, { upsert: true });
    setUploadingLogo(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("logoUploaded"));
    fetchLogo();
    notifyCompanySettingsChanged();
  };

  const handleLogoDelete = async () => {
    const { data: existing } = await supabase.storage.from("company-assets").list("", { limit: 10 });
    const oldLogos = existing?.filter(f => f.name.startsWith("logo")) || [];
    if (oldLogos.length > 0) {
      await supabase.storage.from("company-assets").remove(oldLogos.map(f => f.name));
    }
    setLogoUrl(null);
    toast.success(lang === "bn" ? "লোগো মুছে ফেলা হয়েছে" : "Logo deleted");
    notifyCompanySettingsChanged();
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSig(true);
    const ext = file.name.split(".").pop();
    const fileName = `signature.${ext}`;
    const { data: existing } = await supabase.storage.from("company-assets").list("", { limit: 20 });
    const oldSigs = existing?.filter(f => f.name.startsWith("signature")) || [];
    if (oldSigs.length > 0) {
      await supabase.storage.from("company-assets").remove(oldSigs.map(f => f.name));
    }
    const { error } = await supabase.storage.from("company-assets").upload(fileName, file, { upsert: true });
    setUploadingSig(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "সিগনেচার আপলোড হয়েছে" : "Signature uploaded");
    fetchLogo();
    notifyCompanySettingsChanged();
  };

  const handleSignatureDelete = async () => {
    const { data: existing } = await supabase.storage.from("company-assets").list("", { limit: 20 });
    const oldSigs = existing?.filter(f => f.name.startsWith("signature")) || [];
    if (oldSigs.length > 0) {
      await supabase.storage.from("company-assets").remove(oldSigs.map(f => f.name));
    }
    setSignatureUrl(null);
    toast.success(lang === "bn" ? "সিগনেচার মুছে ফেলা হয়েছে" : "Signature deleted");
    notifyCompanySettingsChanged();
  };

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    const { error } = await supabase.from("company_settings").update({
      company_name: companyName,
      company_address: companyAddress,
      company_phone: companyPhone,
      company_email: companyEmail,
      tagline: tagline,
    }).eq("id", settings.id);
    setSavingCompany(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("saved"));
    refetch();
  };

  const handleRoleChange = async (roleId: string, newRole: string) => {
    const { error } = await supabase.from("user_roles").update({ role: newRole as Database["public"]["Enums"]["app_role"] }).eq("id", roleId);
    if (error) { toast.error(error.message); return; }
    toast.success(t("roleUpdated"));
    fetchUsers();
  };

  const getRoleModules = (r: string) => getModulesForRole(r as Database["public"]["Enums"]["app_role"]);

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) return;
    setCreatingUser(true);
    try {
      // Use a separate client so admin session is not replaced
      const { createClient } = await import("@supabase/supabase-js");
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const { data, error: signUpError } = await tempClient.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: { data: { full_name: newFullName } },
      });
      if (signUpError) throw signUpError;
      if (!data.user) throw new Error(t("userCreateFailed"));

      const newUserId = data.user.id;

      // Update role from default 'accountant' to selected role
      if (newRole !== "accountant") {
        await supabase
          .from("user_roles")
          .update({ role: newRole as "admin" | "factory_manager" | "accountant" })
          .eq("user_id", newUserId);
      }

      toast.success(t("userCreated"));
      setNewEmail(""); setNewPassword(""); setNewFullName(""); setNewRole("accountant");
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("userCreateFailed"));
    }
    setCreatingUser(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t("settingsModule")}</h2>
        <p className="text-xs text-muted-foreground">{t("generalSettings")}</p>
      </div>

      {/* Language */}
      <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t("language")}</h3>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => setLang("bn")} className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${lang === "bn" ? "bg-gradient-gold text-primary-foreground shadow-gold" : "border border-border text-muted-foreground hover:bg-secondary"}`}>
            🇧🇩 বাংলা
          </button>
          <button type="button" onClick={() => setLang("en")} className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${lang === "en" ? "bg-gradient-gold text-primary-foreground shadow-gold" : "border border-border text-muted-foreground hover:bg-secondary"}`}>
            🇬🇧 English
          </button>
        </div>
      </div>

      {/* Company Logo */}
      <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <ImagePlus className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t("companyLogo")}</h3>
        </div>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt="Company Logo" className="w-20 h-20 rounded-lg object-contain border border-border bg-secondary/30 p-1" />
          ) : (
            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/30">
              <ImagePlus className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" aria-label="Upload company logo" />
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo} className="px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {uploadingLogo ? t("loading") : t("uploadLogo")}
              </button>
              {logoUrl && (
                <button type="button" onClick={handleLogoDelete} className="px-3 py-2 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" />
                  {lang === "bn" ? "মুছুন" : "Delete"}
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG — Max 2MB</p>
          </div>
        </div>
      </div>

      {/* Owner Signature */}
      <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <PenTool className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{lang === "bn" ? "মালিকের সিগনেচার" : "Owner Signature"}</h3>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">{lang === "bn" ? "প্রিন্টে মালিকের সিগনেচার দেখানো হবে।" : "This signature will appear on all printed documents."}</p>
        <div className="flex items-center gap-4">
          {signatureUrl ? (
            <img src={signatureUrl} alt="Signature" className="h-16 max-w-[200px] rounded-lg object-contain border border-border bg-white p-1" />
          ) : (
            <div className="h-16 w-40 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/30">
              <PenTool className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <input ref={sigInputRef} type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" aria-label="Upload owner signature" />
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => sigInputRef.current?.click()} disabled={uploadingSig} className="px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {uploadingSig ? t("loading") : lang === "bn" ? "সিগনেচার আপলোড" : "Upload Signature"}
              </button>
              {signatureUrl && (
                <button type="button" onClick={handleSignatureDelete} className="px-3 py-2 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" />
                  {lang === "bn" ? "মুছুন" : "Delete"}
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG — {lang === "bn" ? "স্বচ্ছ ব্যাকগ্রাউন্ড সুপারিশ করা হয়" : "Transparent background recommended"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t("companyInfo")}</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("companyName")}</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} title={t("companyName")} placeholder={lang === "bn" ? "কোম্পানির নাম" : "Company name"} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{t("companyAddress")}</label>
            <input value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} title={t("companyAddress")} placeholder={lang === "bn" ? "ঠিকানা লিখুন" : "Enter address"} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Phone className="w-3 h-3" />{t("phone")}</label>
              <input value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Mail className="w-3 h-3" />{t("email")}</label>
              <input value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} placeholder="info@example.com" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("tagline")}</label>
            <input value={tagline} onChange={e => setTagline(e.target.value)} title={t("tagline")} placeholder={lang === "bn" ? "ট্যাগলাইন লিখুন" : "Enter tagline"} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <button type="button" onClick={handleSaveCompany} disabled={savingCompany} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            <Save className="w-4 h-4" />{savingCompany ? t("loading") : t("save")}
          </button>
        </div>
      </div>

      {/* Add New User - Admin Only */}
      {isAdmin && (
        <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{t("addUser")}</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("fullName")}</label>
              <input value={newFullName} onChange={e => setNewFullName(e.target.value)} placeholder={lang === "bn" ? "নাম লিখুন" : "Enter name"} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("email")}</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="user@example.com" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("password")}</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" minLength={6} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("selectRole")}</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)} aria-label={t("selectRole")} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="admin">{t("admin")}</option>
                <option value="factory_manager">{t("factoryManager")}</option>
                <option value="accountant">{t("accountant")}</option>
              </select>
            </div>
            <button type="button" onClick={handleCreateUser} disabled={creatingUser || !newEmail || !newPassword} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {creatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {creatingUser ? t("loading") : t("createUser")}
            </button>
          </div>
        </div>
      )}

      {/* User Role Management - Admin Only */}
      {isAdmin && (
        <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{t("userManagement")}</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4">{t("userAccessDesc")}</p>
          {loadingUsers ? <p className="text-xs text-muted-foreground">{t("loading")}</p> : users.length === 0 ? <p className="text-xs text-muted-foreground">{t("noData")}</p> : (
            <div className="space-y-4">
              {users.map(u => {
                const modules = getRoleModules(u.role);
                return (
                  <div key={u.role_id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-medium text-foreground">{u.full_name || u.user_id.slice(0, 8)}</p>
                          <p className="text-[11px] text-muted-foreground">{u.user_id.slice(0, 8)}...</p>
                        </div>
                      </div>
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.role_id, e.target.value)}
                        aria-label={lang === "bn" ? "রোল পরিবর্তন" : "Change role"}
                        className="h-8 rounded-lg border border-border bg-secondary/50 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="admin">{t("admin")}</option>
                        <option value="factory_manager">{t("factoryManager")}</option>
                        <option value="accountant">{t("accountant")}</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {modules.map(m => (
                        <span key={m} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                          {moduleLabels[m]?.[lang] || m}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Permission Management - Admin Only */}
      {isAdmin && (
        <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{lang === "bn" ? "পারমিশন ম্যানেজমেন্ট" : "Permission Management"}</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4">
            {lang === "bn" ? "প্রতিটি রোলের জন্য মডিউল অনুযায়ী এডিট, ডিলিট, প্রিন্ট ও ডাউনলোড অনুমতি টগল করুন।" : "Toggle edit, delete, print & download permissions per module for each role."}
          </p>
          {loadingPerms ? <p className="text-xs text-muted-foreground">{t("loading")}</p> : (
            <div className="space-y-6">
              {(["factory_manager", "accountant"] as const).map(r => {
                const rolePerms = perms.filter(p => p.role === r);
                const roleLabel = r === "factory_manager" ? t("factoryManager") : t("accountant");
                return (
                  <div key={r}>
                    <h4 className="text-xs font-semibold text-foreground mb-2 px-1">{roleLabel}</h4>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-secondary/50">
                             <th className="text-left px-3 py-2 font-medium text-muted-foreground">{lang === "bn" ? "মডিউল" : "Module"}</th>
                            <th className="text-center px-3 py-2 font-medium text-muted-foreground">{lang === "bn" ? "এডিট" : "Edit"}</th>
                            <th className="text-center px-3 py-2 font-medium text-muted-foreground">{lang === "bn" ? "ডিলিট" : "Delete"}</th>
                            <th className="text-center px-3 py-2 font-medium text-muted-foreground">{lang === "bn" ? "প্রিন্ট" : "Print"}</th>
                            <th className="text-center px-3 py-2 font-medium text-muted-foreground">{lang === "bn" ? "ডাউনলোড" : "Download"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rolePerms.map(p => (
                            <tr key={p.id} className="border-t border-border/50">
                              <td className="px-3 py-2 text-foreground">{moduleLabels[p.module]?.[lang] || p.module}</td>
                              <td className="px-3 py-2 text-center">
                                <button type="button" aria-label="Toggle edit" onClick={() => togglePerm(p.id, "can_edit", !p.can_edit)}
                                  className={["w-8 h-5 rounded-full transition-colors relative", p.can_edit ? "bg-primary" : "bg-muted"].join(" ")}>
                                  <span className={["block w-3.5 h-3.5 rounded-full bg-background shadow absolute top-0.5 transition-transform", p.can_edit ? "translate-x-3.5" : "translate-x-0.5"].join(" ")} />
                                </button>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button type="button" aria-label="Toggle delete" onClick={() => togglePerm(p.id, "can_delete", !p.can_delete)}
                                  className={["w-8 h-5 rounded-full transition-colors relative", p.can_delete ? "bg-destructive" : "bg-muted"].join(" ")}>
                                  <span className={["block w-3.5 h-3.5 rounded-full bg-background shadow absolute top-0.5 transition-transform", p.can_delete ? "translate-x-3.5" : "translate-x-0.5"].join(" ")} />
                                </button>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button type="button" aria-label="Toggle print" onClick={() => togglePerm(p.id, "can_print", !p.can_print)}
                                  className={["w-8 h-5 rounded-full transition-colors relative", p.can_print ? "bg-primary" : "bg-muted"].join(" ")}>
                                  <span className={["block w-3.5 h-3.5 rounded-full bg-background shadow absolute top-0.5 transition-transform", p.can_print ? "translate-x-3.5" : "translate-x-0.5"].join(" ")} />
                                </button>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button type="button" aria-label="Toggle download" onClick={() => togglePerm(p.id, "can_download", !p.can_download)}
                                  className={["w-8 h-5 rounded-full transition-colors relative", p.can_download ? "bg-primary" : "bg-muted"].join(" ")}>
                                  <span className={["block w-3.5 h-3.5 rounded-full bg-background shadow absolute top-0.5 transition-transform", p.can_download ? "translate-x-3.5" : "translate-x-0.5"].join(" ")} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {rolePerms.length === 0 && (
                            <tr><td colSpan={5} className="px-3 py-3 text-center text-muted-foreground">{t("noData")}</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!isAdmin && (
        <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-2">{t("userManagement")}</h3>
          <p className="text-xs text-muted-foreground">Only admins can manage user roles.</p>
        </div>
      )}

      {/* Developer Credit */}
      <div className="rounded-xl border border-border/40 p-5 bg-gradient-card shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">
              {lang === "bn" ? "ডেভেলপার" : "Developed by"}
            </p>
            <p className="text-sm font-semibold text-foreground">Md. Hasibul Hasan</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {lang === "bn" ? "পূর্ণ-স্ট্যাক ওয়েব ডেভেলপার" : "Full-Stack Web Developer"}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
              HairHub ERP v1.0
            </span>
            <p className="text-[10px] text-muted-foreground mt-1.5">© {new Date().getFullYear()} Mahin Enterprise</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModule;
