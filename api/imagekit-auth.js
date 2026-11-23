import crypto from "node:crypto";

/**
 * Vercel Serverless Function: GET/POST /api/imagekit-auth
 *
 * Security boundary:
 * 1. Requires a valid Supabase Auth Bearer JWT from an authenticated admin user.
 * 2. Verifies the JWT directly against Supabase Auth (/auth/v1/user) before signing.
 * 3. Optional ADMIN_EMAIL env restriction locks uploads to a single owner account.
 * 4. Signs ImageKit upload parameters using HMAC-SHA1 without exposing IMAGEKIT_PRIVATE_KEY.
 */
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const imagekitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const imagekitPublicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const imagekitUrlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/arambuuu";

  if (!supabaseUrl || !supabaseAnonKey || !imagekitPrivateKey || !imagekitPublicKey) {
    return res.status(503).json({
      error: "Server environment variables for Supabase or ImageKit are not configured.",
    });
  }

  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: "Missing Authorization Bearer token." });
  }

  const accessToken = match[1].trim();
  if (!accessToken || accessToken.length > 4096) {
    return res.status(401).json({ error: "Invalid Authorization token." });
  }

  try {
    const verifyRes = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!verifyRes.ok) {
      return res.status(401).json({ error: "Supabase session is invalid or expired." });
    }

    const user = await verifyRes.json();
    const allowedEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    if (allowedEmail && String(user?.email || "").toLowerCase() !== allowedEmail) {
      return res.status(403).json({ error: "Account is not authorized to upload media." });
    }

    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
    const signature = crypto
      .createHmac("sha1", imagekitPrivateKey)
      .update(token + expire)
      .digest("hex");

    return res.status(200).json({
      token,
      expire,
      signature,
      publicKey: imagekitPublicKey,
      urlEndpoint: imagekitUrlEndpoint,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to verify session or sign upload request." });
  }
}
