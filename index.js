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
      return new Response(JSON.stringify({ success: false, error: "POST only allowed" }), { status: 405, headers: corsHeaders });
    }

    try {
      const payload = await request.json();
      const { event_type, client_payload } = payload;

      if (!client_payload || !client_payload.buildId || !client_payload.html) {
        return new Response(JSON.stringify({ success: false, error: "Missing required data" }), { status: 400, headers: corsHeaders });
      }

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
              packageName: client_payload.packageName || "com.freerun.app",
              version: client_payload.version || "1.0.0",
              html: client_payload.html,
              icon: client_payload.icon || "none"
            }
          })
        }
      );

      if (githubResponse.status === 204) {
        // 🌟 បង្កើត Link Download ទីតាំង APK ដោយប្រើ Variables នៅក្នុង Worker រួចបោះទៅ Frontend
        const apkDownloadUrl = `https://raw.githubusercontent.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/apk-releases/build_${client_payload.buildId}.apk`;
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Triggered GitHub Actions successfully",
          apk_url: apkDownloadUrl  // <-- បោះ Link ទៅឲ្យ Frontend
        }), { status: 200, headers: corsHeaders });
      } else {
        const err = await githubResponse.text();
        return new Response(JSON.stringify({ success: false, error: err }), { status: githubResponse.status, headers: corsHeaders });
      }
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  }
};
