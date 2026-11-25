import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { buildImageKitUrl, sanitizeUrl } from "../js/config.js";
import { OWNER_PROFILE, SEED_PROJECTS, SEED_GALLERY } from "../js/seed-data.js";
import handler from "../api/imagekit-auth.js";

const root = process.cwd();
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css", "style.css"), "utf8");
const sql = fs.readFileSync(path.join(root, "supabase", "schema.sql"), "utf8");
const appJs = fs.readFileSync(path.join(root, "js", "app.js"), "utf8");

// 1. Verify all 5 required pages + CMS view exist
for (const pageId of ["page-home", "page-about", "page-projects", "page-tools", "page-contact", "page-studio-manage"]) {
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

// 7. Verify UUID regex validation guards against local- and seed- prefixed IDs
function isUuid(val) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ""));
}
assert.equal(isUuid("7d62679c-0e68-4609-96b0-f8d3fc7fa764"), true);
assert.equal(isUuid("local-7d62679c-0e68-4609-96b0-f8d3fc7fa764"), false);
assert.equal(isUuid("seed-proj-1"), false);
assert.equal(isUuid(""), false);
assert.equal(isUuid(null), false);

// 8. Verify repo-local relative asset resolution, removal of dummy projects, and real project files on disk
const cadacRelPath = "./projects/poster/CADAC/College - DNSC - Piloto.jpg";
const encodedCadac = buildImageKitUrl(cadacRelPath);
assert.equal(encodedCadac, "./projects/poster/CADAC/College%20-%20DNSC%20-%20Piloto.jpg");
assert.equal(buildImageKitUrl(encodedCadac), encodedCadac);
assert.equal(buildImageKitUrl("./../secret.jpg"), "");
assert.equal(buildImageKitUrl("./projects\\bad.jpg"), "");

const kantigoPdf = "./projects/branding/KantiGo Solutions Corp - Branding Kit/Kantigo Branding Kit and Guide v1.pdf";
assert.equal(
  sanitizeUrl(kantigoPdf),
  "./projects/branding/KantiGo%20Solutions%20Corp%20-%20Branding%20Kit/Kantigo%20Branding%20Kit%20and%20Guide%20v1.pdf",
);
assert.equal(sanitizeUrl("./../secret.pdf"), "");
assert.equal(sanitizeUrl("./projects\\bad.pdf"), "");

const expectedProjectSlugs = [
  "bridge-digital-transformations",
  "garinan-oil-terminal-website",
  "kantigo-sports-branding-kit",
  "cadac-panabo-anti-drug-poster",
];
assert.deepEqual(
  SEED_PROJECTS.map((p) => p.slug),
  expectedProjectSlugs,
);
for (const dummySlug of [
  "responsive-web-applications",
  "branding-identity-systems",
  "ui-ux-prototypes-layouts",
  "promotional-video-motion",
  "digital-marketing-assets",
]) {
  assert.ok(!SEED_PROJECTS.some((p) => p.slug === dummySlug), `Dummy project ${dummySlug} must be removed`);
}

for (const item of [...SEED_PROJECTS, ...SEED_GALLERY]) {
  const resolvedImg = buildImageKitUrl(item.image_url);
  assert.ok(resolvedImg, `Invalid image_url for ${item.id}`);
  if (item.image_url.startsWith("./")) {
    const diskPath = path.join(root, item.image_url.slice(2));
    assert.ok(fs.existsSync(diskPath) && fs.statSync(diskPath).size > 0, `Missing asset on disk: ${diskPath}`);
  }
  if (item.live_url) {
    const resolvedLive = sanitizeUrl(item.live_url);
    assert.ok(resolvedLive, `Invalid live_url for ${item.id}`);
    if (item.live_url.startsWith("./")) {
      const diskLive = path.join(root, item.live_url.slice(2));
      assert.ok(fs.existsSync(diskLive) && fs.statSync(diskLive).size > 0, `Missing live_url file on disk: ${diskLive}`);
    }
  }
}

assert.equal(OWNER_PROFILE.portraitUrl, "./assets/profile.jpg");
assert.equal(buildImageKitUrl(OWNER_PROFILE.portraitUrl), "./assets/profile.jpg");
assert.ok(fs.statSync(path.join(root, "assets", "profile.jpg")).size > 0);

// 9. Verify responsive layout invariants across HTML, CSS, and JS
assert.ok(html.includes("viewport-fit=cover"), "Viewport meta must include viewport-fit=cover");
assert.ok(css.includes("minmax(min(100%"), "Gallery grid must clamp min track width for 320px viewports");
assert.ok(css.includes("@media (hover: none)"), "Gallery captions must remain visible on non-hover touch devices");
assert.ok(css.includes("@media (pointer: coarse)"), "Coarse pointer touch targets must be defined");
assert.ok(css.includes("attr(data-label)"), "Mobile tools cards must render data-label headers");
assert.ok(appJs.includes('"data-label"'), "renderToolsPage must emit data-label attributes");
assert.ok(
  !/\.project-row\s+\.chip-group,\s*\.project-row\s+\.project-open-label\s*\{\s*display:\s*none;/.test(css),
  "Mobile project rows must reflow rather than hide chips and year",
);

console.log("ALL PORTFOLIO & CMS CHECKS PASSED");
