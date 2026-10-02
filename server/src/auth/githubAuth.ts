import { Router } from 'express';

export const githubAuthRouter = Router();

/**
 * GET /api/auth/github/config
 * Check if GitHub OAuth is configured in environment
 */
githubAuthRouter.get('/config', (_req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID || null;
  res.json({
    configured: !!clientId,
    clientId,
  });
});

/**
 * GET /api/auth/github/login
 * Redirects user to GitHub OAuth authorization page
 */
githubAuthRouter.get('/login', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>GitHub OAuth Setup Required</title></head>
        <body style="background:#0F1015;color:#E2E8F0;font-family:sans-serif;padding:40px;line-height:1.6;">
          <h2 style="color:#F87171;">GitHub OAuth App Not Configured</h2>
          <p>To enable 1-Click "Sign in with GitHub" on your hosted website:</p>
          <ol>
            <li>Go to <a href="https://github.com/settings/developers" target="_blank" style="color:#38BDF8;">GitHub Developer Settings</a></li>
            <li>Click <strong>New OAuth App</strong></li>
            <li>Set <strong>Authorization callback URL</strong> to: <code>${req.protocol}://${req.get('host')}/api/auth/github/callback</code></li>
            <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> into your server <code>.env</code> file:
              <pre style="background:#181922;padding:12px;border-radius:6px;color:#A78BFA;">GITHUB_CLIENT_ID=your_client_id\nGITHUB_CLIENT_SECRET=your_client_secret</pre>
            </li>
          </ol>
        </body>
      </html>
    `);
  }

  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/github/callback`;
  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,read:user,user:email&redirect_uri=${encodeURIComponent(
    redirectUri
  )}`;

  return res.redirect(githubUrl);
});

/**
 * GET /api/auth/github/callback
 * Exchanges temporary code for access token and returns to frontend
 */
githubAuthRouter.get('/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <body style="background:#0F1015;color:#F87171;font-family:sans-serif;padding:30px;text-align:center;">
          <h2>Authorization Cancelled or Failed</h2>
          <p>${error_description || error}</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).send('Authorization code missing.');
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  try {
    // 1. Exchange code for access_token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = (await tokenRes.json()) as any;
    if (!tokenRes.ok || tokenData.error) {
      return res.status(400).send(`GitHub Token Error: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch authenticated user details
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const userData = (await userRes.json()) as any;

    // 3. Send message back to parent window and close popup
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GitHub Authorization Success</title>
          <style>
            body {
              background: #0F1015;
              color: #E2E8F0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              background: #181922;
              border: 1px solid rgba(46, 204, 113, 0.4);
              border-radius: 12px;
              padding: 32px 40px;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0,0,0,0.5);
              max-width: 360px;
            }
            h2 { color: #2ECC71; margin-top: 0; font-size: 20px; }
            p { color: #94A3B8; font-size: 13.5px; line-height: 1.5; margin: 8px 0; }
            strong { color: #F8FAFC; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>✓ Connected to GitHub!</h2>
            <p>Signed in as <strong>@${userData.login}</strong>.</p>
            <p style="font-size: 12px; color: #717888; margin-top: 14px;">Closing window and returning to Kollab...</p>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GITHUB_OAUTH_SUCCESS',
                  token: ${JSON.stringify(accessToken)},
                  user: ${JSON.stringify(userData)}
                }, '*');
                setTimeout(() => window.close(), 1200);
              }
            } catch (err) {
              console.error(err);
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    return res.status(500).send(`Authentication error: ${err.message}`);
  }
});
