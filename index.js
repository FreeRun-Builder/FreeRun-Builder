export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "POST only" }), { status: 405, headers: corsHeaders });
    }

    try {
      const { app_name, html_content } = await request.json();
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
            event_type: "build_apk",
            client_payload: {
              app_name: app_name || "MyAwesomeApp",
              html_content: html_content
            }
          })
        }
      );

      if (githubResponse.status === 204) {
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
      } else {
        const err = await githubResponse.text();
        return new Response(JSON.stringify({ success: false, error: err }), { status: 400, headers: corsHeaders });
      }
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  }
};
