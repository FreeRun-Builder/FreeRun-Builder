export default {
  async fetch(request, env, ctx) {
    // Standard CORS headers to allow requests from your web app
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Block any non-POST requests
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Method not allowed, POST only" }), { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    try {
      // Parse the JSON payload sent from the frontend application
      const payload = await request.json();
      
      // Extract event_type and client_payload to match the frontend fetch structure
      const { event_type, client_payload } = payload;

      // Validate required data
      if (!client_payload || !client_payload.buildId || !client_payload.html) {
        return new Response(JSON.stringify({ success: false, error: "Missing required payload data (buildId or html)" }), { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      // Forward the request to GitHub Actions Repository Dispatch API
      const githubResponse = await fetch(
        `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/dispatches`,
        {
          method: "POST",
          headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "Cloudflare-Worker"
          },
          body: JSON.stringify({
            event_type: event_type || "build_apk",
            client_payload: {
              buildId: client_payload.buildId,
              appName: client_payload.appName || "MyAwesomeApp",
              html: client_payload.html,
              icon: client_payload.icon || "none"
            }
          })
        }
      );

      // GitHub returns 204 No Content upon a successful dispatch
      if (githubResponse.status === 204) {
        return new Response(JSON.stringify({ success: true, message: "Triggered GitHub Actions successfully" }), { 
          status: 200, 
          headers: corsHeaders 
        });
      } else {
        const err = await githubResponse.text();
        return new Response(JSON.stringify({ success: false, error: err }), { 
          status: githubResponse.status, 
          headers: corsHeaders 
        });
      }
    } catch (e) {
      // Handle any unexpected errors (e.g., JSON parsing error)
      return new Response(JSON.stringify({ success: false, error: e.message }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
};
