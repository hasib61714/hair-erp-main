import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Truck, Plus, Edit2, Trash2, Printer, CreditCard, X, Eye } from "lucide-react";

const SupplierModule = () => {
  const { lang } = useLanguage();
  const { user, role } = useAuth();
  const { settings } = useCompanySettings();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", country: "BD", notes: "" });
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", payment_date: new Date().toISOString().split("T")[0], payment_method: "cash", notes: "" });
  const [paymentSupplierId, setPaymentSupplierId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: sups }, { data: purch }, { data: pays }] = await Promise.all([
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("purchases").select("supplier_name, total_price, weight_kg, purchase_date, price_per_kg, product_type, country").order("purchase_date", { ascending: false }),
      supabase.from("supplier_payments").select("*").order("payment_date", { ascending: false }),
    ]);
    setSuppliers(sups || []);
    setPurchases(purch || []);
    setPayments(pays || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.name || !user) return;
    if (editId) {
      const { error } = await supabase.from("suppliers").update(form).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success(lang === "bn" ? "আপডেট হয়েছে" : "Updated");
    } else {
      const { error } = await supabase.from("suppliers").insert({ ...form, created_by: user.id });
      if (error) { toast.error(error.message); return; }
      toast.success(lang === "bn" ? "সংরক্ষিত হয়েছে" : "Saved");
    }
    setShowForm(false);
    setEditId(null);
    setForm({ name: "", phone: "", address: "", country: "BD", notes: "" });
    fetchData();
  };

  const handleEdit = (s: any) => {
    setForm({ name: s.name, phone: s.phone || "", address: s.address || "", country: s.country, notes: s.notes || "" });
    setEditId(s.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(lang === "bn" ? "মুছে ফেলতে চান?" : "Delete?")) return;
    await supabase.from("suppliers").delete().eq("id", id);
    toast.success(lang === "bn" ? "মুছে ফেলা হয়েছে" : "Deleted");
    fetchData();
  };

  const handlePaymentSave = async () => {
    if (!paymentForm.amount || !paymentSupplierId || !user) return;
    const supplier = suppliers.find(s => s.id === paymentSupplierId);
    if (!supplier) return;
    const { error } = await supabase.from("supplier_payments").insert({
      supplier_id: paymentSupplierId,
      supplier_name: supplier.name,
      amount: Number(paymentForm.amount),
      payment_date: paymentForm.payment_date,
      payment_method: paymentForm.payment_method,
      notes: paymentForm.notes || null,
      created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "পেমেন্ট সংরক্ষিত" : "Payment saved");
    setShowPaymentForm(false);
    setPaymentForm({ amount: "", payment_date: new Date().toISOString().split("T")[0], payment_method: "cash", notes: "" });
    setPaymentSupplierId(null);
    fetchData();
  };

  const getSupplierPurchases = (name: string) => purchases.filter(p => p.supplier_name === name);
  const getSupplierTotal = (name: string) => getSupplierPurchases(name).reduce((s, p) => s + Number(p.total_price || 0), 0);
  const getSupplierPaid = (name: string) => payments.filter(p => p.supplier_name === name).reduce((s, p) => s + Number(p.amount || 0), 0);
  const getSupplierDue = (name: string) => getSupplierTotal(name) - getSupplierPaid(name);
  const getSupplierPayments = (name: string) => payments.filter(p => p.supplier_name === name);

  const fmt = (n: number) => "৳" + n.toLocaleString("en-IN");
  const countryLabel = (c: string) => ({ BD: lang === "bn" ? "বাংলাদেশ" : "Bangladesh", IN: lang === "bn" ? "ভারত" : "India", CN: lang === "bn" ? "চীন" : "China" }[c] || c);

  const handlePrintProfile = (supplierName: string) => {
    const supplier = suppliers.find(s => s.name === supplierName);
    if (!supplier) return;
    const sPurchases = getSupplierPurchases(supplierName);
    const sPayments = getSupplierPayments(supplierName);
    const totalPurchase = getSupplierTotal(supplierName);
    const totalPaid = getSupplierPaid(supplierName);
    const totalDue = totalPurchase - totalPaid;

    const purchaseRows = sPurchases.map((p, i) => `
      <tr>
        <td style="border:1px solid #ddd;padding:4px 8px;text-align:center">${i + 1}</td>
        <td style="border:1px solid #ddd;padding:4px 8px">${p.purchase_date}</td>
        <td style="border:1px solid #ddd;padding:4px 8px">${p.product_type || "—"}</td>
        <td style="border:1px solid #ddd;padding:4px 8px;text-align:right">${Number(p.weight_kg).toLocaleString("en-IN")} KG</td>
        <td style="border:1px solid #ddd;padding:4px 8px;text-align:right">৳${Number(p.price_per_kg).toLocaleString("en-IN")}</td>
        <td style="border:1px solid #ddd;padding:4px 8px;text-align:right;font-weight:bold">৳${Number(p.total_price).toLocaleString("en-IN")}</td>
      </tr>
    `).join("");

    const paymentRows = sPayments.map((p, i) => `
      <tr>
        <td style="border:1px solid #ddd;padding:4px 8px;text-align:center">${i + 1}</td>
        <td style="border:1px solid #ddd;padding:4px 8px">${p.payment_date}</td>
        <td style="border:1px solid #ddd;padding:4px 8px">${p.payment_method}</td>
        <td style="border:1px solid #ddd;padding:4px 8px;text-align:right;font-weight:bold">৳${Number(p.amount).toLocaleString("en-IN")}</td>
        <td style="border:1px solid #ddd;padding:4px 8px">${p.notes || "—"}</td>
      </tr>
    `).join("");

    const html = `
      <html><head><title>Supplier Profile — ${supplierName}</title>
      <style>body{font-family:'Segoe UI',sans-serif;padding:30px;color:#222}table{width:100%;border-collapse:collapse;margin:10px 0}th{background:#f0f0f0;border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:11px}td{font-size:11px}h2,h3{margin:0}
      @media print{button{display:none!important}}</style></head><body>
      <div style="text-align:center;margin-bottom:20px">
        <h2>${settings.company_name || "Mahin Enterprise"}</h2>
        <p style="font-size:11px;color:#666">${settings.company_address || ""} ${settings.company_phone ? "| " + settings.company_phone : ""}</p>
        <h3 style="margin-top:12px;font-size:16px">সরবরাহকারী প্রোফাইল / Supplier Profile</h3>
      </div>

      <div style="display:flex;gap:30px;margin-bottom:15px;font-size:12px">
        <div><strong>নাম:</strong> ${supplier.name}</div>
        <div><strong>ফোন:</strong> ${supplier.phone || "—"}</div>
        <div><strong>দেশ:</strong> ${countryLabel(supplier.country)}</div>
        <div><strong>ঠিকানা:</strong> ${supplier.address || "—"}</div>
      </div>
      ${supplier.notes ? `<div style="font-size:11px;margin-bottom:10px"><strong>নোট:</strong> ${supplier.notes}</div>` : ""}

      <div style="display:flex;gap:15px;margin-bottom:15px">
        <div style="flex:1;background:#f8f9fa;padding:10px;border-radius:6px;text-align:center">
          <div style="font-size:10px;color:#666">মোট ক্রয়</div>
          <div style="font-size:16px;font-weight:bold">৳${totalPurchase.toLocaleString("en-IN")}</div>
        </div>
        <div style="flex:1;background:#e8f5e9;padding:10px;border-radius:6px;text-align:center">
          <div style="font-size:10px;color:#666">মোট পরিশোধ</div>
          <div style="font-size:16px;font-weight:bold;color:#2e7d32">৳${totalPaid.toLocaleString("en-IN")}</div>
        </div>
        <div style="flex:1;background:${totalDue > 0 ? '#fff3e0' : '#e8f5e9'};padding:10px;border-radius:6px;text-align:center">
          <div style="font-size:10px;color:#666">বাকি আছে</div>
          <div style="font-size:16px;font-weight:bold;color:${totalDue > 0 ? '#e65100' : '#2e7d32'}">৳${totalDue.toLocaleString("en-IN")}</div>
        </div>
      </div>

      <h3 style="font-size:13px;margin:15px 0 5px">ক্রয় ইতিহাস / Purchase History (${sPurchases.length})</h3>
      <table>
        <thead><tr>
          <th>#</th><th>তারিখ</th><th>ধরন</th><th style="text-align:right">ওজন</th><th style="text-align:right">দর</th><th style="text-align:right">মোট</th>
        </tr></thead>
        <tbody>${purchaseRows || '<tr><td colspan="6" style="text-align:center;padding:10px;color:#999">কোন ক্রয় নেই</td></tr>'}</tbody>
        ${sPurchases.length > 0 ? `<tfoot><tr><td colspan="5" style="border:1px solid #ddd;padding:6px 8px;text-align:right;font-weight:bold">মোট:</td><td style="border:1px solid #ddd;padding:6px 8px;text-align:right;font-weight:bold;font-size:13px">৳${totalPurchase.toLocaleString("en-IN")}</td></tr></tfoot>` : ""}
      </table>

      ${sPayments.length > 0 ? `
      <h3 style="font-size:13px;margin:15px 0 5px">পেমেন্ট ইতিহাস / Payment History (${sPayments.length})</h3>
      <table>
        <thead><tr><th>#</th><th>তারিখ</th><th>মাধ্যম</th><th style="text-align:right">পরিমাণ</th><th>নোট</th></tr></thead>
        <tbody>${paymentRows}</tbody>
        <tfoot><tr><td colspan="3" style="border:1px solid #ddd;padding:6px 8px;text-align:right;font-weight:bold">মোট পরিশোধ:</td><td style="border:1px solid #ddd;padding:6px 8px;text-align:right;font-weight:bold;font-size:13px">৳${totalPaid.toLocaleString("en-IN")}</td><td></td></tr></tfoot>
      </table>` : ""}

      <div style="margin-top:20px;text-align:right;font-size:10px;color:#999">
        প্রিন্ট তারিখ: ${new Date().toLocaleDateString("en-GB")}
      </div>
      <button onclick="window.print()" style="margin-top:10px;padding:8px 20px;background:#333;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨️ Print</button>
      </body></html>
    `;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">{lang === "bn" ? "লোড হচ্ছে..." : "Loading..."}</div>;

  // Summary stats
  const totalPurchaseAll = purchases.reduce((s, p) => s + Number(p.total_price || 0), 0);
  const totalPaidAll = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalDueAll = totalPurchaseAll - totalPaidAll;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            {lang === "bn" ? "সরবরাহকারী ম্যানেজমেন্ট" : "Supplier Management"}
          </h2>
          <p className="text-xs text-muted-foreground">{lang === "bn" ? "সকল সরবরাহকারীর তথ্য, ক্রয় ও পেমেন্ট" : "Supplier directory, purchases & payments"}</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: "", phone: "", address: "", country: "BD", notes: "" }); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
          <Plus className="w-3.5 h-3.5" />{lang === "bn" ? "নতুন সরবরাহকারী" : "Add Supplier"}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">{lang === "bn" ? "মোট ক্রয়" : "Total Purchase"}</p>
          <p className="text-lg font-bold text-foreground">{fmt(totalPurchaseAll)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">{lang === "bn" ? "মোট পরিশোধ" : "Total Paid"}</p>
          <p className="text-lg font-bold text-green-600">{fmt(totalPaidAll)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">{lang === "bn" ? "মোট বাকি" : "Total Due"}</p>
          <p className={`text-lg font-bold ${totalDueAll > 0 ? "text-orange-600" : "text-green-600"}`}>{fmt(totalDueAll)}</p>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">{editId ? (lang === "bn" ? "সম্পাদনা" : "Edit") : (lang === "bn" ? "নতুন সরবরাহকারী" : "New Supplier")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input placeholder={lang === "bn" ? "নাম *" : "Name *"} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
            <input placeholder={lang === "bn" ? "ফোন" : "Phone"} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
            <input placeholder={lang === "bn" ? "ঠিকানা" : "Address"} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
            <select value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="BD">{lang === "bn" ? "বাংলাদেশ" : "Bangladesh"}</option>
              <option value="IN">{lang === "bn" ? "ভারত" : "India"}</option>
              <option value="CN">{lang === "bn" ? "চীন" : "China"}</option>
            </select>
            <input placeholder={lang === "bn" ? "নোট" : "Notes"} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
              {lang === "bn" ? "সংরক্ষণ" : "Save"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="px-4 h-9 rounded-lg border border-border text-xs hover:bg-secondary">
              {lang === "bn" ? "বাতিল" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              {lang === "bn" ? "পেমেন্ট যোগ করুন" : "Add Payment"} — {suppliers.find(s => s.id === paymentSupplierId)?.name}
            </h3>
            <button onClick={() => setShowPaymentForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input type="number" placeholder={lang === "bn" ? "পরিমাণ (৳) *" : "Amount (৳) *"} value={paymentForm.amount}
              onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
            <input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
            <select value={paymentForm.payment_method} onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="cash">{lang === "bn" ? "নগদ" : "Cash"}</option>
              <option value="bank">{lang === "bn" ? "ব্যাংক" : "Bank"}</option>
              <option value="bkash">{lang === "bn" ? "বিকাশ" : "bKash"}</option>
              <option value="nagad">{lang === "bn" ? "নগদ (মোবাইল)" : "Nagad"}</option>
            </select>
            <input placeholder={lang === "bn" ? "নোট" : "Note"} value={paymentForm.notes}
              onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <button onClick={handlePaymentSave} className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
            {lang === "bn" ? "পেমেন্ট সংরক্ষণ" : "Save Payment"}
          </button>
        </div>
      )}

      {/* Supplier table + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-2.5 text-left">{lang === "bn" ? "নাম" : "Name"}</th>
                  <th className="px-4 py-2.5 text-left">{lang === "bn" ? "দেশ" : "Country"}</th>
                  <th className="px-4 py-2.5 text-right">{lang === "bn" ? "মোট ক্রয়" : "Purchase"}</th>
                  <th className="px-4 py-2.5 text-right">{lang === "bn" ? "পরিশোধ" : "Paid"}</th>
                  <th className="px-4 py-2.5 text-right">{lang === "bn" ? "বাকি" : "Due"}</th>
                  <th className="px-4 py-2.5 text-center">{lang === "bn" ? "কার্যক্রম" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => {
                  const total = getSupplierTotal(s.name);
                  const paid = getSupplierPaid(s.name);
                  const due = total - paid;
                  return (
                    <tr key={s.id} className={`border-b border-border/50 hover:bg-secondary/20 cursor-pointer ${selectedSupplier === s.name ? "bg-primary/5" : ""}`}
                      onClick={() => setSelectedSupplier(s.name)}>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-foreground">{s.name}</div>
                        <div className="text-[10px] text-muted-foreground">{s.phone || ""}</div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{countryLabel(s.country)}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{fmt(total)}</td>
                      <td className="px-4 py-2.5 text-right text-green-600">{fmt(paid)}</td>
                      <td className={`px-4 py-2.5 text-right font-bold ${due > 0 ? "text-orange-600" : "text-green-600"}`}>{fmt(due)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <button onClick={e => { e.stopPropagation(); setPaymentSupplierId(s.id); setShowPaymentForm(true); }} title="Payment"
                            className="p-1 hover:bg-primary/10 rounded text-primary"><CreditCard className="w-3 h-3" /></button>
                          <button onClick={e => { e.stopPropagation(); handlePrintProfile(s.name); }} title="Print"
                            className="p-1 hover:bg-secondary rounded"><Printer className="w-3 h-3" /></button>
                          <button onClick={e => { e.stopPropagation(); handleEdit(s); }} title="Edit"
                            className="p-1 hover:bg-secondary rounded"><Edit2 className="w-3 h-3" /></button>
                          {role === "admin" && <button onClick={e => { e.stopPropagation(); handleDelete(s.id); }}
                            className="p-1 hover:bg-destructive/10 rounded text-destructive"><Trash2 className="w-3 h-3" /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {suppliers.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">{lang === "bn" ? "কোন সরবরাহকারী নেই" : "No suppliers"}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right panel: purchase + payment history */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h3 className="text-sm font-semibold">
            {selectedSupplier ? `${selectedSupplier}` : (lang === "bn" ? "সরবরাহকারী নির্বাচন করুন" : "Select a supplier")}
          </h3>
          {selectedSupplier && (
            <>
              {/* Purchase history */}
              <div>
                <p className="text-[10px] uppercase text-muted-foreground mb-1">{lang === "bn" ? "ক্রয় ইতিহাস" : "Purchase History"}</p>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {getSupplierPurchases(selectedSupplier).map((p, i) => (
                    <div key={i} className="flex justify-between text-xs border-b border-border/50 pb-1.5">
                      <div>
                        <p className="text-muted-foreground">{p.purchase_date}</p>
                        <p className="text-[10px] text-muted-foreground">{p.weight_kg} KG • {p.product_type}</p>
                      </div>
                      <span className="font-medium text-foreground">{fmt(Number(p.total_price))}</span>
                    </div>
                  ))}
                  {getSupplierPurchases(selectedSupplier).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">{lang === "bn" ? "কোন ক্রয় নেই" : "No purchases"}</p>
                  )}
                </div>
              </div>
              {/* Payment history */}
              <div>
                <p className="text-[10px] uppercase text-muted-foreground mb-1">{lang === "bn" ? "পেমেন্ট ইতিহাস" : "Payment History"}</p>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {getSupplierPayments(selectedSupplier).map((p, i) => (
                    <div key={i} className="flex justify-between text-xs border-b border-border/50 pb-1.5">
                      <div>
                        <p className="text-muted-foreground">{p.payment_date}</p>
                        <p className="text-[10px] text-muted-foreground">{p.payment_method}{p.notes ? ` • ${p.notes}` : ""}</p>
                      </div>
                      <span className="font-medium text-green-600">{fmt(Number(p.amount))}</span>
                    </div>
                  ))}
                  {getSupplierPayments(selectedSupplier).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">{lang === "bn" ? "কোন পেমেন্ট নেই" : "No payments"}</p>
                  )}
                </div>
              </div>
              {/* Summary */}
              <div className="border-t border-border pt-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">{lang === "bn" ? "মোট ক্রয়:" : "Total:"}</span><span className="font-bold">{fmt(getSupplierTotal(selectedSupplier))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{lang === "bn" ? "পরিশোধ:" : "Paid:"}</span><span className="font-bold text-green-600">{fmt(getSupplierPaid(selectedSupplier))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{lang === "bn" ? "বাকি:" : "Due:"}</span><span className={`font-bold ${getSupplierDue(selectedSupplier) > 0 ? "text-orange-600" : "text-green-600"}`}>{fmt(getSupplierDue(selectedSupplier))}</span></div>
              </div>
              <button onClick={() => handlePrintProfile(selectedSupplier)} className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-border text-xs hover:bg-secondary">
                <Printer className="w-3 h-3" />{lang === "bn" ? "প্রোফাইল প্রিন্ট" : "Print Profile"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierModule;
