import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MOOLRE_API_BASE = "https://api.moolre.com";

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "+233" + cleaned.substring(1);
  }
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

function toLocalFormat(phone: string): string {
  if (phone.startsWith("+233")) return "0" + phone.slice(4);
  if (phone.startsWith("233")) return "0" + phone.slice(3);
  return phone;
}

function generateOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, "0");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const moolreVasKey = Deno.env.get("MOOLRE_VAS_KEY");

    const serviceClient = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (req.method === "POST" && action === "send") {
      const { phone } = await req.json();
      if (!phone) {
        return new Response(JSON.stringify({ error: "Phone number is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalized = normalizePhone(phone);
      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

      // Invalidate previous OTPs for this phone
      await serviceClient
        .from("phone_otps")
        .delete()
        .eq("phone", normalized);

      // Store new OTP
      const { error: insertErr } = await serviceClient
        .from("phone_otps")
        .insert({ phone: normalized, code, expires_at: expiresAt });

      if (insertErr) throw insertErr;

      // Send SMS via Moolre
      if (!moolreVasKey) {
        console.warn("MOOLRE_VAS_KEY not set, OTP code:", code);
        return new Response(JSON.stringify({ success: true, message: "OTP generated (SMS not configured)" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const localPhone = toLocalFormat(normalized);
      const smsBody = {
        type: "1",
        senderid: "BaptistConf",
        messages: [
          {
            recipient: localPhone,
            message: `Ministers' Conference verification code is: ${code}. It expires in 5 minutes.`,
            ref: `otp-${Date.now()}`,
          },
        ],
      };

      console.log("Sending OTP SMS to:", localPhone);
      const smsRes = await fetch(`${MOOLRE_API_BASE}/open/sms/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-VASKEY": moolreVasKey,
        },
        body: JSON.stringify(smsBody),
      });

      const smsText = await smsRes.text();
      console.log("Moolre OTP SMS response:", smsText);

      return new Response(JSON.stringify({ success: true, message: "OTP sent" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "verify") {
      const { phone, code } = await req.json();
      if (!phone || !code) {
        return new Response(JSON.stringify({ error: "Phone and code are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalized = normalizePhone(phone);
      console.log("Verifying OTP for:", normalized, "code:", code);

      // Look up OTP - fetch without time filter first, then check in code
      const { data: otpRecord, error: lookupErr } = await serviceClient
        .from("phone_otps")
        .select("*")
        .eq("phone", normalized)
        .eq("code", code)
        .eq("verified", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log("OTP lookup result:", JSON.stringify(otpRecord), "error:", lookupErr);

      if (lookupErr) throw lookupErr;

      if (!otpRecord || new Date(otpRecord.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Invalid or expired OTP" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark as verified
      await serviceClient
        .from("phone_otps")
        .update({ verified: true })
        .eq("id", otpRecord.id);

      // Synthetic email for this phone user
      const phoneDigits = normalized.replace("+", "");
      const phoneWithoutPlus = phoneDigits;
      const syntheticEmail = `phone_${phoneDigits}@auth.eventflow.local`;
      const tempPassword = crypto.randomUUID();
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

      // Find all users, look for existing user by phone or synthetic email
      const { data: usersData } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
      const allUsers = usersData?.users || [];
      
      // Find user by phone (with or without +)
      const byPhone = allUsers.find((u: any) => u.phone === normalized || u.phone === phoneWithoutPlus);
      // Find user by synthetic email
      const byEmail = allUsers.find((u: any) => u.email === syntheticEmail);
      
      let targetUser = byPhone || byEmail;

      if (!targetUser) {
        // Create new user
        const { data: newUser, error: createErr } = await serviceClient.auth.admin.createUser({
          email: syntheticEmail,
          email_confirm: true,
          phone: normalized,
          phone_confirm: true,
          password: tempPassword,
          user_metadata: { display_name: normalized },
        });
        if (createErr) throw createErr;
        targetUser = newUser.user;
      } else {
        // If there's a separate user with the synthetic email (orphan), delete it
        if (byPhone && byEmail && byPhone.id !== byEmail.id) {
          console.log("Deleting orphan synthetic email user:", byEmail.id);
          await serviceClient.auth.admin.deleteUser(byEmail.id);
        }

        // Update the target user with synthetic email + new password
        const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUser.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({ email: syntheticEmail, email_confirm: true, password: tempPassword }),
        });
        if (!updateRes.ok) {
          const updateBody = await updateRes.text();
          console.error("Update user error:", updateBody);
          throw new Error("Failed to update user credentials");
        }
      }

      if (!targetUser) throw new Error("Failed to find or create user");

      // Sign in with email/password to get session
      const anonClient = createClient(supabaseUrl, anonKey);
      const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
        email: syntheticEmail,
        password: tempPassword,
      });
      if (signInErr) throw signInErr;

      // Clean up OTPs
      await serviceClient
        .from("phone_otps")
        .delete()
        .eq("phone", normalized);

      return new Response(JSON.stringify({
        success: true,
        session: signInData.session,
        user: signInData.user,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Auth OTP error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
