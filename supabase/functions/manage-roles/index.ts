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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("getClaims error:", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Check admin role using service client
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminCheck } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (req.method === "GET" && action === "list") {
      // List all users with their roles
      const { data: authUsers, error: listErr } = await serviceClient.auth.admin.listUsers({ perPage: 200 });
      if (listErr) throw listErr;

      const { data: allRoles } = await serviceClient.from("user_roles").select("*");

      const users = authUsers.users.map((u: any) => ({
        id: u.id,
        email: u.email || null,
        phone: u.phone || null,
        display_name: u.user_metadata?.display_name || u.email || u.phone || "Unknown",
        created_at: u.created_at,
        roles: (allRoles || []).filter((r: any) => r.user_id === u.id).map((r: any) => r.role),
      }));

      return new Response(JSON.stringify({ users }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "create-user") {
      const { phone, display_name, role } = await req.json();
      if (!phone) {
        return new Response(JSON.stringify({ error: "phone is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Format phone: if starts with 0, assume Ghana (+233)
      let formattedPhone = phone.trim();
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "+233" + formattedPhone.slice(1);
      }
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+" + formattedPhone;
      }

      // Check if user already exists
      const { data: existingUsers } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
      const existing = existingUsers?.users?.find((u: any) => u.phone === formattedPhone);
      if (existing) {
        return new Response(JSON.stringify({ error: "User with this phone already exists", user_id: existing.id }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newUser, error: createErr } = await serviceClient.auth.admin.createUser({
        phone: formattedPhone,
        phone_confirm: true,
        user_metadata: { display_name: display_name || formattedPhone },
      });

      if (createErr) throw createErr;

      // Assign role if provided
      if (role && newUser?.user) {
        await serviceClient
          .from("user_roles")
          .upsert({ user_id: newUser.user.id, role }, { onConflict: "user_id,role" });
      }

      return new Response(JSON.stringify({ success: true, user: { id: newUser.user?.id, phone: formattedPhone } }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "assign") {
      const { user_id, role } = await req.json();
      if (!user_id || !role) {
        return new Response(JSON.stringify({ error: "user_id and role required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: insertErr } = await serviceClient
        .from("user_roles")
        .upsert({ user_id, role }, { onConflict: "user_id,role" });

      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({ success: true, message: `Role '${role}' assigned` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "remove") {
      const { user_id, role } = await req.json();
      if (!user_id || !role) {
        return new Response(JSON.stringify({ error: "user_id and role required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: deleteErr } = await serviceClient
        .from("user_roles")
        .delete()
        .eq("user_id", user_id)
        .eq("role", role);

      if (deleteErr) throw deleteErr;

      return new Response(JSON.stringify({ success: true, message: `Role '${role}' removed` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Manage roles error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
