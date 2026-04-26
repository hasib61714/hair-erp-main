import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDownCircle, ArrowUpCircle, Users, Printer, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCompanySettings } from "@/hooks/useCompanySettings";

type LedgerEntry = { name: string; amount: number; date: string; source: string };
type DetailRow = { date: string; source: string; amount: number; description: string };

const LedgerModule = () => {
  const { t } = useLanguage();
  const { settings } = useCompanySettings();
  const [receivables, setReceivables] = useState<LedgerEntry[]>([]);
  const [payables, setPayables] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail panel
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"receivable" | "payable">("receivable");
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Date filter
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Raw data for filtering
  const [rawSales, setRawSales] = useState<any[]>([]);
  const [rawChallans, setRawChallans] = useState<any[]>([]);
  const [rawPurchases, setRawPurchases] = useState<any[]>([]);
  const [rawParties, setRawParties] = useState<any[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: sales }, { data: challans }, { data: purchases }, { data: parties }] = await Promise.all([
        supabase.from("sales").select("buyer_name, due_amount, sale_date, total_amount, weight_kg, grade").gt("due_amount", 0),
        supabase.from("challans").select("buyer_name, due_amount, challan_date, total_amount, challan_no").gt("due_amount", 0),
        supabase.from("purchases").select("supplier_name, total_price, payment_status, purchase_date, weight_kg, price_per_kg").neq("payment_status", "paid"),
        supabase.from("party_settlements").select("party_name, due, created_at, total_sales, commission, payable").gt("due", 0),
      ]);
      setRawSales(sales || []);
      setRawChallans(challans || []);
      setRawPurchases(purchases || []);
      setRawParties(parties || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Process data with date filter
  useMemo(() => {
    const inRange = (dateStr: string) => {
      if (!startDate && !endDate) return true;
      const d = new Date(dateStr);
      if (startDate && d < startDate) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59);
        if (d > end) return false;
      }
      return true;
    };

    const recvMap = new Map<string, LedgerEntry>();
    rawSales.filter(s => inRange(s.sale_date)).forEach(s => {
      const key = s.buyer_name;
      const existing = recvMap.get(key);
      recvMap.set(key, { name: key, amount: (existing?.amount || 0) + Number(s.due_amount), date: s.sale_date, source: t("salesModule") });
    });
    rawChallans.filter(c => inRange(c.challan_date)).forEach(c => {
      const key = c.buyer_name;
      const existing = recvMap.get(key);
      recvMap.set(key, { name: key, amount: (existing?.amount || 0) + Number(c.due_amount), date: c.challan_date, source: t("challanModule") });
    });

    const payMap = new Map<string, LedgerEntry>();
    rawPurchases.filter(p => inRange(p.purchase_date)).forEach(p => {
      const key = p.supplier_name;
      const existing = payMap.get(key);
      payMap.set(key, { name: key, amount: (existing?.amount || 0) + Number(p.total_price), date: p.purchase_date, source: t("purchaseModule") });
    });
    rawParties.filter(p => inRange(typeof p.created_at === "string" ? p.created_at.split("T")[0] : "")).forEach(p => {
      const key = p.party_name;
      const existing = payMap.get(key);
      payMap.set(key, { name: key, amount: (existing?.amount || 0) + Number(p.due), date: typeof p.created_at === "string" ? p.created_at.split("T")[0] : "", source: t("partyModule") });
    });

    setReceivables(Array.from(recvMap.values()).sort((a, b) => b.amount - a.amount));
    setPayables(Array.from(payMap.values()).sort((a, b) => b.amount - a.amount));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawSales, rawChallans, rawPurchases, rawParties, startDate, endDate]);

  // Fetch detail for a person
  const openDetail = async (name: string, type: "receivable" | "payable") => {
    setSelectedPerson(name);
    setSelectedType(type);
    setDetailLoading(true);
    const rows: DetailRow[] = [];

    if (type === "receivable") {
      rawSales.filter(s => s.buyer_name === name && Number(s.due_amount) > 0).forEach(s => {
        rows.push({ date: s.sale_date, source: t("salesModule"), amount: Number(s.due_amount), description: `${s.weight_kg} KG · ${s.grade}` });
      });
      rawChallans.filter(c => c.buyer_name === name && Number(c.due_amount) > 0).forEach(c => {
        rows.push({ date: c.challan_date, source: t("challanModule"), amount: Number(c.due_amount), description: `চালান #${c.challan_no}` });
      });
    } else {
      rawPurchases.filter(p => p.supplier_name === name).forEach(p => {
        rows.push({ date: p.purchase_date, source: t("purchaseModule"), amount: Number(p.total_price), description: `${p.weight_kg} KG @ ৳${p.price_per_kg}` });
      });
      rawParties.filter(p => p.party_name === name && Number(p.due) > 0).forEach(p => {
        rows.push({ date: typeof p.created_at === "string" ? p.created_at.split("T")[0] : "", source: t("partyModule"), amount: Number(p.due), description: `বিক্রয়: ৳${Number(p.total_sales).toLocaleString()} · কমিশন: ৳${Number(p.commission).toLocaleString()}` });
      });
    }

    setDetails(rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setDetailLoading(false);
  };

  const totalReceivable = receivables.reduce((s, r) => s + r.amount, 0);
  const totalPayable = payables.reduce((s, p) => s + p.amount, 0);
  const netBalance = totalReceivable - totalPayable;

  const handlePrint = () => {
    const printContent = document.getElementById("ledger-print-area");
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${t("ledgerModule")}</title><style>
      body{font-family:Arial,sans-serif;padding:30px;color:#1a1a1a}
      h1{font-size:18px;margin-bottom:4px}
      h2{font-size:14px;margin:20px 0 8px;border-bottom:2px solid #333;padding-bottom:4px}
      .sub{color:#666;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
      th{background:#f5f5f5;font-weight:600}
      .right{text-align:right}
      .summary{display:flex;gap:30px;margin-bottom:20px}
      .summary div{flex:1;border:1px solid #ddd;padding:10px;border-radius:6px}
      .summary .label{font-size:11px;color:#666}
      .summary .val{font-size:18px;font-weight:700}
      .green{color:#16a34a} .red{color:#dc2626}
      @media print{body{padding:10px}}
    </style></head><body>`);
    win.document.write(`<h1>${settings?.company_name || "Company"}</h1>`);
    win.document.write(`<p class="sub">${settings?.company_address || ""} ${settings?.company_phone ? " · " + settings.company_phone : ""}</p>`);
    win.document.write(`<h1>${t("ledgerModule")}</h1>`);
    if (startDate || endDate) {
      win.document.write(`<p class="sub">${startDate ? format(startDate, "dd/MM/yyyy") : "—"} → ${endDate ? format(endDate, "dd/MM/yyyy") : "—"}</p>`);
    }
    win.document.write(`<div class="summary">
      <div><span class="label">${t("totalReceivable")}</span><br><span class="val green">৳${totalReceivable.toLocaleString()}</span></div>
      <div><span class="label">${t("totalPayable")}</span><br><span class="val red">৳${totalPayable.toLocaleString()}</span></div>
      <div><span class="label">${t("netBalance")}</span><br><span class="val">${netBalance >= 0 ? "+" : ""}৳${netBalance.toLocaleString()}</span></div>
    </div>`);

    if (receivables.length > 0) {
      win.document.write(`<h2>${t("weWillGet")}</h2><table><tr><th>${t("personName")}</th><th>${t("description")}</th><th class="right">${t("amount")}</th></tr>`);
      receivables.forEach(r => win.document.write(`<tr><td>${r.name}</td><td>${r.source} · ${r.date}</td><td class="right green">৳${r.amount.toLocaleString()}</td></tr>`));
      win.document.write(`<tr><th colspan="2">${t("total")}</th><th class="right green">৳${totalReceivable.toLocaleString()}</th></tr></table>`);
    }
    if (payables.length > 0) {
      win.document.write(`<h2>${t("weWillPay")}</h2><table><tr><th>${t("personName")}</th><th>${t("description")}</th><th class="right">${t("amount")}</th></tr>`);
      payables.forEach(p => win.document.write(`<tr><td>${p.name}</td><td>${p.source} · ${p.date}</td><td class="right red">৳${p.amount.toLocaleString()}</td></tr>`));
      win.document.write(`<tr><th colspan="2">${t("total")}</th><th class="right red">৳${totalPayable.toLocaleString()}</th></tr></table>`);
    }

    win.document.write(`<p class="sub" style="margin-top:30px;text-align:center">— ${t("printPdf")} · ${new Date().toLocaleDateString()} —</p>`);
    win.document.write("</body></html>");
    win.document.close();
    win.print();
  };

  const clearFilter = () => { setStartDate(undefined); setEndDate(undefined); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("ledgerModule")}</h2>
          <p className="text-xs text-muted-foreground">{t("ledgerDesc")}</p>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <Printer className="w-3.5 h-3.5" /> {t("printPdf")}
        </button>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("text-xs gap-1.5", !startDate && "text-muted-foreground")}>
              <CalendarIcon className="w-3.5 h-3.5" />
              {startDate ? format(startDate, "dd/MM/yyyy") : t("from")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        <span className="text-xs text-muted-foreground">→</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("text-xs gap-1.5", !endDate && "text-muted-foreground")}>
              <CalendarIcon className="w-3.5 h-3.5" />
              {endDate ? format(endDate, "dd/MM/yyyy") : t("to")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        {(startDate || endDate) && (
          <Button variant="ghost" size="sm" onClick={clearFilter} className="text-xs text-muted-foreground">
            <X className="w-3.5 h-3.5 mr-1" /> {t("cancel")}
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-success/20 p-4 bg-gradient-card shadow-card">
          <ArrowDownCircle className="w-5 h-5 text-success mb-2" />
          <p className="text-xs text-muted-foreground">{t("totalReceivable")}</p>
          <p className="text-2xl font-bold text-success">৳{totalReceivable.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{receivables.length} {t("persons")}</p>
        </div>
        <div className="rounded-xl border border-destructive/20 p-4 bg-gradient-card shadow-card">
          <ArrowUpCircle className="w-5 h-5 text-destructive mb-2" />
          <p className="text-xs text-muted-foreground">{t("totalPayable")}</p>
          <p className="text-2xl font-bold text-destructive">৳{totalPayable.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{payables.length} {t("persons")}</p>
        </div>
        <div className={`rounded-xl border p-4 bg-gradient-card shadow-card ${netBalance >= 0 ? "border-primary/20" : "border-destructive/20"}`}>
          <Users className="w-5 h-5 text-primary mb-2" />
          <p className="text-xs text-muted-foreground">{t("netBalance")}</p>
          <p className={`text-2xl font-bold ${netBalance >= 0 ? "text-primary" : "text-destructive"}`}>
            {netBalance >= 0 ? "+" : ""}৳{netBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {loading ? <p className="text-xs text-muted-foreground">{t("loading")}</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="ledger-print-area">
          {/* Receivables */}
          <div className="rounded-xl border border-success/20 p-6 bg-gradient-card shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <ArrowDownCircle className="w-5 h-5 text-success" />
              <h3 className="text-sm font-semibold text-foreground">{t("weWillGet")}</h3>
            </div>
            {receivables.length === 0 ? <p className="text-xs text-muted-foreground">{t("noData")}</p> : (
              <div className="space-y-2">
                {receivables.map((r, i) => (
                  <div
                    key={i}
                    onClick={() => openDetail(r.name, "receivable")}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors",
                      selectedPerson === r.name && selectedType === "receivable" && "ring-2 ring-success/50"
                    )}
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">{r.source} · {r.date}</p>
                    </div>
                    <span className="text-sm font-bold text-success">৳{r.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payables */}
          <div className="rounded-xl border border-destructive/20 p-6 bg-gradient-card shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpCircle className="w-5 h-5 text-destructive" />
              <h3 className="text-sm font-semibold text-foreground">{t("weWillPay")}</h3>
            </div>
            {payables.length === 0 ? <p className="text-xs text-muted-foreground">{t("noData")}</p> : (
              <div className="space-y-2">
                {payables.map((p, i) => (
                  <div
                    key={i}
                    onClick={() => openDetail(p.name, "payable")}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors",
                      selectedPerson === p.name && selectedType === "payable" && "ring-2 ring-destructive/50"
                    )}
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.source} · {p.date}</p>
                    </div>
                    <span className="text-sm font-bold text-destructive">৳{p.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedPerson && (
        <div className={cn(
          "rounded-xl border p-6 bg-gradient-card shadow-card",
          selectedType === "receivable" ? "border-success/30" : "border-destructive/30"
        )}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{selectedPerson}</h3>
              <p className="text-[11px] text-muted-foreground">
                {selectedType === "receivable" ? t("weWillGet") : t("weWillPay")} — {t("gradeDetails")}
              </p>
            </div>
            <button onClick={() => setSelectedPerson(null)} className="p-1.5 rounded-lg hover:bg-secondary">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {detailLoading ? <p className="text-xs text-muted-foreground">{t("loading")}</p> : details.length === 0 ? <p className="text-xs text-muted-foreground">{t("noData")}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-3">{t("date")}</th>
                    <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-3">{t("description")}</th>
                    <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-3">{t("type")}</th>
                    <th className="text-right text-xs text-muted-foreground font-medium py-2">{t("amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((d, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2.5 pr-3 text-xs text-foreground">{d.date}</td>
                      <td className="py-2.5 pr-3 text-xs text-foreground">{d.description}</td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground">{d.source}</td>
                      <td className={cn("py-2.5 text-xs text-right font-medium", selectedType === "receivable" ? "text-success" : "text-destructive")}>
                        ৳{d.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-primary/30">
                    <td className="py-2.5 text-xs font-bold text-primary" colSpan={3}>{t("total")}</td>
                    <td className={cn("py-2.5 text-xs text-right font-bold", selectedType === "receivable" ? "text-success" : "text-destructive")}>
                      ৳{details.reduce((s, d) => s + d.amount, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LedgerModule;
