import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Moolre webhook payload:", JSON.stringify(payload));

    const { reference, status, transaction_id, amount } = payload;

    if (!reference && !transaction_id) {
      return new Response(
        JSON.stringify({ error: "Missing reference or transaction_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find registration by reference (registration ID) or by stored transaction ID
    let query = supabase.from("registrations").select("*, events(title)");
    
    if (reference) {
      query = query.eq("id", reference);
    } else {
      query = query.eq("stripe_payment_intent_id", transaction_id);
    }

    const { data: registration, error: fetchError } = await query.single();

    if (fetchError || !registration) {
      console.error("Registration not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Registration not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map Moolre status to our status
    const isSuccess = status === "success" || status === "completed" || status === 1;
    const isFailed = status === "failed" || status === "declined" || status === 0;

    const newPaymentStatus = isSuccess ? "paid" : isFailed ? "failed" : "pending";
    const newStatus = isSuccess ? "confirmed" : isFailed ? "cancelled" : "pending";

    // Update registration
    const { error: updateError } = await supabase
      .from("registrations")
      .update({
        payment_status: newPaymentStatus,
        status: newStatus,
      })
      .eq("id", registration.id);

    if (updateError) {
      console.error("Failed to update registration:", updateError);
      throw updateError;
    }

    // Send SMS notification on successful payment
    if (isSuccess && registration.phone) {
      const MOOLRE_VAS_KEY = Deno.env.get("MOOLRE_VAS_KEY");
      if (MOOLRE_VAS_KEY) {
        try {
          const eventTitle = (registration as any).events?.title || "your event";
          await fetch("https://api.moolre.com/open/sms/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-VASKEY": MOOLRE_VAS_KEY,
            },
            body: JSON.stringify({
              senderid: "BaptistConf",
              recipients: [registration.phone],
              message: `Payment confirmed! Your registration for "${eventTitle}" is now confirmed. Ticket ID: ${registration.ticket_id}. See you there!`,
            }),
          });
        } catch (smsError) {
          console.error("SMS notification failed:", smsError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, status: newStatus, payment_status: newPaymentStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
