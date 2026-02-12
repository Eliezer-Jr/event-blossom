import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MOOLRE_API_BASE = "https://api.moolre.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MOOLRE_VAS_KEY = Deno.env.get("MOOLRE_VAS_KEY");
    if (!MOOLRE_VAS_KEY) throw new Error("MOOLRE_VAS_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { event_id, message_template } = await req.json();

    if (!event_id) {
      return new Response(
        JSON.stringify({ error: "event_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch pending registrations with phone numbers for this event
    const { data: pendingRegs, error: fetchErr } = await supabase
      .from("registrations")
      .select("id, name, phone, ticket_id, amount, events(title)")
      .eq("event_id", event_id)
      .eq("payment_status", "pending")
      .not("phone", "is", null);

    if (fetchErr) throw fetchErr;

    if (!pendingRegs || pendingRegs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No pending registrations with phone numbers", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build SMS messages
    const eventTitle = (pendingRegs[0] as any).events?.title || "the event";
    const messages = pendingRegs
      .filter((r: any) => r.phone)
      .map((r: any, i: number) => {
        const text = message_template
          ? message_template
              .replace("{name}", r.name)
              .replace("{event}", eventTitle)
              .replace("{ticket_id}", r.ticket_id)
              .replace("{amount}", `GH₵${r.amount.toLocaleString()}`)
          : `Hi ${r.name}, your registration for "${eventTitle}" is pending payment of GH₵${r.amount.toLocaleString()}. Ticket: ${r.ticket_id}. Please complete payment to confirm your spot.`;

        return {
          recipient: r.phone,
          message: text,
          ref: `pending-${r.id}-${Date.now()}`,
        };
      });

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No valid phone numbers", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smsResponse = await fetch(`${MOOLRE_API_BASE}/open/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-VASKEY": MOOLRE_VAS_KEY,
      },
      body: JSON.stringify({
        type: "1",
        senderid: "BaptistConf",
        messages,
      }),
    });

    const responseText = await smsResponse.text();
    let smsData;
    try {
      smsData = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({ error: "Moolre API returned invalid response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `SMS sent to ${messages.length} pending registrant(s)`,
        sent: messages.length,
        data: smsData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Send pending SMS error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
