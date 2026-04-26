import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Minus, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import TransactionDrawer from "@/components/TransactionDrawer";
import PrintToolbar from "@/components/PrintToolbar";
import { useState } from "react";
import type { Database } from "@/integrations/supabase/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type PurchaseRow = Database["public"]["Tables"]["purchases"]["Row"];
type PurchaseInsert = Database["public"]["Tables"]["purchases"]["Insert"];

type GradeDetail = { grade: string; kg: number; rate: number };

type Purchase = Omit<PurchaseRow, "grade_details"> & {
  grade_details: GradeDetail[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-success/15 text-success",
  unpaid: "bg-destructive/15 text-destructive",
  partial: "bg-warning/15 text-warning",
};

const COUNTRY_OPTIONS = [
  { value: "BD", labelKey: "bangladesh" as const, flag: "🇧🇩", currency: "BDT" },
  { value: "IN", labelKey: "india" as const, flag: "🇮🇳", currency: "INR" },
  { value: "CN", labelKey: "china" as const, flag: "🇨🇳", currency: "CNY" },
  { value: "OTHER", labelKey: "otherCountry" as const, flag: "🌍", currency: "USD" },
];

const GRADE_OPTIONS = [
  '6"','8"','10"','12"','14"','16"','18"','20"','22"','24"','26"','28"','30"','32"',
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: "৳", INR: "₹", CNY: "¥", USD: "$",
};

// ─── Zod schema ───────────────────────────────────────────────────────────────

const gradeDetailSchema = z.object({
  grade: z.string().min(1),
  kg: z.coerce.number().min(0),
  rate: z.coerce.number().min(0),
});

const purchaseSchema = z.object({
  product_type:    z.enum(["guti", "kachi", "two_by_two"]),
  supplier_name:   z.string().min(1, "Required"),
  country:         z.enum(["BD", "IN", "CN", "OTHER"]),
  guti_grade:      z.string().optional().default(""),
  weight_kg:       z.string().optional().default(""),
  price_per_kg:    z.string().optional().default(""),
  exchange_rate:   z.string().default("1"),
  bata_rate:       z.string().optional().default(""),
  bdt_paid:        z.string().optional().default(""),
  middleman_name:  z.string().optional().default(""),
  purchase_date:   z.string().min(1),
  payment_status:  z.enum(["unpaid", "paid", "partial"]),
  grade_details:   z.array(gradeDetailSchema).default([]),
});

type PurchaseFormValues = z.infer<typeof purchaseSchema>;

const DEFAULT_VALUES: PurchaseFormValues = {
  product_type:   "guti",
  supplier_name:  "",
  country:        "BD",
  guti_grade:     "",
  weight_kg:      "",
  price_per_kg:   "",
  exchange_rate:  "1",
  bata_rate:      "",
  bdt_paid:       "",
  middleman_name: "",
  purchase_date:  new Date().toISOString().split("T")[0],
  payment_status: "unpaid",
  grade_details:  [{ grade: '12"', kg: 0, rate: 0 }],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getCountryInfo = (code: string) =>
  COUNTRY_OPTIONS.find(c => c.value === code) ?? COUNTRY_OPTIONS[0];

const getCurrencySymbol = (currency: string) =>
  CURRENCY_SYMBOLS[currency] ?? currency;

// ─── Component ────────────────────────────────────────────────────────────────

const PurchaseModule = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { can_edit, can_delete } = usePermissions("purchase");
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [drawerName, setDrawerName] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { fields: gradeFields, append, remove } = useFieldArray({
    control,
    name: "grade_details",
  });

  const productType = watch("product_type");
  const country = watch("country");
  const gradeDetails = watch("grade_details");

  const useGradeRows = productType === "kachi" || productType === "two_by_two";
  const gradeTotal = gradeDetails.reduce((s, g) => s + g.kg * g.rate, 0);
  const gradeTotalKg = gradeDetails.reduce((s, g) => s + g.kg, 0);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: async (): Promise<Purchase[]> => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .order("purchase_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(row => ({
        ...row,
        grade_details: Array.isArray(row.grade_details)
          ? (row.grade_details as unknown as GradeDetail[])
          : [],
      }));
    },
    staleTime: 30_000,
  });

  // ─── Form actions ───────────────────────────────────────────────────────────

  const openCreateForm = () => {
    setEditId(null);
    reset(DEFAULT_VALUES);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    reset(DEFAULT_VALUES);
  };

  const handleEdit = (p: Purchase) => {
    setEditId(p.id);
    reset({
      product_type:   (p.product_type as PurchaseFormValues["product_type"]) ?? "guti",
      supplier_name:  p.supplier_name,
      country:        (p.country as PurchaseFormValues["country"]) ?? "BD",
      guti_grade:     p.guti_grade ?? "",
      weight_kg:      String(p.weight_kg),
      price_per_kg:   String(p.price_per_kg),
      exchange_rate:  String(p.exchange_rate ?? 1),
      bata_rate:      p.bata_rate != null ? String(p.bata_rate) : "",
      bdt_paid:       p.bdt_paid != null ? String(p.bdt_paid) : "",
      middleman_name: p.middleman_name ?? "",
      purchase_date:  p.purchase_date,
      payment_status: (p.payment_status as PurchaseFormValues["payment_status"]) ?? "unpaid",
      grade_details:
        p.grade_details.length > 0 ? p.grade_details : [{ grade: '12"', kg: 0, rate: 0 }],
    });
    setShowForm(true);
  };

  const onSubmit = async (values: PurchaseFormValues) => {
    const info = getCountryInfo(values.country);
    const exRate = values.country !== "BD" ? parseFloat(values.exchange_rate) || 1 : 1;

    let weightKg: number;
    let pricePerKg: number;
    let totalPrice: number;

    if (useGradeRows) {
      weightKg = gradeTotalKg;
      pricePerKg = gradeTotalKg > 0 ? gradeTotal / gradeTotalKg : 0;
      totalPrice = gradeTotal;
    } else {
      weightKg = parseFloat(values.weight_kg ?? "0") || 0;
      pricePerKg = parseFloat(values.price_per_kg ?? "0") || 0;
      totalPrice = weightKg * pricePerKg;
    }

    const payload: PurchaseInsert = {
      supplier_name:  values.supplier_name,
      country:        values.country,
      currency:       info.currency,
      weight_kg:      weightKg,
      price_per_kg:   pricePerKg,
      total_price:    totalPrice,
      exchange_rate:  exRate,
      middleman_name: values.middleman_name || null,
      purchase_date:  values.purchase_date,
      payment_status: values.payment_status,
      guti_grade:     values.guti_grade || null,
      product_type:   values.product_type,
      bata_rate:      values.bata_rate ? parseFloat(values.bata_rate) : null,
      bdt_paid:       values.bdt_paid ? parseFloat(values.bdt_paid) : null,
      grade_details:  useGradeRows ? (values.grade_details as unknown as Database["public"]["Tables"]["purchases"]["Insert"]["grade_details"]) : [],
    };

    if (editId) {
      const { error } = await supabase.from("purchases").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase
        .from("purchases")
        .insert({ ...payload, created_by: user?.id ?? null });
      if (error) { toast.error(error.message); return; }
    }

    toast.success(t("saved"));
    closeForm();
    queryClient.invalidateQueries({ queryKey: ["purchases"] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("নিশ্চিত করুন — এই এন্ট্রি মুছে ফেলা হবে?")) return;
    const { error } = await supabase.from("purchases").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট হয়েছে");
    queryClient.invalidateQueries({ queryKey: ["purchases"] });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Input class ────────────────────────────────────────────────────────────

  const inputCls =
    "w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "text-xs text-muted-foreground mb-1 block";

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("purchaseModule")}</h2>
          <p className="text-xs text-muted-foreground">{t("multiCurrencySupport")}</p>
        </div>
        <button
          type="button"
          onClick={showForm ? closeForm : openCreateForm}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          {t("addNewPurchase")}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl border border-primary/20 p-6 bg-gradient-card shadow-card animate-slide-in"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {editId ? t("edit") : t("addNewPurchase")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Product Type */}
            <div>
              <label className={labelCls}>{t("productType")}</label>
              <select {...register("product_type")} className={inputCls}>
                <option value="guti">{t("gutiProduct")}</option>
                <option value="kachi">{t("kachiProduct")}</option>
                <option value="two_by_two">{t("twobytwoProduct")}</option>
              </select>
            </div>

            {/* Supplier */}
            <div>
              <label className={labelCls}>{t("supplierName")}</label>
              <input {...register("supplier_name")} className={inputCls} />
              {errors.supplier_name && (
                <p className="text-xs text-destructive mt-0.5">{errors.supplier_name.message}</p>
              )}
            </div>

            {/* Country */}
            <div>
              <label className={labelCls}>{t("country")}</label>
              <select {...register("country")} className={inputCls}>
                {COUNTRY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>
                    {t(c.labelKey)} ({c.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* Guti grade (guti only) */}
            {productType === "guti" && (
              <div>
                <label className={labelCls}>{t("gutiGrade")}</label>
                <input
                  {...register("guti_grade")}
                  placeholder="e.g. A-Grade, B-Grade, Mixed"
                  className={inputCls}
                />
              </div>
            )}

            {/* Weight + price (non-grade-row modes) */}
            {!useGradeRows && (
              <>
                <div>
                  <label className={labelCls}>{t("weight")}</label>
                  <input type="number" {...register("weight_kg")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("pricePerKg")}</label>
                  <input type="number" {...register("price_per_kg")} className={inputCls} />
                </div>
              </>
            )}

            {/* Exchange rate + bata/bdt (foreign currency) */}
            {country !== "BD" && (
              <>
                <div>
                  <label className={labelCls}>{t("exchangeRate")}</label>
                  <input type="number" step="0.01" {...register("exchange_rate")} className={inputCls} />
                </div>
                {country === "IN" && (
                  <>
                    <div>
                      <label className={labelCls}>{t("bataRate")}</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register("bata_rate")}
                        placeholder="যেমন: 0.75"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>{t("bdtPaid")}</label>
                      <input
                        type="number"
                        {...register("bdt_paid")}
                        placeholder="বাংলা টাকায় কত দিলেন"
                        className={inputCls}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {/* Middleman */}
            <div>
              <label className={labelCls}>{t("middlemanName")}</label>
              <input {...register("middleman_name")} className={inputCls} />
            </div>

            {/* Date */}
            <div>
              <label className={labelCls}>{t("date")}</label>
              <input type="date" {...register("purchase_date")} className={inputCls} />
            </div>

            {/* Payment status */}
            <div>
              <label className={labelCls}>{t("paymentStatus")}</label>
              <select {...register("payment_status")} className={inputCls}>
                <option value="unpaid">{t("unpaid")}</option>
                <option value="paid">{t("paid")}</option>
                <option value="partial">{t("partial")}</option>
              </select>
            </div>
          </div>

          {/* Grade rows (kachi / two_by_two) */}
          {useGradeRows && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">{t("gradeDetails")}</p>
              {gradeFields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 mb-2">
                  <select
                    {...register(`grade_details.${i}.grade`)}
                    className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                  >
                    {GRADE_OPTIONS.map(g => <option key={g}>{g}</option>)}
                  </select>
                  <input
                    type="number"
                    placeholder="KG"
                    {...register(`grade_details.${i}.kg`)}
                    className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                  />
                  <input
                    type="number"
                    placeholder={t("rate")}
                    {...register(`grade_details.${i}.rate`)}
                    className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                  />
                  {gradeFields.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove grade row"
                      onClick={() => remove(i)}
                      className="h-9 w-9 rounded-lg border border-destructive/30 flex items-center justify-center hover:bg-destructive/10 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => append({ grade: '12"', kg: 0, rate: 0 })}
                className="text-xs text-primary hover:underline mb-2"
              >
                + {t("gradeDetails")}
              </button>
              <p className="text-xs text-foreground mt-1">
                {t("total")}: {gradeTotalKg} KG | ৳{gradeTotal.toLocaleString()}
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium disabled:opacity-60"
            >
              {isSubmitting ? "..." : t("save")}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">{t("purchaseHistory")}</h3>

        <PrintToolbar
          moduleName={t("purchaseHistory")}
          data={purchases}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          dateField="purchase_date"
          cardContainerId="purchase-cards"
          renderPrintTable={(items: Purchase[]) => {
            const totalPrice = items.reduce((s, p) => s + Number(p.total_price), 0);
            return `<table><thead><tr>
              <th>${t("date")}</th><th>${t("supplier")}</th><th>${t("productType")}</th>
              <th>গ্রেড বিবরণ</th><th>${t("country")}</th>
              <th style="text-align:right">${t("weight")}</th>
              <th style="text-align:right">${t("totalPrice")}</th>
              <th>${t("status")}</th>
            </tr></thead><tbody>
            ${items.map(p => {
              const sym = getCurrencySymbol(p.currency);
              const ptLabel = p.product_type === "guti" ? "গুটি" : p.product_type === "kachi" ? "কাচি" : "টু বাই টু";
              let gradeText = "";
              if (p.grade_details.length > 0) {
                gradeText = p.grade_details
                  .map(g => `${g.grade}: ${g.kg} KG × ${sym}${Number(g.rate).toLocaleString()} = ${sym}${(g.kg * g.rate).toLocaleString()}`)
                  .join("<br/>");
              } else {
                gradeText = `${p.weight_kg} KG × ${sym}${Number(p.price_per_kg).toLocaleString()}`;
                if (p.guti_grade) gradeText += `<br/><small>ধরন: ${p.guti_grade}</small>`;
              }
              return `<tr>
                <td>${p.purchase_date}</td><td>${p.supplier_name}</td><td>${ptLabel}</td>
                <td style="font-size:11px;line-height:1.6">${gradeText}</td>
                <td>${p.country}</td>
                <td style="text-align:right">${p.weight_kg} KG</td>
                <td style="text-align:right">${sym}${Number(p.total_price).toLocaleString()}</td>
                <td>${p.payment_status === "paid" ? "পরিশোধিত" : p.payment_status === "partial" ? "আংশিক" : "বাকি"}</td>
              </tr>`;
            }).join("")}
            <tr class="total-row">
              <td colspan="5">${t("total")}</td><td></td>
              <td style="text-align:right">৳${totalPrice.toLocaleString()}</td><td></td>
            </tr>
            </tbody></table>`;
          }}
        />

        {isLoading ? (
          <p className="text-xs text-muted-foreground">{t("loading")}</p>
        ) : purchases.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("noData")}</p>
        ) : (
          <div className="space-y-4" id="purchase-cards">
            {purchases.map(p => {
              const sym = getCurrencySymbol(p.currency);
              const cInfo = COUNTRY_OPTIONS.find(c => c.value === p.country);
              const hasGrades = p.grade_details.length > 0;
              const ptLabel =
                p.product_type === "guti"
                  ? t("gutiProduct")
                  : p.product_type === "kachi"
                  ? t("kachiProduct")
                  : t("twobytwoProduct");

              return (
                <div
                  key={p.id}
                  data-card-id={p.id}
                  onClick={() => toggleSelect(p.id)}
                  className={`rounded-xl border p-6 bg-gradient-card shadow-card cursor-pointer transition-all ${
                    selectedIds.has(p.id)
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                          selectedIds.has(p.id)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {selectedIds.has(p.id) && <span className="text-xs">✓</span>}
                      </div>
                      <ShoppingCart className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setDrawerName(p.supplier_name);
                              setDrawerOpen(true);
                            }}
                            className="text-primary hover:underline cursor-pointer"
                          >
                            {p.supplier_name}
                          </button>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.purchase_date} ·{" "}
                          <span
                            className={`px-1.5 py-0.5 rounded-full ${
                              p.product_type === "guti"
                                ? "bg-info/15 text-info"
                                : p.product_type === "kachi"
                                ? "bg-warning/15 text-warning"
                                : "bg-success/15 text-success"
                            }`}
                          >
                            {ptLabel}
                          </span>{" "}
                          <span className={`px-1.5 py-0.5 rounded-full ${STATUS_STYLES[p.payment_status] ?? ""}`}>
                            {t(p.payment_status as Parameters<typeof t>[0])}
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                            {cInfo?.flag ?? "🌍"} {p.currency}
                          </span>
                          {p.middleman_name && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                              দালাল: {p.middleman_name}
                            </span>
                          )}
                          {p.guti_grade && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                              গ্রেড: {p.guti_grade}
                            </span>
                          )}
                          {p.bata_rate != null && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              বাটা: {sym}{p.bata_rate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {can_edit && (
                        <button
                          type="button"
                          aria-label="Edit purchase"
                          onClick={e => { e.stopPropagation(); handleEdit(p); }}
                          className="p-1 rounded hover:bg-secondary"
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                      {can_delete && (
                        <button
                          type="button"
                          aria-label="Delete purchase"
                          onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                          className="p-1 rounded hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4 text-destructive/70" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grade breakdown */}
                  <table className="w-full text-sm mb-3">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-3">{t("grade")}</th>
                        <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-3">{t("weight")} (KG)</th>
                        <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-3">{t("rate")} ({sym})</th>
                        <th className="text-right text-xs text-muted-foreground font-medium py-2">{t("total")} ({sym})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasGrades ? (
                        p.grade_details.map((g, i) => (
                          <tr key={i} className="border-b border-border/30">
                            <td className="py-2 pr-3 text-xs font-medium text-foreground">{g.grade}</td>
                            <td className="py-2 pr-3 text-xs text-right text-foreground">{g.kg} KG</td>
                            <td className="py-2 pr-3 text-xs text-right text-foreground">{sym}{Number(g.rate).toLocaleString()}</td>
                            <td className="py-2 text-xs text-right font-medium text-foreground">{sym}{(g.kg * g.rate).toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr className="border-b border-border/30">
                          <td className="py-2 pr-3 text-xs text-foreground">{p.guti_grade ?? "—"}</td>
                          <td className="py-2 pr-3 text-xs text-right text-foreground">{p.weight_kg} KG</td>
                          <td className="py-2 pr-3 text-xs text-right text-foreground">{sym}{Number(p.price_per_kg).toLocaleString()}</td>
                          <td className="py-2 text-xs text-right font-medium text-foreground">{sym}{Number(p.total_price).toLocaleString()}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Summary */}
                  <div className="flex flex-wrap items-center justify-end gap-4 text-xs pt-2 border-t border-border">
                    <span className="text-foreground">মোট ওজন: <strong>{p.weight_kg} KG</strong></span>
                    <span className="text-primary">মোট মূল্য: <strong>{sym}{Number(p.total_price).toLocaleString()}</strong></span>
                    {p.exchange_rate != null && p.exchange_rate !== 1 && (
                      <span className="text-muted-foreground">এক্সচেঞ্জ: {p.exchange_rate}</span>
                    )}
                    {p.bdt_paid != null && (
                      <span className="text-success">BDT পেইড: <strong>৳{Number(p.bdt_paid).toLocaleString()}</strong></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TransactionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        personName={drawerName}
        personType="supplier"
      />
    </div>
  );
};

export default PurchaseModule;
