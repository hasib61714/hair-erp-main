import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Printer, FileText } from "lucide-react";

const CompanyPadModule = () => {
  const { lang } = useLanguage();
  const { settings } = useCompanySettings();
  const [padContent, setPadContent] = useState("");

  const handlePrint = () => {
    const logoUrl = settings.logo_url || "";
    const signatureUrl = settings.signature_url || "";

    const watermarkHtml = logoUrl
      ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.05;pointer-events:none;z-index:0;">
           <img src="${logoUrl}" style="width:420px;height:auto;" />
         </div>`
      : "";

    const contentHtml = padContent.trim()
      ? `<div style="white-space:pre-wrap;font-size:14px;line-height:1.8;min-height:500px;position:relative;z-index:1;padding:10px 0;">${padContent}</div>`
      : `<div style="min-height:500px;position:relative;z-index:1;"></div>`;

    const signatureHtml = signatureUrl
      ? `<div style="margin-top:80px;position:relative;z-index:1;">
           <div style="float:right;text-align:center;">
             <img src="${signatureUrl}" style="height:50px;max-width:180px;object-fit:contain;margin-bottom:4px;" />
             <div style="border-top:1px solid #333;width:160px;margin:0 auto;"></div>
             <p style="font-size:11px;margin-top:4px;">মালিকের স্বাক্ষর</p>
             <p style="font-size:9px;color:#888;">Owner's Signature</p>
           </div>
           <div style="clear:both;"></div>
         </div>`
      : `<div style="margin-top:80px;position:relative;z-index:1;">
           <div style="float:right;text-align:center;">
             <div style="border-top:1px solid #333;width:160px;margin-top:50px;"></div>
             <p style="font-size:11px;margin-top:4px;">মালিকের স্বাক্ষর</p>
             <p style="font-size:9px;color:#888;">Owner's Signature</p>
           </div>
           <div style="clear:both;"></div>
         </div>`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Company Pad</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 30px 40px; color: #222; position: relative; margin: 0; }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 12px; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px; }
        .header p { margin: 2px 0; font-size: 12px; color: #666; }
        .header img { max-height: 55px; margin-bottom: 8px; }
        .footer { text-align: center; font-size: 10px; color: #999; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 8px; position: relative; z-index: 1; }
        @media print { body { padding: 20px 30px; } }
      </style></head><body>
      ${watermarkHtml}
      <div class="header">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ""}
        <h1>${settings.company_name}</h1>
        <p>${settings.tagline || ""}</p>
        <p>${settings.company_address || ""} ${settings.company_phone ? "| " + settings.company_phone : ""}</p>
      </div>
      ${contentHtml}
      ${signatureHtml}
      <div class="footer">
        ${settings.company_name} — ${lang === "bn" ? "কোম্পানি প্যাড" : "Company Pad"} | ${new Date().toLocaleDateString("bn-BD")}
      </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{lang === "bn" ? "কোম্পানি প্যাড" : "Company Pad"}</h2>
        <p className="text-xs text-muted-foreground">{lang === "bn" ? "কাস্টম লেখা সহ বা খালি কোম্পানি প্যাড প্রিন্ট করুন" : "Print company pad with custom text or blank"}</p>
      </div>

      {/* Preview Card */}
      <div className="rounded-xl border border-border bg-gradient-card shadow-card overflow-hidden">
        {/* Pad Header Preview */}
        <div className="border-b border-border p-4 text-center bg-secondary/20">
          <div className="flex items-center justify-center gap-3 mb-2">
            {settings.logo_url && (
              <img src={settings.logo_url} alt="Logo" className="h-10 object-contain" />
            )}
            <div>
              <h3 className="text-sm font-bold text-foreground">{settings.company_name}</h3>
              <p className="text-[10px] text-muted-foreground">{settings.tagline}</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">{settings.company_address} {settings.company_phone ? `| ${settings.company_phone}` : ""}</p>
        </div>

        {/* Text Area */}
        <div className="p-4">
          <textarea
            value={padContent}
            onChange={e => setPadContent(e.target.value)}
            placeholder={lang === "bn" ? "এখানে আপনার লেখা টাইপ করুন... (খালি রেখেও প্রিন্ট করা যাবে)" : "Type your content here... (leave empty for blank pad)"}
            className="w-full min-h-[300px] rounded-lg border border-border bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            style={{ lineHeight: "1.8" }}
          />
        </div>

        {/* Signature Preview */}
        <div className="border-t border-border p-4 flex justify-end">
          <div className="text-center">
            {settings.signature_url ? (
              <img src={settings.signature_url} alt="Signature" className="h-10 max-w-[140px] object-contain mx-auto mb-1" />
            ) : (
              <div className="h-10 w-32 border-b border-dashed border-muted-foreground mb-1" />
            )}
            <p className="text-[10px] text-muted-foreground">{lang === "bn" ? "মালিকের স্বাক্ষর" : "Owner's Signature"}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Printer className="w-4 h-4" />
          {padContent.trim()
            ? (lang === "bn" ? "লেখাসহ প্রিন্ট করুন" : "Print with Content")
            : (lang === "bn" ? "খালি প্যাড প্রিন্ট করুন" : "Print Blank Pad")}
        </button>
        {padContent.trim() && (
          <button
            onClick={() => setPadContent("")}
            className="px-4 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-secondary/50 transition-colors"
          >
            {lang === "bn" ? "লেখা মুছুন" : "Clear"}
          </button>
        )}
      </div>
    </div>
  );
};

export default CompanyPadModule;
