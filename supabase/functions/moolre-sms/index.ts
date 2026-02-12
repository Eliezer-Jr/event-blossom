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
    if (!MOOLRE_VAS_KEY) {
      throw new Error("MOOLRE_VAS_KEY is not configured");
    }

    const { recipients, message, sender_id = "EventsApp" } = await req.json();

    if (!recipients || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: recipients, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure recipients is an array
    const recipientList = Array.isArray(recipients) ? recipients : [recipients];

    const smsResponse = await fetch(`${MOOLRE_API_BASE}/api/v1/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-VASKEY": MOOLRE_VAS_KEY,
      },
      body: JSON.stringify({
        sender_id,
        recipients: recipientList,
        message,
      }),
    });

    const smsData = await smsResponse.json();
    console.log("Moolre SMS response:", JSON.stringify(smsData));

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
