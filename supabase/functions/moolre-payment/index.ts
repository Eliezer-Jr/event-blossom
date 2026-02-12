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
    const MOOLRE_API_USER = Deno.env.get("MOOLRE_API_USER");
    const MOOLRE_API_KEY = Deno.env.get("MOOLRE_API_KEY");
    const MOOLRE_API_PUBKEY = Deno.env.get("MOOLRE_API_PUBKEY");

    if (!MOOLRE_API_USER || !MOOLRE_API_KEY || !MOOLRE_API_PUBKEY) {
      throw new Error("Moolre API credentials not configured");
    }

    const { phone, amount, currency = "GHS", description, registration_id, event_id, ticket_type_id } = await req.json();

    if (!phone || !amount || !registration_id || !event_id || !ticket_type_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone, amount, registration_id, event_id, ticket_type_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initiate USSD payment collection via Moolre
    const moolreResponse = await fetch(`${MOOLRE_API_BASE}/open/transact/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-USER": MOOLRE_API_USER,
        "X-API-KEY": MOOLRE_API_KEY,
        "X-API-PUBKEY": MOOLRE_API_PUBKEY,
      },
      body: JSON.stringify({
        type: 1,
        channel: "13",
        currency: currency || "GHS",
        payer: phone,
        amount,
        accountnumber: phone,
        externalref: registration_id,
        reference: description || "Event ticket payment",
      }),
    });

    const responseText = await moolreResponse.text();
    console.log("Moolre payment raw response:", responseText);

    let moolreData;
    try {
      moolreData = JSON.parse(responseText);
    } catch {
      console.error("Moolre payment returned non-JSON:", responseText.substring(0, 200));
      return new Response(
        JSON.stringify({ error: "Moolre API returned an invalid response. The API URL or key may be incorrect." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!moolreResponse.ok || moolreData.status !== 1) {
      // Update registration to reflect failed payment initiation
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await supabase
        .from("registrations")
        .update({ payment_status: "failed", status: "cancelled" })
        .eq("id", registration_id);

      return new Response(
        JSON.stringify({
          error: "Payment initiation failed",
          details: moolreData.message || "Unknown error from Moolre",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Payment prompt sent successfully - update registration
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase
      .from("registrations")
      .update({
        payment_status: "pending",
        stripe_payment_intent_id: moolreData.data?.reference || moolreData.data?.transaction_id || null,
      })
      .eq("id", registration_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: moolreData.message || "Payment prompt sent to your phone",
        data: moolreData.data,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Moolre payment error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
