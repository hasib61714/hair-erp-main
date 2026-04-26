import { forwardRef } from "react";

type GradeDetail = { grade: string; kg: number; rate: number };
type ChallanData = {
  challan_no: string; challan_date: string; buyer_name: string; buyer_country: string;
  grade_details: GradeDetail[]; total_amount: number; advance_amount: number | null; due_amount: number | null;
};

const countryMap: Record<string, string> = {
  BD: "Bangladesh", IN: "India", CN: "China", OTHER: "Other",
};

const ChallanPrint = forwardRef<HTMLDivElement, { challan: ChallanData }>(({ challan }, ref) => {
  const totalKg = challan.grade_details.reduce((s, g) => s + g.kg, 0);

  return (
    <div ref={ref} className="hidden print:block p-8 bg-white text-black font-sans" style={{ width: "210mm", minHeight: "297mm" }}>
      {/* Company Header */}
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-2xl font-bold tracking-wide">MAHIN ENTERPRISE</h1>
        <p className="text-xs text-gray-600 mt-1">Hair Processing & Trading | Est. 2011</p>
        <p className="text-xs text-gray-500">Head Office: Dhaka, Bangladesh</p>
      </div>

      {/* Challan Title */}
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold border border-black inline-block px-6 py-1">চালান / CHALLAN</h2>
      </div>

      {/* Challan Info */}
      <div className="flex justify-between mb-6 text-sm">
        <div>
          <p><span className="font-semibold">চালান নং / Challan No:</span> {challan.challan_no}</p>
          <p><span className="font-semibold">তারিখ / Date:</span> {challan.challan_date}</p>
        </div>
        <div className="text-right">
          <p><span className="font-semibold">বায়ার / Buyer:</span> {challan.buyer_name}</p>
          <p><span className="font-semibold">দেশ / Country:</span> {countryMap[challan.buyer_country] || challan.buyer_country}</p>
        </div>
      </div>

      {/* Grade Table */}
      <table className="w-full border-collapse border border-black text-sm mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black px-3 py-2 text-left">ক্রম / SL</th>
            <th className="border border-black px-3 py-2 text-left">গ্রেড / Grade</th>
            <th className="border border-black px-3 py-2 text-right">ওজন / Weight (KG)</th>
            <th className="border border-black px-3 py-2 text-right">দর / Rate (৳)</th>
            <th className="border border-black px-3 py-2 text-right">মোট / Amount (৳)</th>
          </tr>
        </thead>
        <tbody>
          {challan.grade_details.map((g, i) => (
            <tr key={i}>
              <td className="border border-black px-3 py-2">{i + 1}</td>
              <td className="border border-black px-3 py-2 font-mono">{g.grade}</td>
              <td className="border border-black px-3 py-2 text-right">{g.kg}</td>
              <td className="border border-black px-3 py-2 text-right">৳{g.rate.toLocaleString()}</td>
              <td className="border border-black px-3 py-2 text-right font-semibold">৳{(g.kg * g.rate).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-bold">
            <td className="border border-black px-3 py-2" colSpan={2}>মোট / Total</td>
            <td className="border border-black px-3 py-2 text-right">{totalKg} KG</td>
            <td className="border border-black px-3 py-2"></td>
            <td className="border border-black px-3 py-2 text-right">৳{Number(challan.total_amount).toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      {/* Payment Summary */}
      <div className="border border-black p-4 mb-8 text-sm">
        <div className="flex justify-between mb-1">
          <span>মোট মূল্য / Total Amount:</span>
          <span className="font-bold">৳{Number(challan.total_amount).toLocaleString()}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>অগ্রিম / Advance:</span>
          <span>৳{Number(challan.advance_amount || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between border-t border-black pt-1 mt-1">
          <span className="font-bold">বকেয়া / Due:</span>
          <span className="font-bold text-lg">৳{Number(challan.due_amount || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Signatures */}
      <div className="flex justify-between mt-16 text-sm">
        <div className="text-center">
          <div className="border-t border-black w-40 mb-1"></div>
          <p>বিক্রেতার স্বাক্ষর</p>
          <p className="text-xs text-gray-500">Seller's Signature</p>
        </div>
        <div className="text-center">
          <div className="border-t border-black w-40 mb-1"></div>
          <p>ক্রেতার স্বাক্ষর</p>
          <p className="text-xs text-gray-500">Buyer's Signature</p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-gray-400 mt-12 border-t border-gray-300 pt-2">
        Mahin Enterprise — Computer Generated Challan
      </div>
    </div>
  );
});

ChallanPrint.displayName = "ChallanPrint";

export default ChallanPrint;
