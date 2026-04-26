import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { Mail, Lock, LogIn, Loader2, ArrowLeft, KeyRound, UserPlus, User } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"login" | "signup" | "forgot">("login");
  const [resetEmail, setResetEmail] = useState("");
  const { t } = useLanguage();
  const { settings } = useCompanySettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: t("loginSuccess") });
    } catch (error: any) {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      toast({
        title: t("signupSuccess"),
        description: t("signupSuccessDesc"),
      });
      setView("login");
    } catch (error: any) {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + "/update-password",
      });
      if (error) throw error;
      toast({ title: t("resetPasswordSent") });
      setView("login");
    } catch (error: any) {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-gold flex items-center justify-center mx-auto mb-4 overflow-hidden">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xl font-bold text-primary-foreground">MH</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{settings.company_name || "Mahin Enterprise"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{settings.tagline || t("hairProcessingErp")}</p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-border bg-gradient-card p-8 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-6">
            {view === "forgot" ? t("resetPassword") : view === "signup" ? t("createAccount") : t("login")}
          </h2>

          {view === "forgot" ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-xs text-muted-foreground mb-4">{t("enterEmailForReset")}</p>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("email")}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                    className="w-full h-10 rounded-lg border border-border bg-secondary/50 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-gradient-gold text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><KeyRound className="w-4 h-4" />{t("resetPassword")}</>
                )}
              </button>
              <button
                type="button"
                onClick={() => setView("login")}
                className="w-full h-9 rounded-lg border border-border text-sm text-muted-foreground flex items-center justify-center gap-2 hover:bg-secondary/50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />{t("backToLogin")}
              </button>
            </form>
          ) : view === "signup" ? (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("fullName")}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("fullName")}
                    required
                    className="w-full h-10 rounded-lg border border-border bg-secondary/50 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("email")}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                    className="w-full h-10 rounded-lg border border-border bg-secondary/50 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("password")}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full h-10 rounded-lg border border-border bg-secondary/50 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-gradient-gold text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><UserPlus className="w-4 h-4" />{t("createAccount")}</>
                )}
              </button>
              <button
                type="button"
                onClick={() => setView("login")}
                className="w-full h-9 rounded-lg border border-border text-sm text-muted-foreground flex items-center justify-center gap-2 hover:bg-secondary/50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />{t("backToLogin")}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("email")}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                    className="w-full h-10 rounded-lg border border-border bg-secondary/50 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("password")}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full h-10 rounded-lg border border-border bg-secondary/50 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-gradient-gold text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><LogIn className="w-4 h-4" />{t("login")}</>
                )}
              </button>

              <button
                type="button"
                onClick={() => setView("forgot")}
                className="w-full text-xs text-primary hover:underline text-center mt-1"
              >
                {t("forgotPassword")}
              </button>
            </form>
          )}

          {view === "login" && (
            <p className="mt-5 text-center text-[11px] text-muted-foreground">
              {t("noAccount")}{" "}
              <button
                type="button"
                onClick={() => setView("signup")}
                className="text-primary hover:underline font-medium"
              >
                {t("createAccount")}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;