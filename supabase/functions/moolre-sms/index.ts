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
    const MOOLRE_API_USER = Deno.env.get("MOOLRE_API_USER");
    const MOOLRE_API_KEY = Deno.env.get("MOOLRE_API_KEY");
    const MOOLRE_API_PUBKEY = Deno.env.get("MOOLRE_API_PUBKEY");
    if (!MOOLRE_VAS_KEY) {
      throw new Error("MOOLRE_VAS_KEY is not configured");
    }

    const { recipients, message, sender_id = "BaptistConf" } = await req.json();

    if (!recipients || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: recipients, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Keep recipients in international format (233XXXXXXXXX) as array
    const rawList = Array.isArray(recipients) ? recipients : [recipients];
    const recipientList = rawList.map((r: string) => {
      // Convert local to international if needed
      if (r.startsWith('0')) return '233' + r.substring(1);
      if (r.startsWith('+233')) return r.substring(1);
      return r;
    });

    const requestBody = {
      type: 1,
      senderid: sender_id,
      recipients: recipientList,
      message,
      accountnumber: "10595606038423",
    };

    console.log("Moolre SMS request body:", JSON.stringify(requestBody));

    const smsResponse = await fetch(`${MOOLRE_API_BASE}/open/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-USER": MOOLRE_API_USER || "",
        "X-API-KEY": MOOLRE_API_KEY || "",
        "X-API-PUBKEY": MOOLRE_API_PUBKEY || "",
        "X-API-VASKEY": MOOLRE_VAS_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await smsResponse.text();
    console.log("Moolre SMS raw response:", responseText);

    let smsData;
    try {
      smsData = JSON.parse(responseText);
    } catch {
      console.error("Moolre SMS returned non-JSON:", responseText.substring(0, 200));
      return new Response(
        JSON.stringify({ error: "Moolre API returned an invalid response. The API URL or key may be incorrect." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!smsResponse.ok || smsData.status !== 1) {
      return new Response(
        JSON.stringify({
          error: "SMS send failed",
          details: smsData.message || "Unknown error from Moolre SMS",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: smsData.message || "SMS sent successfully",
        data: smsData.data,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Moolre SMS error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
