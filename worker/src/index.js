const ALLOWED_ORIGINS = [
  // "https://jchu10.github.io",
  // "https://localhost:8000",
  // "https://stumpers-verify.jchu10.workers.dev",
  "https://riddles.jchu10.workers.dev",
];

function corsHeaders(origin) {
  if (!ALLOWED_ORIGINS.includes(origin)) {
    console.error("Origin not allowed:", origin); // debug
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    // console.log("Request method:", request.method); // debug
    // console.log("Origin header:", request.headers.get("Origin")); // debug

    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin);

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers });
    }

    const { token } = await request.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "missing token" }),
        { status: 400, headers: { "Content-Type": "application/json", ...headers } }
      );
    }

    const result = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET,
          response: token,
        }),
      }
    );

    const outcome = await result.json();

    return new Response(
      JSON.stringify({
        success: outcome.success,
        challenge_ts: outcome.challenge_ts,
        hostname: outcome.hostname,
        error_codes: outcome["error-codes"],
      }),
      {
        headers: { "Content-Type": "application/json", ...headers },
      }
    );
  },
};
