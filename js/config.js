/**
 * Runtime configuration for Supabase DB/Auth & ImageKit.
 *
 * Security note:
 * - Only public values (Supabase URL, Supabase Anon Key, ImageKit URL Endpoint) live here.
 * - Never place IMAGEKIT_PRIVATE_KEY or SUPABASE_SERVICE_ROLE_KEY in frontend files.
 * - Owners can also configure or override these values inside the #admin Setup tab (stored in localStorage).
 */

const CONFIG_STORAGE_KEY = "arambuuu_cms_config_v1";

export const DEFAULT_CONFIG = {
  // Replace with your Supabase Project URL and Anon Key, or set them via #admin -> Setup
  supabaseUrl: "",
  supabaseAnonKey: "",
  imagekitEndpoint: "https://ik.imagekit.io/arambuuu",
  imagekitUploadFolder: "/Arambuuu/cms",
};

export function getRuntimeConfig() {
  const windowCfg =
    typeof window !== "undefined" && window.__PORTFOLIO_CONFIG__
      ? window.__PORTFOLIO_CONFIG__
      : {};

  let storedCfg = {};
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (raw) storedCfg = JSON.parse(raw);
    } catch {
      storedCfg = {};
    }
  }

  return {
    supabaseUrl: String(storedCfg.supabaseUrl || windowCfg.supabaseUrl || DEFAULT_CONFIG.supabaseUrl || "").trim().replace(/\/$/, ""),
    supabaseAnonKey: String(storedCfg.supabaseAnonKey || windowCfg.supabaseAnonKey || DEFAULT_CONFIG.supabaseAnonKey || "").trim(),
    imagekitEndpoint: String(storedCfg.imagekitEndpoint || windowCfg.imagekitEndpoint || DEFAULT_CONFIG.imagekitEndpoint || "").trim().replace(/\/$/, ""),
    imagekitUploadFolder: String(storedCfg.imagekitUploadFolder || windowCfg.imagekitUploadFolder || DEFAULT_CONFIG.imagekitUploadFolder || "/Arambuuu/cms").trim(),
  };
}

export function saveRuntimeConfig(partial) {
  if (typeof localStorage === "undefined") return;
  const current = getRuntimeConfig();
  const next = {
    supabaseUrl: String(partial.supabaseUrl ?? current.supabaseUrl).trim().replace(/\/$/, ""),
    supabaseAnonKey: String(partial.supabaseAnonKey ?? current.supabaseAnonKey).trim(),
    imagekitEndpoint: String(partial.imagekitEndpoint ?? current.imagekitEndpoint).trim().replace(/\/$/, ""),
    imagekitUploadFolder: String(partial.imagekitUploadFolder ?? current.imagekitUploadFolder).trim(),
  };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearRuntimeConfig() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(CONFIG_STORAGE_KEY);
}

export function isSupabaseConfigured(cfg = getRuntimeConfig()) {
  return Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && /^https:\/\//.test(cfg.supabaseUrl));
}

function sanitizeLocalRelativePath(trimmed) {
  if (
    !trimmed.startsWith("./") ||
    trimmed.includes("..") ||
    trimmed.includes("\\") ||
    !/^\.\/[a-zA-Z0-9._\-\/ %]+$/.test(trimmed)
  ) {
    return "";
  }
  try {
    return encodeURI(decodeURI(trimmed));
  } catch {
    return encodeURI(trimmed);
  }
}

export function sanitizeUrl(raw) {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (trimmed.startsWith("./")) {
    return sanitizeLocalRelativePath(trimmed);
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
  } catch {
    return "";
  }
  return "";
}

/**
 * Resolves either a full URL or an ImageKit relative path and appends free-tier
 * friendly ImageKit optimization transforms (auto format + compression).
 */
export function buildImageKitUrl(rawInput, { width = 960, quality = 80 } = {}) {
  const cfg = getRuntimeConfig();
  const trimmed = String(rawInput || "").trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("./")) {
    return sanitizeLocalRelativePath(trimmed);
  }

  let resolved = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    resolved = `${cfg.imagekitEndpoint}${cleanPath}`;
  }

  const safe = sanitizeUrl(resolved);
  if (!safe) return "";

  try {
    const url = new URL(safe);
    if (url.hostname === "ik.imagekit.io") {
      const trValue = `w-${width},q-${quality},f-auto`;
      if (!url.searchParams.has("tr")) {
        url.searchParams.set("tr", trValue);
      }
      return url.href;
    }
    return safe;
  } catch {
    return "";
  }
}
