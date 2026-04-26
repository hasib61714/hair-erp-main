import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Download, Calendar } from "lucide-react";

const DailyReportModule = () => {
  const { lang } = useLanguage();
  const { settings } = useCompanySettings();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [{ data: purchases }, { data: sales }, { data: cashEntries }, { data: transfers }, { data: challans }] = await Promise.all([
        supabase.from("purchases").select("*").eq("purchase_date", selectedDate),
        supabase.from("sales").select("*").eq("sale_date", selectedDate),
        supabase.from("cash_entries").select("*").eq("entry_date", selectedDate),
        supabase.from("transfers").select("*").eq("transfer_date", selectedDate),
        supabase.from("challans").select("*").eq("challan_date", selectedDate),
      ]);

      const cashIn = (cashEntries || []).filter(e => e.entry_type === "in").reduce((s, e) => s + Number(e.amount), 0);
      const cashOut = (cashEntries || []).filter(e => e.entry_type === "out").reduce((s, e) => s + Number(e.amount), 0);
      const totalPurchase = (purchases || []).reduce((s, r) => s + Number(r.total_price || 0), 0);
      const totalSales = (sales || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);

      setData({
        purchases: purchases || [], sales: sales || [], cashEntries: cashEntries || [],
        transfers: transfers || [], challans: challans || [],
        cashIn, cashOut, totalPurchase, totalSales,
      });
      setLoading(false);
    };
    fetchData();
  }, [selectedDate]);

  const fmt = (n: number) => "৳" + n.toLocaleString("en-IN");

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ["Type", "Name", "Amount", "Details"],
      ...data.purchases.map((p: any) => ["Purchase", p.supplier_name, p.total_price, `${p.weight_kg} KG`]),
      ...data.sales.map((s: any) => ["Sale", s.buyer_name, s.total_amount, `${s.weight_kg} KG`]),
      ...data.cashEntries.map((c: any) => [c.entry_type === "in" ? "Cash In" : "Cash Out", c.person_name || c.category, c.amount, c.description || ""]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-report-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!data) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Daily Report - ${selectedDate}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #222; font-size: 12px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
        .header h1 { margin: 0; font-size: 18px; }
        .header p { margin: 2px 0; font-size: 11px; color: #666; }
        h3 { font-size: 13px; margin: 15px 0 5px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        .summary { display: flex; justify-content: space-between; margin-top: 20px; padding: 10px; border: 1px solid #333; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="header">
        <h1>${settings.company_name}</h1>
        <p>${settings.tagline || ""}</p>
        <p>${settings.company_address || ""}</p>
        <p style="font-size:13px;font-weight:bold;margin-top:8px;">দৈনিক রিপোর্ট — ${selectedDate}</p>
      </div>
      ${data.purchases.length > 0 ? `
        <h3>ক্রয় / Purchases (${data.purchases.length})</h3>
        <table><tr><th>সরবরাহকারী</th><th>ওজন</th><th>মূল্য</th></tr>
        ${data.purchases.map((p: any) => `<tr><td>${p.supplier_name}</td><td>${p.weight_kg} KG</td><td>৳${Number(p.total_price).toLocaleString()}</td></tr>`).join("")}
        </table>` : ""}
      ${data.sales.length > 0 ? `
        <h3>বিক্রয় / Sales (${data.sales.length})</h3>
        <table><tr><th>বায়ার</th><th>ওজন</th><th>মূল্য</th></tr>
        ${data.sales.map((s: any) => `<tr><td>${s.buyer_name}</td><td>${s.weight_kg} KG</td><td>৳${Number(s.total_amount).toLocaleString()}</td></tr>`).join("")}
        </table>` : ""}
      ${data.cashEntries.length > 0 ? `
        <h3>ক্যাশ / Cash (${data.cashEntries.length})</h3>
        <table><tr><th>ধরন</th><th>ক্যাটাগরি</th><th>পরিমাণ</th></tr>
        ${data.cashEntries.map((c: any) => `<tr><td>${c.entry_type === "in" ? "ইন" : "আউট"}</td><td>${c.category}</td><td>৳${Number(c.amount).toLocaleString()}</td></tr>`).join("")}
        </table>` : ""}
      <div class="summary">
        <div>মোট ক্রয়: ৳${Number(data.totalPurchase).toLocaleString()}</div>
        <div>মোট বিক্রয়: ৳${Number(data.totalSales).toLocaleString()}</div>
        <div>ক্যাশ ইন: ৳${Number(data.cashIn).toLocaleString()}</div>
        <div>ক্যাশ আউট: ৳${Number(data.cashOut).toLocaleString()}</div>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">{lang === "bn" ? "লোড হচ্ছে..." : "Loading..."}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{lang === "bn" ? "দৈনিক রিপোর্ট" : "Daily Report"}</h2>
          <p className="text-xs text-muted-foreground">{lang === "bn" ? "প্রতিদিনের সামারি রিপোর্ট" : "Daily summary report"}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 text-xs" />
          </div>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
            <Printer className="w-3.5 h-3.5" />{lang === "bn" ? "প্রিন্ট" : "Print"}
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-foreground text-xs font-medium hover:bg-secondary/50">
            <Download className="w-3.5 h-3.5" />CSV
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-gradient-card p-4 text-center">
              <p className="text-xs text-muted-foreground">{lang === "bn" ? "মোট ক্রয়" : "Purchases"}</p>
              <p className="text-lg font-bold text-foreground">{fmt(data.totalPurchase)}</p>
              <p className="text-[10px] text-muted-foreground">{data.purchases.length} {lang === "bn" ? "টি" : "entries"}</p>
            </div>
            <div className="rounded-xl border border-border bg-gradient-card p-4 text-center">
              <p className="text-xs text-muted-foreground">{lang === "bn" ? "মোট বিক্রয়" : "Sales"}</p>
              <p className="text-lg font-bold text-foreground">{fmt(data.totalSales)}</p>
              <p className="text-[10px] text-muted-foreground">{data.sales.length} {lang === "bn" ? "টি" : "entries"}</p>
            </div>
            <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-center">
              <p className="text-xs text-muted-foreground">{lang === "bn" ? "ক্যাশ ইন" : "Cash In"}</p>
              <p className="text-lg font-bold text-success">+{fmt(data.cashIn)}</p>
            </div>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
              <p className="text-xs text-muted-foreground">{lang === "bn" ? "ক্যাশ আউট" : "Cash Out"}</p>
              <p className="text-lg font-bold text-destructive">-{fmt(data.cashOut)}</p>
            </div>
          </div>

          {/* Detail tables */}
          {data.purchases.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <h3 className="px-4 py-2.5 text-sm font-semibold border-b border-border bg-secondary/30">{lang === "bn" ? "ক্রয়" : "Purchases"}</h3>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border"><th className="px-4 py-2 text-left">{lang === "bn" ? "সরবরাহকারী" : "Supplier"}</th><th className="px-4 py-2 text-right">{lang === "bn" ? "ওজন" : "Weight"}</th><th className="px-4 py-2 text-right">{lang === "bn" ? "মূল্য" : "Amount"}</th></tr></thead>
                <tbody>{data.purchases.map((p: any) => <tr key={p.id} className="border-b border-border/50"><td className="px-4 py-2">{p.supplier_name}</td><td className="px-4 py-2 text-right">{p.weight_kg} KG</td><td className="px-4 py-2 text-right">{fmt(Number(p.total_price))}</td></tr>)}</tbody>
              </table>
            </div>
          )}

          {data.sales.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <h3 className="px-4 py-2.5 text-sm font-semibold border-b border-border bg-secondary/30">{lang === "bn" ? "বিক্রয়" : "Sales"}</h3>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border"><th className="px-4 py-2 text-left">{lang === "bn" ? "বায়ার" : "Buyer"}</th><th className="px-4 py-2 text-right">{lang === "bn" ? "ওজন" : "Weight"}</th><th className="px-4 py-2 text-right">{lang === "bn" ? "মূল্য" : "Amount"}</th></tr></thead>
                <tbody>{data.sales.map((s: any) => <tr key={s.id} className="border-b border-border/50"><td className="px-4 py-2">{s.buyer_name}</td><td className="px-4 py-2 text-right">{s.weight_kg} KG</td><td className="px-4 py-2 text-right">{fmt(Number(s.total_amount))}</td></tr>)}</tbody>
              </table>
            </div>
          )}

          {data.cashEntries.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <h3 className="px-4 py-2.5 text-sm font-semibold border-b border-border bg-secondary/30">{lang === "bn" ? "ক্যাশ এন্ট্রি" : "Cash Entries"}</h3>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border"><th className="px-4 py-2 text-left">{lang === "bn" ? "ধরন" : "Type"}</th><th className="px-4 py-2 text-left">{lang === "bn" ? "ক্যাটাগরি" : "Category"}</th><th className="px-4 py-2 text-right">{lang === "bn" ? "পরিমাণ" : "Amount"}</th></tr></thead>
                <tbody>{data.cashEntries.map((c: any) => <tr key={c.id} className="border-b border-border/50"><td className="px-4 py-2"><span className={c.entry_type === "in" ? "text-success" : "text-destructive"}>{c.entry_type === "in" ? "ইন" : "আউট"}</span></td><td className="px-4 py-2">{c.category}</td><td className="px-4 py-2 text-right">{fmt(Number(c.amount))}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DailyReportModule;
