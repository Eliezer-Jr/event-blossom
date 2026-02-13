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

    const status = payload.status ?? payload.data?.txstatus;
    const reference = payload.data?.externalref || payload.reference;
    const transaction_id = payload.data?.transactionid || payload.transaction_id;

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

          // Fetch ticket type name for the SMS
          let ticketTypeName = "Standard";
          const { data: ticketType } = await supabase
            .from("ticket_types")
            .select("name")
            .eq("id", registration.ticket_type_id)
            .single();
          if (ticketType) ticketTypeName = ticketType.name;

          const smsMessage = `Payment confirmed! Hi ${registration.name}, your registration for "${eventTitle}" is confirmed.\nTicket ID: ${registration.ticket_id}\nTicket Type: ${ticketTypeName}\nAmount: GH₵${registration.amount.toLocaleString()}\nSee you there!`;

          const smsResponse = await fetch("https://api.moolre.com/open/sms/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-VASKEY": MOOLRE_VAS_KEY,
            },
            body: JSON.stringify({
              type: 1,
              senderid: "BaptistConf",
              messages: [{
                recipient: registration.phone,
                message: smsMessage,
                ref: `payment-confirmed-${registration.id}-${Date.now()}`,
              }],
            }),
          });
          console.log("SMS response status:", smsResponse.status);
          const smsText = await smsResponse.text();
          console.log("SMS response body:", smsText);
        } catch (smsError) {
          console.error("SMS notification failed:", smsError);
        }
      } else {
        console.warn("MOOLRE_VAS_KEY not configured — skipping SMS");
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
