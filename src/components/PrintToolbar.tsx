import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Printer, Download, Filter, Calendar as CalendarIcon, Monitor } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface PrintToolbarProps {
  moduleName: string;
  data: any[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  dateField: string;
  renderPrintTable: (items: any[]) => string;
  canPrint?: boolean;
  canDownload?: boolean;
  cardContainerId?: string;
}

const PrintToolbar = ({ moduleName, data, selectedIds, onSelectionChange, dateField, renderPrintTable, canPrint = true, canDownload = true, cardContainerId }: PrintToolbarProps) => {
  const { t } = useLanguage();
  const { settings } = useCompanySettings();
  const [filterType, setFilterType] = useState<"all" | "today" | "week" | "month" | "year" | "custom">("all");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const yearStr = `${now.getFullYear()}`;

  const getWeekStart = () => {
    const d = new Date(now);
    const day = d.getDay();
    const diff = day === 6 ? 0 : day + 1;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getFilteredData = () => {
    let filtered = data;
    if (filterType === "today") {
      filtered = data.filter(d => d[dateField] === todayStr);
    } else if (filterType === "week") {
      const weekStart = getWeekStart();
      filtered = data.filter(d => {
        const entryDate = new Date(d[dateField]);
        return entryDate >= weekStart && entryDate <= now;
      });
    } else if (filterType === "month") {
      filtered = data.filter(d => d[dateField]?.startsWith(monthStr));
    } else if (filterType === "year") {
      filtered = data.filter(d => d[dateField]?.startsWith(yearStr));
    } else if (filterType === "custom" && fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const to = toDate ? new Date(toDate) : new Date();
      to.setHours(23, 59, 59, 999);
      filtered = data.filter(d => {
        const entryDate = new Date(d[dateField]);
        return entryDate >= from && entryDate <= to;
      });
    }

    if (selectedIds.size > 0) filtered = filtered.filter(d => selectedIds.has(d.id));
    return filtered;
  };

  const getFilterLabel = () => {
    if (filterType === "today") return t("today");
    if (filterType === "week") return t("thisWeek");
    if (filterType === "month") return t("thisMonth");
    if (filterType === "year") return t("thisYear");
    if (filterType === "custom" && fromDate) {
      const fromStr = format(fromDate, "dd/MM/yyyy");
      const toStr = toDate ? format(toDate, "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy");
      return `${fromStr} — ${toStr}`;
    }
    return t("allTime");
  };

  const getBrandingHtml = () => {
    const logoUrl = settings.logo_url || "";
    const signatureUrl = settings.signature_url || "";
    const watermarkHtml = logoUrl
      ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.06;pointer-events:none;z-index:0;">
           <img src="${logoUrl}" style="width:400px;height:auto;" />
         </div>`
      : "";

    const signatureHtml = `<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:60px;position:relative;z-index:1;">
           <div style="text-align:center;">
             ${signatureUrl ? `<img src="${signatureUrl}" style="height:50px;max-width:180px;object-fit:contain;margin-bottom:4px;" />` : '<div style="height:54px;"></div>'}
             <div style="border-top:1px solid #333;width:160px;margin:0 auto;"></div>
             <p style="font-size:11px;margin-top:4px;">মালিকের স্বাক্ষর</p>
             <p style="font-size:9px;color:#888;">Owner's Signature</p>
           </div>
           <div style="text-align:center;">
             <div style="border-top:1px solid #333;width:160px;margin-top:54px;"></div>
             <p style="font-size:11px;margin-top:4px;">ক্রেতার স্বাক্ষর</p>
             <p style="font-size:9px;color:#888;">Buyer's Signature</p>
           </div>
         </div>`;

    const headerHtml = `
      <div class="header">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ""}
        <h1>${settings.company_name}</h1>
        <p>${settings.tagline || ""}</p>
        <p>${settings.company_address || ""} | ${settings.company_phone || ""}</p>
      </div>`;

    return { watermarkHtml, signatureHtml, headerHtml, logoUrl };
  };

  const handlePrint = () => {
    const items = getFilteredData();
    if (items.length === 0) return;

    const filterLabel = getFilterLabel();
    const { watermarkHtml, signatureHtml, headerHtml } = getBrandingHtml();

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${moduleName}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #222; position: relative; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 18px; }
        .header p { margin: 2px 0; font-size: 12px; color: #666; }
        .header img { max-height: 50px; margin-bottom: 6px; }
        .meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 15px; position: relative; z-index: 1; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; position: relative; z-index: 1; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        .total-row { font-weight: bold; background: #f9f9f9; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${watermarkHtml}
      ${headerHtml}
      <div class="meta">
        <div><strong>${moduleName}</strong> — ${filterLabel} ${selectedIds.size > 0 ? `(${selectedIds.size} ${t("selectedItems")})` : ""}</div>
        <div>${items.length} টি এন্ট্রি</div>
      </div>
      ${renderPrintTable(items)}
      ${signatureHtml}
      <p style="font-size:10px;color:#999;margin-top:20px;text-align:center;position:relative;z-index:1;">প্রিন্ট তারিখ: ${new Date().toLocaleDateString("bn-BD")}</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleCardPrint = () => {
    if (!cardContainerId) return;
    const container = document.getElementById(cardContainerId);
    if (!container) return;

    const items = getFilteredData();
    if (items.length === 0) return;

    const filterLabel = getFilterLabel();
    const { watermarkHtml, signatureHtml, headerHtml } = getBrandingHtml();

    // Clone and filter cards: only show selected/filtered items
    const selectedItemIds = new Set(items.map(i => i.id));
    const clonedContainer = container.cloneNode(true) as HTMLElement;
    
    // Remove only action buttons (ones containing SVGs like edit/delete icons), keep name buttons
    clonedContainer.querySelectorAll('button').forEach(btn => {
      const hasSvg = btn.querySelector('svg');
      if (hasSvg) {
        btn.remove();
      } else {
        // Convert name buttons to plain spans so they look normal in print
        const span = document.createElement('span');
        span.innerHTML = btn.innerHTML;
        span.style.fontWeight = '600';
        span.style.color = '#222';
        btn.replaceWith(span);
      }
    });
    clonedContainer.querySelectorAll('[class*="w-5 h-5 rounded border flex items-center"]').forEach(cb => cb.remove());

    // Filter cards to only show items matching our filtered data
    const cards = clonedContainer.children;
    for (let i = cards.length - 1; i >= 0; i--) {
      const card = cards[i] as HTMLElement;
      const cardId = card.getAttribute('data-card-id');
      if (cardId && !selectedItemIds.has(cardId)) {
        card.remove();
      }
    }

    // Get computed styles for the cards
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html><head><title>${moduleName}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #222; position: relative; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 18px; }
        .header p { margin: 2px 0; font-size: 12px; color: #666; }
        .header img { max-height: 50px; margin-bottom: 6px; }
        .meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 15px; position: relative; z-index: 1; }
        
        /* Card styles */
        .print-cards > * {
          border: 1px solid #ddd;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 12px;
          page-break-inside: avoid;
          background: #fff;
        }
        .print-cards table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin: 8px 0;
        }
        .print-cards th, .print-cards td {
          border: 1px solid #e5e5e5;
          padding: 5px 8px;
          text-align: left;
        }
        .print-cards th {
          background: #f9f9f9;
          font-weight: 600;
          font-size: 10px;
          color: #666;
        }
        .print-cards .flex { display: flex; }
        .print-cards .flex-wrap { flex-wrap: wrap; }
        .print-cards .items-center { align-items: center; }
        .print-cards .justify-between { justify-content: space-between; }
        .print-cards .justify-end { justify-content: flex-end; }
        .print-cards .gap-2 { gap: 6px; }
        .print-cards .gap-3 { gap: 8px; }
        .print-cards .gap-4 { gap: 12px; }
        .print-cards .mb-3 { margin-bottom: 8px; }
        .print-cards .mb-4 { margin-bottom: 12px; }
        .print-cards .mt-1 { margin-top: 4px; }
        .print-cards .pt-2 { padding-top: 8px; }
        .print-cards .py-2 { padding: 6px 0; }
        .print-cards .pr-3 { padding-right: 8px; }
        .print-cards .text-sm { font-size: 13px; }
        .print-cards .text-xs { font-size: 11px; }
        .print-cards .text-\\[11px\\], .print-cards [style*="font-size:11px"] { font-size: 10px; }
        .print-cards .text-\\[10px\\] { font-size: 9px; }
        .print-cards .font-semibold { font-weight: 600; }
        .print-cards .font-bold { font-weight: 700; }
        .print-cards .font-medium { font-weight: 500; }
        .print-cards .text-right { text-align: right; }
        .print-cards .border-t { border-top: 1px solid #e5e5e5; }
        .print-cards .border-b { border-bottom: 1px solid #e5e5e5; }
        .print-cards .rounded-full { border-radius: 999px; }
        .print-cards .rounded { border-radius: 4px; }
        .print-cards span[class*="rounded-full"] {
          padding: 2px 6px;
          font-size: 9px;
          border: 1px solid #ddd;
        }
        .print-cards span[class*="rounded bg-"] {
          padding: 2px 6px;
          font-size: 9px;
          background: #f5f5f5;
        }
        /* Hide interactive elements */
        .print-cards svg { display: none; }
        .print-cards [class*="ring-"] { box-shadow: none; }
        .print-cards [class*="cursor-pointer"] { cursor: default; }
        /* Color classes to grayscale for print */
        .print-cards [class*="text-primary"] { color: #333; }
        .print-cards [class*="text-success"] { color: #2a7d2a; }
        .print-cards [class*="text-destructive"] { color: #c33; }
        .print-cards [class*="text-warning"] { color: #a67c00; }
        .print-cards [class*="text-info"] { color: #2563eb; }
        .print-cards [class*="text-muted"] { color: #888; }
        .print-cards [class*="text-foreground"] { color: #222; }
        .print-cards .space-y-4 > * + * { margin-top: 12px; }
        
        @media print { 
          body { padding: 0; }
          .print-cards > * { break-inside: avoid; }
        }
      </style></head><body>
      ${watermarkHtml}
      ${headerHtml}
      <div class="meta">
        <div><strong>${moduleName}</strong> — ${filterLabel} ${selectedIds.size > 0 ? `(${selectedIds.size} ${t("selectedItems")})` : ""}</div>
        <div>${items.length} টি এন্ট্রি</div>
      </div>
      <div class="print-cards">${clonedContainer.innerHTML}</div>
      ${signatureHtml}
      <p style="font-size:10px;color:#999;margin-top:20px;text-align:center;position:relative;z-index:1;">প্রিন্ট তারিখ: ${new Date().toLocaleDateString("bn-BD")}</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === data.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(d => d.id)));
    }
  };

  const filterOptions = [
    { key: "all" as const, label: t("allTime") },
    { key: "today" as const, label: t("today") },
    { key: "week" as const, label: t("thisWeek") },
    { key: "month" as const, label: t("thisMonth") },
    { key: "year" as const, label: t("thisYear") },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="flex items-center gap-1 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        {filterOptions.map(f => (
          <button key={f.key} onClick={() => setFilterType(f.key)}
            className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${filterType === f.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary/50"}`}>
            {f.label}
          </button>
        ))}

        {/* Custom date range */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              onClick={() => setFilterType("custom")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border transition-colors ${filterType === "custom" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary/50"}`}>
              <CalendarIcon className="w-3 h-3" />
              {filterType === "custom" && fromDate
                ? `${format(fromDate, "dd/MM")}${toDate ? ` - ${format(toDate, "dd/MM")}` : ""}`
                : t("customRange")}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium mb-1 text-muted-foreground">{t("fromDate")}</p>
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={(d) => { setFromDate(d); setFilterType("custom"); }}
                  className={cn("p-2 pointer-events-auto")}
                />
              </div>
              <div>
                <p className="text-xs font-medium mb-1 text-muted-foreground">{t("toDate")}</p>
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={(d) => { setToDate(d); setFilterType("custom"); }}
                  disabled={(date) => fromDate ? date < fromDate : false}
                  className={cn("p-2 pointer-events-auto")}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <button onClick={toggleSelectAll}
        className="px-2.5 py-1 rounded-full text-[11px] border border-border text-muted-foreground hover:bg-secondary/50 transition-colors">
        {selectedIds.size === data.length ? "✓ " : ""}{t("selectAll")}
      </button>

      {selectedIds.size > 0 && (
        <span className="text-[11px] text-primary font-medium">{selectedIds.size} {t("selectedItems")}</span>
      )}

      {(canPrint || canDownload) && (
        <div className="ml-auto flex gap-2">
          {canPrint && cardContainerId && (
            <button onClick={handleCardPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/90 text-white text-xs font-medium hover:opacity-90 transition-opacity">
              <Monitor className="w-3.5 h-3.5" />
              কার্ড প্রিন্ট
            </button>
          )}
          {canPrint && (
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
              <Printer className="w-3.5 h-3.5" />
              {selectedIds.size > 0 ? t("printSelected") : t("print")}
            </button>
          )}
          {canDownload && (
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-foreground text-xs font-medium hover:bg-secondary/50 transition-colors">
              <Download className="w-3.5 h-3.5" />{t("downloadPdf")}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PrintToolbar;
