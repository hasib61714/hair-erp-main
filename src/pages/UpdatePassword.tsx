import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Lock, Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const UpdatePassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const navigate = useNavigate();
  const { settings } = useCompanySettings();

  // Supabase puts access_token in the URL hash — wait for auth session to be set
  useEffect(() => {
    // 1. Check if URL hash has type=recovery (token already in URL)
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setReady(true);
      return;
    }

    // 2. Check existing session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    // 3. Listen for PASSWORD_RECOVERY event as fallback
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "পাসওয়ার্ড মিলছে না", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে" });
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-gold flex items-center justify-center mx-auto mb-4 overflow-hidden">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xl font-bold text-primary-foreground">MH</span>
            )}
          </div>
          <h1 className="text-xl font-bold text-foreground">{settings.company_name || "Hair ERP"}</h1>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <div className="flex items-center gap-2 mb-6">
            <KeyRound className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">নতুন পাসওয়ার্ড দিন</h2>
          </div>

          {!ready ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              লিংক যাচাই হচ্ছে...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">নতুন পাসওয়ার্ড</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="কমপক্ষে ৬ অক্ষর"
                    required
                    className="w-full h-10 rounded-lg border border-border bg-secondary/50 pl-10 pr-10 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button type="button" title={showPw ? "লুকান" : "দেখান"} onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">পাসওয়ার্ড নিশ্চিত করুন</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showConfirmPw ? "text" : "password"}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="আবার লিখুন"
                    required
                    className="w-full h-10 rounded-lg border border-border bg-secondary/50 pl-10 pr-10 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button type="button" title={showConfirmPw ? "লুকান" : "দেখান"} onClick={() => setShowConfirmPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-gradient-gold text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                পাসওয়ার্ড পরিবর্তন করুন
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdatePassword;
