import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Mail, Lock, LogIn, Loader2, ArrowLeft, KeyRound, UserPlus, User, Eye, EyeOff } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { cn } from "@/lib/utils";

// ── Reusable icon-prefixed input ───────────────────────────────────
const IconInput = ({
  icon: Icon,
  right,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ComponentType<{ className?: string }>;
  right?: React.ReactNode;
}) => (
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
    <input {...props} className={cn("input-base pl-10", right ? "pr-10" : "", props.className)} />
    {right && (
      <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>
    )}
  </div>
);

// ── Auth page ──────────────────────────────────────────────────────
const Auth = () => {
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [fullName,     setFullName]     = useState("");
  const [loading,      setLoading]      = useState(false);
  const [view,         setView]         = useState<"login" | "signup" | "forgot">("login");
  const [resetEmail,   setResetEmail]   = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useLanguage();
  const { settings } = useCompanySettings();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success(t("loginSuccess"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("error"));
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
      toast.success(t("signupSuccess"), { description: t("signupSuccessDesc") });
      setView("login");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("error"));
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
      toast.success(t("resetPasswordSent"));
      setView("login");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  };

  const pwToggle = (
    <button
      type="button"
      aria-label={showPassword ? "Hide password" : "Show password"}
      onClick={() => setShowPassword(v => !v)}
      className="text-muted-foreground hover:text-foreground transition-colors"
    >
      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[400px] animate-slide-up">

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-gold shadow-gold flex items-center justify-center mx-auto mb-4 overflow-hidden">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-lg font-extrabold text-primary-foreground">MH</span>
            )}
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {settings.company_name || "Mahin Enterprise"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {settings.tagline || t("hairProcessingErp")}
          </p>
        </div>

        {/* Form card */}
        <div className="card-base p-7 shadow-md">
          <h2 className="text-[15px] font-semibold text-foreground mb-5">
            {view === "forgot"
              ? t("resetPassword")
              : view === "signup"
              ? t("createAccount")
              : t("login")}
          </h2>

          {/* ── Forgot password ── */}
          {view === "forgot" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-xs text-muted-foreground">{t("enterEmailForReset")}</p>
              <div>
                <label className="text-label mb-1.5 block">{t("email")}</label>
                <IconInput
                  icon={Mail}
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full h-10">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {t("resetPassword")}
              </button>
              <button type="button" onClick={() => setView("login")} className="btn-ghost w-full h-9 text-sm">
                <ArrowLeft className="w-4 h-4" />{t("backToLogin")}
              </button>
            </form>
          )}

          {/* ── Sign up ── */}
          {view === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="text-label mb-1.5 block">{t("fullName")}</label>
                <IconInput
                  icon={User}
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder={t("fullName")}
                  required
                />
              </div>
              <div>
                <label className="text-label mb-1.5 block">{t("email")}</label>
                <IconInput
                  icon={Mail}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div>
                <label className="text-label mb-1.5 block">{t("password")}</label>
                <IconInput
                  icon={Lock}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  right={pwToggle}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full h-10">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {t("createAccount")}
              </button>
              <button type="button" onClick={() => setView("login")} className="btn-ghost w-full h-9 text-sm">
                <ArrowLeft className="w-4 h-4" />{t("backToLogin")}
              </button>
            </form>
          )}

          {/* ── Login ── */}
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-label mb-1.5 block">{t("email")}</label>
                <IconInput
                  icon={Mail}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div>
                <label className="text-label mb-1.5 block">{t("password")}</label>
                <IconInput
                  icon={Lock}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  right={pwToggle}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full h-10">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {t("login")}
              </button>
              <button
                type="button"
                onClick={() => setView("forgot")}
                className="w-full text-xs text-primary hover:underline text-center"
              >
                {t("forgotPassword")}
              </button>
            </form>
          )}

          {view === "login" && (
            <p className="mt-5 pt-4 border-t border-border text-center text-[11px] text-muted-foreground">
              {t("noAccount")}{" "}
              <button
                type="button"
                onClick={() => setView("signup")}
                className="text-primary hover:underline font-semibold"
              >
                {t("createAccount")}
              </button>
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground/40 mt-6">
          &copy; {new Date().getFullYear()} {settings.company_name || "Mahin Enterprise"}
        </p>
      </div>
    </div>
  );
};

export default Auth;
