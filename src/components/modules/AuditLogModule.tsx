import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Search } from "lucide-react";

const actionLabels: Record<string, Record<string, string>> = {
  create: { bn: "তৈরি", en: "Created" },
  update: { bn: "আপডেট", en: "Updated" },
  delete: { bn: "মুছে ফেলা", en: "Deleted" },
};

const moduleLabels: Record<string, Record<string, string>> = {
  purchases: { bn: "ক্রয়", en: "Purchases" },
  sales: { bn: "বিক্রয়", en: "Sales" },
  cash_entries: { bn: "ক্যাশ", en: "Cash" },
  transfers: { bn: "ট্রান্সফার", en: "Transfers" },
  challans: { bn: "চালান", en: "Challans" },
  inventory: { bn: "ইনভেন্টরি", en: "Inventory" },
  production_batches: { bn: "উৎপাদন", en: "Production" },
};

const AuditLogModule = () => {
  const { lang } = useLanguage();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      let query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
      if (filterModule !== "all") query = query.eq("module", filterModule);
      if (filterAction !== "all") query = query.eq("action", filterAction);
      const { data } = await query;
      setLogs(data || []);
      setLoading(false);
    };
    fetchLogs();
  }, [filterModule, filterAction]);

  const filtered = search
    ? logs.filter(l => l.user_name?.toLowerCase().includes(search.toLowerCase()) || l.module?.toLowerCase().includes(search.toLowerCase()))
    : logs;

  const actionColor = (action: string) => {
    if (action === "create") return "bg-success/10 text-success";
    if (action === "delete") return "bg-destructive/10 text-destructive";
    return "bg-primary/10 text-primary";
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">{lang === "bn" ? "লোড হচ্ছে..." : "Loading..."}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {lang === "bn" ? "অডিট লগ" : "Audit Log"}
          </h2>
          <p className="text-xs text-muted-foreground">{lang === "bn" ? "কে কখন কী পরিবর্তন করেছে" : "Who changed what and when"}</p>
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} {lang === "bn" ? "টি লগ" : "logs"}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input placeholder={lang === "bn" ? "অনুসন্ধান..." : "Search..."} value={search} onChange={e => setSearch(e.target.value)}
            className="h-8 w-48 rounded-lg border border-border bg-background pl-8 pr-3 text-xs" />
        </div>
        <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
          className="h-8 rounded-lg border border-border bg-background px-2 text-xs">
          <option value="all">{lang === "bn" ? "সব মডিউল" : "All Modules"}</option>
          {Object.entries(moduleLabels).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
        </select>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
          className="h-8 rounded-lg border border-border bg-background px-2 text-xs">
          <option value="all">{lang === "bn" ? "সব অ্যাকশন" : "All Actions"}</option>
          {Object.entries(actionLabels).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
        </select>
      </div>

      {/* Log list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground">{lang === "bn" ? "সময়" : "Time"}</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground">{lang === "bn" ? "ব্যবহারকারী" : "User"}</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground">{lang === "bn" ? "অ্যাকশন" : "Action"}</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground">{lang === "bn" ? "মডিউল" : "Module"}</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground">{lang === "bn" ? "বিবরণ" : "Details"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => {
                const details = log.details || {};
                let summary = "";
                if (log.action === "create") {
                  const d = details;
                  summary = d.supplier_name || d.buyer_name || d.batch_code || d.challan_no || d.category || d.grade || "";
                } else if (log.action === "update") {
                  summary = lang === "bn" ? "আপডেট করা হয়েছে" : "Updated";
                } else if (log.action === "delete") {
                  const d = details;
                  summary = d.supplier_name || d.buyer_name || d.batch_code || d.challan_no || "";
                }

                return (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString(lang === "bn" ? "bn-BD" : "en", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{log.user_name || "System"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${actionColor(log.action)}`}>
                        {actionLabels[log.action]?.[lang] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{moduleLabels[log.module]?.[lang] || log.module}</td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{summary}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">{lang === "bn" ? "কোন লগ নেই" : "No logs found"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogModule;
