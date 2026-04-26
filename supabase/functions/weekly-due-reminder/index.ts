import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all sales with dues
    const { data: sales } = await supabase
      .from("sales")
      .select("buyer_name, due_amount, total_amount");

    // Get all buyer payments
    const { data: payments } = await supabase
      .from("buyer_payments")
      .select("buyer_name, amount");

    // Get buyer profiles with WhatsApp numbers
    const { data: buyers } = await supabase
      .from("buyers")
      .select("name, whatsapp, phone")
      .eq("is_active", true);

    // Calculate net dues per buyer
    const dueMap: Record<string, number> = {};
    (sales || []).forEach((s) => {
      dueMap[s.buyer_name] = (dueMap[s.buyer_name] || 0) + Number(s.due_amount || 0);
    });
    (payments || []).forEach((p) => {
      if (dueMap[p.buyer_name]) {
        dueMap[p.buyer_name] -= Number(p.amount);
      }
    });

    // Filter buyers with outstanding dues > 0
    const buyersWithDues = Object.entries(dueMap)
      .filter(([_, due]) => due > 0)
      .map(([name, due]) => {
        const profile = (buyers || []).find((b) => b.name === name);
        return { name, due, whatsapp: profile?.whatsapp || profile?.phone || null };
      });

    if (buyersWithDues.length === 0) {
      return new Response(JSON.stringify({ message: "No outstanding dues" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get admin user IDs for notifications
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminIds = (adminRoles || []).map((r) => r.user_id);

    // Create notifications for each admin with buyer due summary
    const notifications = [];
    for (const buyer of buyersWithDues) {
      const fmt = (n: number) => "৳" + Math.abs(n).toLocaleString("en-IN");
      const waNumber = buyer.whatsapp?.replace(/[^0-9]/g, "") || "";
      const waMsg = encodeURIComponent(
        `আসসালামু আলাইকুম ${buyer.name}, আপনার কাছে ${fmt(buyer.due)} টাকা বকেয়া আছে। অনুগ্রহ করে পরিশোধ করুন। ধন্যবাদ।`
      );
      const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waMsg}` : null;

      for (const adminId of adminIds) {
        notifications.push({
          user_id: adminId,
          title: `বকেয়া রিমাইন্ডার: ${buyer.name}`,
          message: `${buyer.name} — বকেয়া ${fmt(buyer.due)}${waLink ? ` | WhatsApp: ${waLink}` : " | WhatsApp নম্বর নেই"}`,
          type: "warning",
          link_module: "buyer-due",
        });
      }
    }

    if (notifications.length > 0) {
      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        buyers_notified: buyersWithDues.length,
        notifications_created: notifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
