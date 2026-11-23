import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { buildImageKitUrl, sanitizeUrl } from "../js/config.js";
import handler from "../api/imagekit-auth.js";

const root = process.cwd();
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css", "style.css"), "utf8");
const sql = fs.readFileSync(path.join(root, "supabase", "schema.sql"), "utf8");
const appJs = fs.readFileSync(path.join(root, "js", "app.js"), "utf8");

// 1. Verify all 5 required pages + CMS view exist
for (const pageId of ["page-home", "page-about", "page-projects", "page-tools", "page-contact", "page-admin"]) {
  assert.ok(html.includes(`id="${pageId}"`), `Missing section ${pageId}`);
}
for (const navLabel of ["Home", "About", "Projects", "My Tools", "Contact"]) {
  assert.ok(html.includes(`>${navLabel}<`), `Missing nav link ${navLabel}`);
}

// 2. Verify self-hosted fonts exist and no external Google Fonts CDN stylesheet is loaded
assert.ok(!html.includes("fonts.googleapis.com"), "External Google Fonts link must not be present");
for (const fontFile of [
  "bricolage-grotesque-600.woff2",
  "bricolage-grotesque-700.woff2",
  "work-sans-400.woff2",
  "work-sans-500.woff2",
  "work-sans-600.woff2",
  "jetbrains-mono-400.woff2",
  "jetbrains-mono-500.woff2",
]) {
  const fp = path.join(root, "fonts", fontFile);
  assert.ok(fs.existsSync(fp) && fs.statSync(fp).size > 5000, `Missing valid font file ${fontFile}`);
  assert.ok(css.includes(fontFile), `Font ${fontFile} not referenced in css/style.css`);
}

// 3. Verify light-mode first tokens and zero innerHTML XSS sinks
assert.match(css, /:root\s*\{[\s\S]*--paper:\s*#f7f6f2/i, "Light mode --paper token must be default in :root");
assert.ok(!appJs.includes("innerHTML"), "app.js must not use innerHTML");

// 4. Verify ImageKit URL helper and XSS URL sanitizer
assert.equal(sanitizeUrl("javascript:alert(1)"), "");
assert.equal(sanitizeUrl("data:text/html,<script>"), "");
assert.equal(sanitizeUrl("https://ik.imagekit.io/arambuuu/test.png"), "https://ik.imagekit.io/arambuuu/test.png");
const transformed = buildImageKitUrl("/Arambuuu/Arambuuu.png", { width: 640, quality: 80 });
assert.ok(transformed.startsWith("https://ik.imagekit.io/arambuuu/Arambuuu/Arambuuu.png"));
assert.ok(transformed.includes("w-640") && transformed.includes("f-auto"));

// 5. Verify Supabase RLS policies cover all 3 tables
for (const tbl of ["public.projects", "public.gallery_items", "public.contact_messages"]) {
  assert.ok(sql.includes(`alter table ${tbl} enable row level security`), `RLS missing on ${tbl}`);
}

// 6. Verify /api/imagekit-auth rejects unauthenticated requests and signs valid authenticated requests
function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.body = obj;
      return this;
    },
  };
  return res;
}

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY = "anon-key";
process.env.IMAGEKIT_PUBLIC_KEY = "public_test";
process.env.IMAGEKIT_PRIVATE_KEY = "private_test";
process.env.ADMIN_EMAIL = "arampiloto@gmail.com";

const r401 = mockRes();
await handler({ method: "POST", headers: {} }, r401);
assert.equal(r401.statusCode, 401);

const origFetch = globalThis.fetch;
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ id: "user-1", email: "arampiloto@gmail.com" }),
});
const r200 = mockRes();
await handler({ method: "POST", headers: { authorization: "Bearer valid-jwt" } }, r200);
globalThis.fetch = origFetch;

assert.equal(r200.statusCode, 200);
assert.equal(r200.body.publicKey, "public_test");
const expectedSig = crypto
  .createHmac("sha1", "private_test")
  .update(r200.body.token + r200.body.expire)
  .digest("hex");
assert.equal(r200.body.signature, expectedSig);

console.log("ALL PORTFOLIO & CMS CHECKS PASSED");
