import {
  getRuntimeConfig,
  saveRuntimeConfig,
  clearRuntimeConfig,
  isSupabaseConfigured,
  sanitizeUrl,
  buildImageKitUrl,
} from "./config.js";
import {
  OWNER_PROFILE,
  SEED_PROJECTS,
  SEED_GALLERY,
  EXPERIENCE_LIST,
  EDUCATION_RECORD,
  TOOLS_INVENTORY,
} from "./seed-data.js";

const SESSION_KEY = "arambuuu_supabase_session_v1";
const LOCAL_PROJ_KEY = "arambuuu_local_projects_v2";
const LOCAL_GAL_KEY = "arambuuu_local_gallery_v2";
const LOCAL_MSG_KEY = "arambuuu_local_messages_v1";
const THEME_KEY = "arambuuu_theme_v1";

const ROUTES = ["home", "about", "projects", "tools", "contact", "studio-manage"];

const state = {
  route: "home",
  projects: [],
  gallery: [],
  messages: [],
  featuredIndex: 0,
  projectCategory: "All",
  projectSearch: "",
  toolsDiscipline: "All",
  lightboxIndex: 0,
  cmsTab: "projects",
  localMode: false,
  session: null,
};

// ---------- Safe DOM Helpers ----------
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v === true) {
      node.setAttribute(k, "");
    } else {
      node.setAttribute(k, String(v));
    }
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child === null || child === undefined) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function showNotice(target, message, kind = "info") {
  clearNode(target);
  if (!message) return;
  const cls =
    kind === "ok" ? "notice notice-ok" : kind === "err" ? "notice notice-err" : "notice";
  target.appendChild(el("div", { class: cls, text: message }));
}

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isUuid(val) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ""));
}

// ---------- Theme (Light Mode First) ----------
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    if (isDark) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem(THEME_KEY, "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem(THEME_KEY, "dark");
    }
  });
}

// ---------- Session & Minimal Supabase REST/Auth Client ----------
function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.access_token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(session) {
  state.session = session;
  if (session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

async function supabaseRequest(path, { method = "GET", body, auth = false, prefer } = {}) {
  const cfg = getRuntimeConfig();
  if (!isSupabaseConfigured(cfg)) {
    throw new Error("Supabase is not configured.");
  }

  const headers = {
    apikey: cfg.supabaseAnonKey,
    "Content-Type": "application/json",
  };
  if (auth && state.session?.access_token) {
    headers.Authorization = `Bearer ${state.session.access_token}`;
  } else {
    headers.Authorization = `Bearer ${cfg.supabaseAnonKey}`;
  }
  if (prefer) headers.Prefer = prefer;

  const res = await fetch(`${cfg.supabaseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth) {
    saveSession(null);
    updateCmsGate();
    throw new Error("Session expired. Please sign in again.");
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.msg || data?.message || data?.error_description || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

async function signInWithSupabase(email, password) {
  const data = await supabaseRequest("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });
  saveSession(data);
  return data;
}

async function signOutSupabase() {
  try {
    if (state.session?.access_token && isSupabaseConfigured()) {
      await supabaseRequest("/auth/v1/logout", { method: "POST", auth: true });
    }
  } catch {
    // Ignore logout transport errors, always clear local session
  } finally {
    saveSession(null);
    state.localMode = false;
  }
}

// ---------- Data Loading (Supabase -> Local Preview -> Seed) ----------
function readLocalStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore corrupt cache
  }
  return structuredClone(fallback);
}

function writeLocalStore(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

async function loadPortfolioData() {
  const cfg = getRuntimeConfig();
  if (isSupabaseConfigured(cfg)) {
    try {
      const useAuth = Boolean(state.session?.access_token);
      const [projects, gallery] = await Promise.all([
        supabaseRequest("/rest/v1/projects?select=*&order=sort_order.asc,created_at.desc", {
          auth: useAuth,
        }),
        supabaseRequest("/rest/v1/gallery_items?select=*&order=sort_order.asc,created_at.desc", {
          auth: useAuth,
        }),
      ]);
      state.projects = Array.isArray(projects) && projects.length ? projects : structuredClone(SEED_PROJECTS);
      state.gallery = Array.isArray(gallery) && gallery.length ? gallery : structuredClone(SEED_GALLERY);
      if (useAuth) {
        state.messages = await supabaseRequest(
          "/rest/v1/contact_messages?select=*&order=created_at.desc",
          { auth: true },
        );
      }
      renderAll();
      return;
    } catch (err) {
      console.warn("Falling back to local/seed data:", err.message);
    }
  }

  state.projects = readLocalStore(LOCAL_PROJ_KEY, SEED_PROJECTS).sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  state.gallery = readLocalStore(LOCAL_GAL_KEY, SEED_GALLERY).sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  state.messages = readLocalStore(LOCAL_MSG_KEY, []);
  renderAll();
}

// ---------- Routing ----------
function setRoute(nextRoute) {
  const normalized = ROUTES.includes(nextRoute) ? nextRoute : "home";
  state.route = normalized;

  document.querySelectorAll(".page-view").forEach((sec) => {
    sec.classList.toggle("is-active", sec.id === `page-${normalized}`);
  });

  document.querySelectorAll("[data-route]").forEach((link) => {
    const active = link.getAttribute("data-route") === normalized;
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  const titles = {
    home: "Arambuuu — Portfolio",
    about: "About — Arambuuu",
    projects: "Projects & Gallery — Arambuuu",
    tools: "My Tools — Arambuuu",
    contact: "Contact — Arambuuu",
    admin: "CMS — Arambuuu",
    "studio-manage": "Studio CMS — Arambuuu",
  };
  document.title = titles[normalized] || "Arambuuu — Portfolio";

  // Close mobile menu after navigating
  const nav = document.getElementById("primaryNav");
  const toggle = document.getElementById("menuToggleBtn");
  nav?.classList.remove("is-open");
  toggle?.setAttribute("aria-expanded", "false");

  if (normalized === "studio-manage") {
    updateCmsGate();
  }
  window.scrollTo({ top: 0, behavior: "instant" });
}

function initRouter() {
  const parseHash = () => {
    const hash = window.location.hash.replace(/^#/, "").trim().toLowerCase();
    setRoute(ROUTES.includes(hash) ? hash : "home");
  };
  window.addEventListener("hashchange", parseHash);
  parseHash();

  const toggle = document.getElementById("menuToggleBtn");
  const nav = document.getElementById("primaryNav");
  toggle?.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

// ---------- Public Rendering ----------
function getPublishedProjects() {
  return state.projects.filter((p) => p.published !== false);
}

function getPublishedGallery() {
  return state.gallery.filter((g) => g.published !== false);
}

function renderHomeSpecimen() {
  const published = getPublishedProjects();
  const featured = published.filter((p) => p.featured);
  const pool = featured.length ? featured : published;
  if (!pool.length) return;

  if (state.featuredIndex >= pool.length) state.featuredIndex = 0;
  const item = pool[state.featuredIndex];

  const img = document.getElementById("homeSpecimenImg");
  const title = document.getElementById("homeSpecimenTitle");
  const cat = document.getElementById("homeSpecimenCategory");
  const sum = document.getElementById("homeSpecimenSummary");
  const meta = document.getElementById("homeSpecimenMeta");
  const tabs = document.getElementById("homeSpecimenTabs");

  img.src = buildImageKitUrl(item.image_url, { width: 960, quality: 82 });
  img.alt = item.title;
  title.textContent = item.title;
  cat.textContent = item.category;
  sum.textContent = item.summary;
  meta.textContent = [item.client, item.year].filter(Boolean).join(" · ");

  const openSpecimen = () => openProjectDialog(item);
  document.getElementById("homeSpecimenOpenBtn").onclick = openSpecimen;
  const frame = document.getElementById("homeSpecimenFrame");
  frame.onclick = openSpecimen;
  frame.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openSpecimen();
    }
  };

  clearNode(tabs);
  const visibleTabs = pool.slice(0, 4);
  const categoryCounts = visibleTabs.reduce((acc, proj) => {
    acc[proj.category] = (acc[proj.category] || 0) + 1;
    return acc;
  }, {});
  visibleTabs.forEach((proj, idx) => {
    const tabLabel =
      categoryCounts[proj.category] > 1
        ? proj.title.split("—")[0].split("(")[0].trim()
        : proj.category;
    tabs.appendChild(
      el("button", {
        type: "button",
        role: "tab",
        "aria-selected": String(idx === state.featuredIndex),
        class: `specimen-tab${idx === state.featuredIndex ? " is-active" : ""}`,
        text: tabLabel,
        onClick: () => {
          state.featuredIndex = idx;
          renderHomeSpecimen();
        },
      }),
    );
  });
}

function buildProjectRow(project) {
  const tags = Array.isArray(project.tags) ? project.tags.slice(0, 3) : [];
  const row = el(
    "article",
    {
      class: "project-row",
      tabindex: "0",
      role: "button",
      "aria-label": `Open case study for ${project.title}`,
      onClick: () => openProjectDialog(project),
      onKeydown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openProjectDialog(project);
        }
      },
    },
    [
      el("img", {
        class: "project-thumb",
        src: buildImageKitUrl(project.image_url, { width: 240, quality: 75 }),
        alt: project.title,
        loading: "lazy",
      }),
      el("div", {}, [
        el("div", { class: "project-row-title", text: project.title }),
        el("div", { class: "project-row-summary", text: project.summary }),
      ]),
      el(
        "div",
        { class: "chip-group" },
        [
          el("span", { class: "chip chip-accent", text: project.category }),
          ...tags.map((t) => el("span", { class: "chip", text: t })),
        ],
      ),
      el("span", { class: "mono-meta project-open-label", text: `${project.year || "2026"} ↗` }),
    ],
  );
  return row;
}

function buildGalleryCard(item, indexInList) {
  return el(
    "article",
    {
      class: "gallery-card",
      role: "button",
      tabindex: "0",
      "aria-label": `View ${item.title} in lightbox`,
      onClick: () => openGalleryDialog(indexInList),
      onKeydown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openGalleryDialog(indexInList);
        }
      },
    },
    [
      el(
        "div",
        {
          class: "gallery-media",
          "data-ratio": item.aspect_ratio || "4/3",
        },
        el("img", {
          src: buildImageKitUrl(item.image_url, { width: 720, quality: 80 }),
          alt: item.title,
          loading: "lazy",
        }),
      ),
      el("div", { class: "gallery-info" }, [
        el("div", { class: "specimen-top" }, [
          el("h3", { class: "gallery-title", text: item.title }),
          el("span", { class: "chip", text: item.category }),
        ]),
        item.caption ? el("p", { class: "gallery-caption", text: item.caption }) : null,
        el("div", {
          class: "mono-meta",
          text: [item.tool_used, item.year].filter(Boolean).join(" · "),
        }),
      ]),
    ],
  );
}

function renderHome() {
  renderHomeSpecimen();

  const ledger = document.getElementById("homeProjectLedger");
  clearNode(ledger);
  const topProjects = getPublishedProjects().slice(0, 4);
  if (!topProjects.length) {
    ledger.appendChild(el("div", { class: "empty-state", text: "No published projects yet." }));
  } else {
    topProjects.forEach((p) => ledger.appendChild(buildProjectRow(p)));
  }

  const galGrid = document.getElementById("homeGalleryGrid");
  clearNode(galGrid);
  const publishedGal = getPublishedGallery();
  if (!publishedGal.length) {
    galGrid.appendChild(el("div", { class: "empty-state", text: "No published gallery items yet." }));
  } else {
    publishedGal.slice(0, 3).forEach((item, idx) => galGrid.appendChild(buildGalleryCard(item, idx)));
  }
}

function renderAbout() {
  const expWrap = document.getElementById("aboutExperienceList");
  clearNode(expWrap);
  EXPERIENCE_LIST.forEach((exp) => {
    expWrap.appendChild(
      el("article", { class: "timeline-item" }, [
        el("div", { class: "timeline-period", text: exp.period }),
        el("div", {}, [
          el("h3", { class: "timeline-role", text: exp.role }),
          el("div", { class: "timeline-org", text: exp.company }),
          el(
            "ul",
            { class: "timeline-bullets" },
            exp.bullets.map((b) => el("li", { text: b })),
          ),
          el(
            "div",
            { class: "chip-group" },
            exp.tools.map((t) => el("span", { class: "chip", text: t })),
          ),
        ]),
      ]),
    );
  });

  const eduWrap = document.getElementById("aboutEducationBox");
  clearNode(eduWrap);
  eduWrap.appendChild(
    el("article", { class: "timeline-item" }, [
      el("div", { class: "timeline-period", text: EDUCATION_RECORD.period }),
      el("div", {}, [
        el("h3", { class: "timeline-role", text: EDUCATION_RECORD.degree }),
        el("div", { class: "timeline-org", text: EDUCATION_RECORD.institution }),
        el("p", { class: "body-copy", text: EDUCATION_RECORD.location }),
      ]),
    ]),
  );
}

function renderProjectsPage() {
  const filterWrap = document.getElementById("projectCategoryFilters");
  const categories = ["All", "Web Dev", "UI/UX", "Branding", "Print & Poster", "Motion & Video", "Digital Marketing"];
  clearNode(filterWrap);
  categories.forEach((cat) => {
    filterWrap.appendChild(
      el("button", {
        type: "button",
        class: "filter-pill",
        "aria-pressed": String(state.projectCategory === cat),
        text: cat,
        onClick: () => {
          state.projectCategory = cat;
          renderProjectsPage();
        },
      }),
    );
  });

  const q = state.projectSearch.trim().toLowerCase();
  const filteredProjects = getPublishedProjects().filter((p) => {
    const catOk = state.projectCategory === "All" || p.category === state.projectCategory;
    if (!catOk) return false;
    if (!q) return true;
    const hay = [p.title, p.summary, p.client, p.category, ...(p.tags || [])].join(" ").toLowerCase();
    return hay.includes(q);
  });

  const ledger = document.getElementById("projectsLedger");
  clearNode(ledger);
  if (!filteredProjects.length) {
    ledger.appendChild(
      el("div", { class: "empty-state", text: "No projects match the current filter." }),
    );
  } else {
    filteredProjects.forEach((p) => ledger.appendChild(buildProjectRow(p)));
  }

  const filteredGallery = getPublishedGallery().filter((g) => {
    const catOk =
      state.projectCategory === "All" ||
      g.category.toLowerCase().includes(state.projectCategory.toLowerCase());
    if (!catOk) return false;
    if (!q) return true;
    const hay = [g.title, g.caption, g.category, g.tool_used].join(" ").toLowerCase();
    return hay.includes(q);
  });

  const galGrid = document.getElementById("galleryGrid");
  clearNode(galGrid);
  if (!filteredGallery.length) {
    galGrid.appendChild(
      el("div", { class: "empty-state", text: "No gallery artworks match the current filter." }),
    );
  } else {
    const allPublished = getPublishedGallery();
    filteredGallery.forEach((item) => {
      const realIndex = allPublished.findIndex((x) => x.id === item.id);
      galGrid.appendChild(buildGalleryCard(item, realIndex >= 0 ? realIndex : 0));
    });
  }
}

function renderToolsPage() {
  const disciplines = ["All", "Front-End & Web", "UI/UX & Product", "Branding & Print", "Motion & Video"];
  const pills = document.getElementById("toolsFilterPills");
  clearNode(pills);
  disciplines.forEach((d) => {
    pills.appendChild(
      el("button", {
        type: "button",
        class: "filter-pill",
        "aria-pressed": String(state.toolsDiscipline === d),
        text: d,
        onClick: () => {
          state.toolsDiscipline = d;
          renderToolsPage();
        },
      }),
    );
  });

  const items = TOOLS_INVENTORY.filter(
    (t) => state.toolsDiscipline === "All" || t.discipline === state.toolsDiscipline,
  );
  document.getElementById("toolsCountMeta").textContent = `${items.length} tools listed`;

  const tbody = document.getElementById("toolsTableBody");
  clearNode(tbody);
  items.forEach((tool) => {
    tbody.appendChild(
      el("tr", {}, [
        el("td", { class: "tool-name-cell", text: tool.name }),
        el("td", {}, el("span", { class: "chip", text: tool.discipline })),
        el("td", { text: tool.usage }),
        el("td", { class: "mono-meta", text: tool.pairing }),
      ]),
    );
  });
}

// ---------- Native Dialogs ----------
function openProjectDialog(project) {
  const dlg = document.getElementById("projectDialog");
  document.getElementById("dlgProjectCategory").textContent = project.category;
  document.getElementById("dlgProjectTitle").textContent = project.title;
  document.getElementById("dlgProjectMeta").textContent = [project.client, project.year]
    .filter(Boolean)
    .join(" · ");
  document.getElementById("dlgProjectDesc").textContent = project.description || project.summary;

  const img = document.getElementById("dlgProjectImg");
  img.src = buildImageKitUrl(project.image_url, { width: 1200, quality: 88 });
  img.alt = project.title;

  const tagsWrap = document.getElementById("dlgProjectTags");
  clearNode(tagsWrap);
  (project.tags || []).forEach((t) => tagsWrap.appendChild(el("span", { class: "chip", text: t })));

  const link = document.getElementById("dlgProjectLink");
  const safeHref = sanitizeUrl(project.live_url);
  if (safeHref) {
    link.href = safeHref;
    link.textContent = safeHref.toLowerCase().endsWith(".pdf")
      ? "View Brand Guide (PDF)"
      : "Visit Live Website";
    link.hidden = false;
  } else {
    link.hidden = true;
  }
  dlg.showModal();
}

function openGalleryDialog(index) {
  const list = getPublishedGallery();
  if (!list.length) return;
  state.lightboxIndex = ((index % list.length) + list.length) % list.length;
  const item = list[state.lightboxIndex];

  const dlg = document.getElementById("galleryDialog");
  const img = document.getElementById("dlgGalleryImg");
  img.src = buildImageKitUrl(item.image_url, { width: 1600, quality: 90 });
  img.alt = item.title;
  document.getElementById("dlgGalleryTitle").textContent = item.title;
  document.getElementById("dlgGalleryCategory").textContent = item.category;
  document.getElementById("dlgGalleryCaption").textContent = item.caption || "";
  document.getElementById("dlgGalleryMeta").textContent = [
    item.tool_used,
    item.year,
    `${state.lightboxIndex + 1} / ${list.length}`,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!dlg.open) dlg.showModal();
}

function initDialogs() {
  const pDlg = document.getElementById("projectDialog");
  document.getElementById("dlgProjectClose").addEventListener("click", () => pDlg.close());
  pDlg.addEventListener("click", (e) => {
    if (e.target === pDlg) pDlg.close();
  });

  const gDlg = document.getElementById("galleryDialog");
  document.getElementById("dlgGalleryClose").addEventListener("click", () => gDlg.close());
  document.getElementById("dlgGalleryPrev").addEventListener("click", () =>
    openGalleryDialog(state.lightboxIndex - 1),
  );
  document.getElementById("dlgGalleryNext").addEventListener("click", () =>
    openGalleryDialog(state.lightboxIndex + 1),
  );
  gDlg.addEventListener("click", (e) => {
    if (e.target === gDlg) gDlg.close();
  });
  gDlg.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") openGalleryDialog(state.lightboxIndex - 1);
    if (e.key === "ArrowRight") openGalleryDialog(state.lightboxIndex + 1);
  });
}

// ---------- Contact Form ----------
function initContactForm() {
  const form = document.getElementById("contactForm");
  const feedback = document.getElementById("contactFeedback");
  const submitBtn = document.getElementById("contactSubmitBtn");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showNotice(feedback, "");

    // Honeypot check
    const trap = document.getElementById("contactWebsite")?.value;
    if (trap) {
      form.reset();
      showNotice(feedback, "Thank you. Your inquiry has been received.", "ok");
      return;
    }

    const sender_name = document.getElementById("contactName").value.trim();
    const sender_email = document.getElementById("contactEmail").value.trim();
    const subject = document.getElementById("contactSubject").value.trim();
    const message = document.getElementById("contactMessage").value.trim();

    if (!sender_name || !sender_email || !message) {
      showNotice(feedback, "Please enter your name, email address, and message.", "err");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    try {
      if (isSupabaseConfigured()) {
        await supabaseRequest("/rest/v1/contact_messages", {
          method: "POST",
          body: { sender_name, sender_email, subject, message, status: "unread" },
        });
        showNotice(feedback, "Message delivered securely to Supabase. I will reply soon.", "ok");
      } else {
        const localMsgs = readLocalStore(LOCAL_MSG_KEY, []);
        localMsgs.unshift({
          id: crypto.randomUUID(),
          sender_name,
          sender_email,
          subject,
          message,
          status: "unread",
          created_at: new Date().toISOString(),
        });
        writeLocalStore(LOCAL_MSG_KEY, localMsgs);
        state.messages = localMsgs;
        const mailto = `mailto:${OWNER_PROFILE.email}?subject=${encodeURIComponent(
          subject || `Portfolio Inquiry from ${sender_name}`,
        )}&body=${encodeURIComponent(`${message}\n\nFrom: ${sender_name} (${sender_email})`)}`;
        document.getElementById("contactMailtoFallback").href = mailto;
        showNotice(
          feedback,
          "Saved to local CMS inbox (Supabase not yet configured). You can also click Open Email Client.",
          "ok",
        );
      }
      form.reset();
    } catch (err) {
      showNotice(feedback, `Could not submit inquiry: ${err.message}`, "err");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Message";
    }
  });
}

// ---------- CMS Workspace & ImageKit Uploads ----------
function updateCmsGate() {
  const cfg = getRuntimeConfig();
  const configured = isSupabaseConfigured(cfg);
  const authed = Boolean(state.session?.access_token) || state.localMode;

  document.getElementById("cmsAuthGate").hidden = authed;
  document.getElementById("cmsWorkspace").hidden = !authed;
  document.getElementById("cmsSignOutBtn").hidden = !authed;

  const status = document.getElementById("cmsConnectionStatus");
  if (state.localMode && !state.session) {
    status.textContent = "Local Preview Mode (changes stored in this browser)";
  } else if (configured && state.session) {
    status.textContent = `Connected to Supabase · Signed in as ${state.session.user?.email || "Owner"}`;
  } else if (configured) {
    status.textContent = "Supabase connected · Sign in required for edits";
  } else {
    status.textContent = "Supabase not configured · Save keys below or launch Local Preview Mode";
  }

  document.getElementById("cfgSupabaseUrl").value = cfg.supabaseUrl;
  document.getElementById("cfgSupabaseAnon").value = cfg.supabaseAnonKey;
  document.getElementById("cfgImageKitEndpoint").value = cfg.imagekitEndpoint;
  document.getElementById("cfgImageKitFolder").value = cfg.imagekitUploadFolder;

  if (authed) {
    renderCmsLists();
    renderCmsSettings();
  }
}

async function uploadFileToImageKit(file, statusEl, urlInputEl, previewEl) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    statusEl.textContent = "Only image files are allowed.";
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    statusEl.textContent = "File exceeds 10 MB limit.";
    return;
  }
  if (!state.session?.access_token) {
    statusEl.textContent = "Sign in with Supabase first, or paste an ImageKit URL.";
    return;
  }

  statusEl.textContent = "Authorizing upload…";
  try {
    const authRes = await fetch("/api/imagekit-auth", {
      method: "POST",
      headers: { Authorization: `Bearer ${state.session.access_token}` },
    });
    const authData = await authRes.json();
    if (!authRes.ok) {
      throw new Error(authData?.error || "Upload authorization failed.");
    }

    statusEl.textContent = "Uploading to ImageKit…";
    const cfg = getRuntimeConfig();
    const fd = new FormData();
    fd.append("file", file);
    fd.append("fileName", file.name);
    fd.append("publicKey", authData.publicKey);
    fd.append("signature", authData.signature);
    fd.append("expire", String(authData.expire));
    fd.append("token", authData.token);
    fd.append("useUniqueFileName", "true");
    if (cfg.imagekitUploadFolder) fd.append("folder", cfg.imagekitUploadFolder);

    const upRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      body: fd,
    });
    const upData = await upRes.json();
    if (!upRes.ok || !upData.url) {
      throw new Error(upData?.message || "ImageKit upload failed.");
    }

    urlInputEl.value = upData.url;
    previewEl.src = buildImageKitUrl(upData.url, { width: 480, quality: 80 });
    previewEl.hidden = false;
    statusEl.textContent = "Uploaded to ImageKit.";
  } catch (err) {
    statusEl.textContent = `Upload error: ${err.message}`;
  }
}

function bindImagePreviewInput(inputEl, previewEl) {
  const sync = () => {
    const resolved = buildImageKitUrl(inputEl.value, { width: 480, quality: 80 });
    if (resolved) {
      previewEl.src = resolved;
      previewEl.hidden = false;
    } else {
      previewEl.hidden = true;
    }
  };
  inputEl.addEventListener("input", sync);
  return sync;
}

function renderCmsLists() {
  // Projects list
  const pList = document.getElementById("cmsProjectsList");
  clearNode(pList);
  state.projects.forEach((p, idx) => {
    pList.appendChild(
      el("div", { class: "cms-item" }, [
        el("div", { class: "cms-item-left" }, [
          el("img", {
            class: "cms-item-thumb",
            src: buildImageKitUrl(p.image_url, { width: 160, quality: 75 }),
            alt: p.title,
          }),
          el("div", { style: "min-width: 0" }, [
            el("div", { class: "cms-item-title", text: p.title }),
            el("div", {
              class: "mono-meta",
              text: `${p.category} · ${p.published ? "Published" : "Draft"}${p.featured ? " · Featured" : ""}`,
            }),
          ]),
        ]),
        el("div", { class: "cms-item-actions" }, [
          el("button", {
            type: "button",
            class: "btn btn-ghost btn-sm",
            text: "↑",
            disabled: idx === 0,
            "aria-label": `Move ${p.title} up`,
            onClick: () => moveProject(idx, -1),
          }),
          el("button", {
            type: "button",
            class: "btn btn-ghost btn-sm",
            text: "↓",
            disabled: idx === state.projects.length - 1,
            "aria-label": `Move ${p.title} down`,
            onClick: () => moveProject(idx, 1),
          }),
          el("button", {
            type: "button",
            class: "btn btn-secondary btn-sm",
            text: "Edit",
            onClick: () => populateProjectForm(p),
          }),
          el("button", {
            type: "button",
            class: "btn btn-danger btn-sm",
            text: "Delete",
            onClick: () => deleteProject(p),
          }),
        ]),
      ]),
    );
  });

  // Gallery list
  const gList = document.getElementById("cmsGalleryList");
  clearNode(gList);
  state.gallery.forEach((g) => {
    gList.appendChild(
      el("div", { class: "cms-item" }, [
        el("div", { class: "cms-item-left" }, [
          el("img", {
            class: "cms-item-thumb",
            src: buildImageKitUrl(g.image_url, { width: 160, quality: 75 }),
            alt: g.title,
          }),
          el("div", { style: "min-width: 0" }, [
            el("div", { class: "cms-item-title", text: g.title }),
            el("div", {
              class: "mono-meta",
              text: `${g.category} · ${g.aspect_ratio || "4/3"} · ${g.published ? "Published" : "Draft"}`,
            }),
          ]),
        ]),
        el("div", { class: "cms-item-actions" }, [
          el("button", {
            type: "button",
            class: "btn btn-secondary btn-sm",
            text: "Edit",
            onClick: () => populateGalleryForm(g),
          }),
          el("button", {
            type: "button",
            class: "btn btn-danger btn-sm",
            text: "Delete",
            onClick: () => deleteGalleryItem(g),
          }),
        ]),
      ]),
    );
  });

  // Inquiries list
  const mList = document.getElementById("cmsMessagesList");
  clearNode(mList);
  if (!state.messages.length) {
    mList.appendChild(el("div", { class: "empty-state", text: "No inquiries received yet." }));
  } else {
    state.messages.forEach((m) => {
      mList.appendChild(
        el("div", { class: "cms-item", style: "align-items: flex-start" }, [
          el("div", { style: "display: grid; gap: 4px" }, [
            el("div", { class: "cms-item-title", text: `${m.sender_name} (${m.sender_email})` }),
            el("div", {
              class: "mono-meta",
              text: [m.subject || "General Inquiry", m.status, m.created_at?.slice(0, 10)]
                .filter(Boolean)
                .join(" · "),
            }),
            el("p", { class: "body-copy", text: m.message }),
          ]),
          el("div", { class: "cms-item-actions" }, [
            el("button", {
              type: "button",
              class: "btn btn-danger btn-sm",
              text: "Delete",
              onClick: () => deleteMessage(m),
            }),
          ]),
        ]),
      );
    });
  }
}

function renderCmsSettings() {
  const cfg = getRuntimeConfig();
  const wrap = document.getElementById("cmsSettingsSummary");
  clearNode(wrap);
  const rows = [
    ["Supabase URL", cfg.supabaseUrl || "(Not set — using local/seed mode)"],
    ["ImageKit Endpoint", cfg.imagekitEndpoint],
    ["Upload Folder", cfg.imagekitUploadFolder],
    ["Active Projects", `${state.projects.length} total`],
    ["Active Gallery Items", `${state.gallery.length} total`],
  ];
  rows.forEach(([k, v]) => {
    wrap.appendChild(
      el("div", { class: "contact-row" }, [
        el("span", { class: "mono-meta", text: k }),
        el("span", { class: "mono-meta", text: v }),
      ]),
    );
  });
}

function populateProjectForm(p) {
  document.getElementById("projFormHeading").textContent = "Edit Project";
  document.getElementById("projId").value = p.id;
  document.getElementById("projTitle").value = p.title;
  document.getElementById("projSlug").value = p.slug || slugify(p.title);
  document.getElementById("projCategory").value = p.category;
  document.getElementById("projYear").value = p.year || "2026";
  document.getElementById("projClient").value = p.client || "";
  document.getElementById("projLiveUrl").value = p.live_url || "";
  document.getElementById("projTags").value = (p.tags || []).join(", ");
  document.getElementById("projSummary").value = p.summary || "";
  document.getElementById("projDescription").value = p.description || "";
  document.getElementById("projImageUrl").value = p.image_url || "";
  document.getElementById("projFeatured").checked = Boolean(p.featured);
  document.getElementById("projPublished").checked = p.published !== false;
  const preview = document.getElementById("projImagePreview");
  const resolved = buildImageKitUrl(p.image_url, { width: 480, quality: 80 });
  preview.src = resolved;
  preview.hidden = !resolved;
}

function resetProjectForm() {
  document.getElementById("projFormHeading").textContent = "Add Project";
  document.getElementById("cmsProjectForm").reset();
  document.getElementById("projId").value = "";
  document.getElementById("projPublished").checked = true;
  document.getElementById("projImagePreview").hidden = true;
  document.getElementById("projUploadStatus").textContent = "";
  showNotice(document.getElementById("projFormFeedback"), "");
}

function populateGalleryForm(g) {
  document.getElementById("galFormHeading").textContent = "Edit Gallery Artwork";
  document.getElementById("galId").value = g.id;
  document.getElementById("galTitle").value = g.title;
  document.getElementById("galCategory").value = g.category;
  document.getElementById("galAspectRatio").value = g.aspect_ratio || "4/3";
  document.getElementById("galYear").value = g.year || "2026";
  document.getElementById("galTool").value = g.tool_used || "";
  document.getElementById("galCaption").value = g.caption || "";
  document.getElementById("galImageUrl").value = g.image_url || "";
  document.getElementById("galPublished").checked = g.published !== false;
  const preview = document.getElementById("galImagePreview");
  const resolved = buildImageKitUrl(g.image_url, { width: 480, quality: 80 });
  preview.src = resolved;
  preview.hidden = !resolved;
}

function resetGalleryForm() {
  document.getElementById("galFormHeading").textContent = "Add Gallery Artwork";
  document.getElementById("cmsGalleryForm").reset();
  document.getElementById("galId").value = "";
  document.getElementById("galPublished").checked = true;
  document.getElementById("galImagePreview").hidden = true;
  document.getElementById("galUploadStatus").textContent = "";
  showNotice(document.getElementById("galFormFeedback"), "");
}

async function moveProject(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= state.projects.length) return;
  const copy = [...state.projects];
  const [moved] = copy.splice(index, 1);
  copy.splice(target, 0, moved);
  copy.forEach((p, idx) => {
    p.sort_order = idx + 1;
  });
  state.projects = copy;

  if (isSupabaseConfigured() && state.session?.access_token) {
    await Promise.all(
      copy
        .filter((p) => isUuid(p.id))
        .map((p) =>
          supabaseRequest(`/rest/v1/projects?id=eq.${encodeURIComponent(p.id)}`, {
            method: "PATCH",
            auth: true,
            body: { sort_order: p.sort_order },
          }),
        ),
    );
  }
  writeLocalStore(LOCAL_PROJ_KEY, state.projects);
  renderAll();
}

async function deleteProject(project) {
  if (!window.confirm(`Delete project "${project.title}"?`)) return;
  if (isSupabaseConfigured() && state.session?.access_token && isUuid(project.id)) {
    await supabaseRequest(`/rest/v1/projects?id=eq.${encodeURIComponent(project.id)}`, {
      method: "DELETE",
      auth: true,
    });
  }
  state.projects = state.projects.filter((p) => p.id !== project.id);
  writeLocalStore(LOCAL_PROJ_KEY, state.projects);
  renderAll();
}

async function deleteGalleryItem(item) {
  if (!window.confirm(`Delete gallery item "${item.title}"?`)) return;
  if (isSupabaseConfigured() && state.session?.access_token && isUuid(item.id)) {
    await supabaseRequest(`/rest/v1/gallery_items?id=eq.${encodeURIComponent(item.id)}`, {
      method: "DELETE",
      auth: true,
    });
  }
  state.gallery = state.gallery.filter((g) => g.id !== item.id);
  writeLocalStore(LOCAL_GAL_KEY, state.gallery);
  renderAll();
}

async function deleteMessage(msg) {
  if (isSupabaseConfigured() && state.session?.access_token && isUuid(msg.id)) {
    await supabaseRequest(`/rest/v1/contact_messages?id=eq.${encodeURIComponent(msg.id)}`, {
      method: "DELETE",
      auth: true,
    });
  }
  state.messages = state.messages.filter((m) => m.id !== msg.id);
  writeLocalStore(LOCAL_MSG_KEY, state.messages);
  renderCmsLists();
}

function initCms() {
  // Login & Local Preview
  document.getElementById("cmsLoginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fb = document.getElementById("cmsLoginFeedback");
    showNotice(fb, "");
    const email = document.getElementById("cmsLoginEmail").value.trim().toLowerCase();
    const password = document.getElementById("cmsLoginPassword").value;
    const btn = document.getElementById("cmsLoginSubmitBtn");

    // Local seeded admin login when Supabase is not yet connected
    if (!isSupabaseConfigured()) {
      if (email === "arampiloto@gmail.com" && password === "12345678") {
        state.localMode = true;
        state.session = {
          access_token: "local-seeded-token",
          user: { email: "arampiloto@gmail.com" },
        };
        saveSession(state.session);
        await loadPortfolioData();
        updateCmsGate();
        return;
      }
      showNotice(
        fb,
        "Invalid credentials. Default seeded admin: arampiloto@gmail.com / 12345678",
        "err",
      );
      return;
    }

    btn.disabled = true;
    btn.textContent = "Signing in…";
    try {
      await signInWithSupabase(email, password);
      await loadPortfolioData();
      updateCmsGate();
    } catch (err) {
      showNotice(fb, `Sign-in failed: ${err.message}`, "err");
    } finally {
      btn.disabled = false;
      btn.textContent = "Sign In to CMS";
    }
  });

  document.getElementById("cmsSignOutBtn")?.addEventListener("click", async () => {
    await signOutSupabase();
    updateCmsGate();
  });

  // Quick Config
  document.getElementById("cmsQuickConfigForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fb = document.getElementById("cmsConfigFeedback");
    saveRuntimeConfig({
      supabaseUrl: document.getElementById("cfgSupabaseUrl").value,
      supabaseAnonKey: document.getElementById("cfgSupabaseAnon").value,
      imagekitEndpoint: document.getElementById("cfgImageKitEndpoint").value,
      imagekitUploadFolder: document.getElementById("cfgImageKitFolder").value,
    });
    showNotice(fb, "Connection saved in browser.", "ok");
    await loadPortfolioData();
    updateCmsGate();
  });

  document.getElementById("cmsResetConfigBtn").addEventListener("click", async () => {
    clearRuntimeConfig();
    saveSession(null);
    state.localMode = false;
    await loadPortfolioData();
    updateCmsGate();
  });

  // CMS Tabs
  document.querySelectorAll("[data-cms-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-cms-tab");
      state.cmsTab = target;
      document.querySelectorAll("[data-cms-tab]").forEach((b) => {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-cms-tab") === target));
      });
      document.getElementById("cmsTabProjects").hidden = target !== "projects";
      document.getElementById("cmsTabGallery").hidden = target !== "gallery";
      document.getElementById("cmsTabMessages").hidden = target !== "messages";
      document.getElementById("cmsTabSettings").hidden = target !== "settings";
    });
  });

  // Project slug auto-fill & Image preview
  document.getElementById("projTitle").addEventListener("input", (e) => {
    if (!document.getElementById("projId").value) {
      document.getElementById("projSlug").value = slugify(e.target.value);
    }
  });
  const syncProjPreview = bindImagePreviewInput(
    document.getElementById("projImageUrl"),
    document.getElementById("projImagePreview"),
  );
  const syncGalPreview = bindImagePreviewInput(
    document.getElementById("galImageUrl"),
    document.getElementById("galImagePreview"),
  );

  // ImageKit file uploads
  document.getElementById("projImageFile").addEventListener("change", (e) => {
    uploadFileToImageKit(
      e.target.files?.[0],
      document.getElementById("projUploadStatus"),
      document.getElementById("projImageUrl"),
      document.getElementById("projImagePreview"),
    );
  });
  document.getElementById("galImageFile").addEventListener("change", (e) => {
    uploadFileToImageKit(
      e.target.files?.[0],
      document.getElementById("galUploadStatus"),
      document.getElementById("galImageUrl"),
      document.getElementById("galImagePreview"),
    );
  });

  document.getElementById("projFormResetBtn").addEventListener("click", resetProjectForm);
  document.getElementById("galFormResetBtn").addEventListener("click", resetGalleryForm);

  // Save Project
  document.getElementById("cmsProjectForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fb = document.getElementById("projFormFeedback");
    const id = document.getElementById("projId").value.trim();
    const resolvedImg = buildImageKitUrl(document.getElementById("projImageUrl").value, {
      width: 1200,
      quality: 85,
    });
    if (!resolvedImg) {
      showNotice(fb, "Please enter a valid http(s) ImageKit URL or relative path.", "err");
      return;
    }

    const rawLive = document.getElementById("projLiveUrl").value.trim();
    const safeLive = rawLive ? sanitizeUrl(rawLive) : "";
    if (rawLive && !safeLive) {
      showNotice(fb, "Live URL must start with https:// or http://", "err");
      return;
    }

    const payload = {
      slug: slugify(document.getElementById("projSlug").value || document.getElementById("projTitle").value),
      title: document.getElementById("projTitle").value.trim(),
      category: document.getElementById("projCategory").value,
      year: document.getElementById("projYear").value.trim() || "2026",
      client: document.getElementById("projClient").value.trim(),
      live_url: safeLive,
      tags: document
        .getElementById("projTags")
        .value.split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      summary: document.getElementById("projSummary").value.trim(),
      description: document.getElementById("projDescription").value.trim(),
      image_url: resolvedImg.split("?tr=")[0],
      featured: document.getElementById("projFeatured").checked,
      published: document.getElementById("projPublished").checked,
      sort_order: id
        ? state.projects.find((x) => x.id === id)?.sort_order ?? state.projects.length + 1
        : state.projects.length + 1,
    };

    try {
      if (isSupabaseConfigured() && state.session?.access_token) {
        if (isUuid(id)) {
          const updated = await supabaseRequest(
            `/rest/v1/projects?id=eq.${encodeURIComponent(id)}`,
            { method: "PATCH", auth: true, prefer: "return=representation", body: payload },
          );
          state.projects = state.projects.map((p) => (p.id === id ? updated[0] : p));
        } else {
          const created = await supabaseRequest("/rest/v1/projects", {
            method: "POST",
            auth: true,
            prefer: "return=representation",
            body: payload,
          });
          if (id) {
            state.projects = state.projects.map((p) => (p.id === id ? created[0] : p));
          } else {
            state.projects.push(created[0]);
          }
        }
      } else {
        const entry = { ...payload, id: id || `local-${crypto.randomUUID()}` };
        if (id) {
          state.projects = state.projects.map((p) => (p.id === id ? entry : p));
        } else {
          state.projects.push(entry);
        }
      }
      writeLocalStore(LOCAL_PROJ_KEY, state.projects);
      resetProjectForm();
      syncProjPreview();
      showNotice(fb, "Project saved.", "ok");
      renderAll();
    } catch (err) {
      showNotice(fb, `Save failed: ${err.message}`, "err");
    }
  });

  // Save Gallery Item
  document.getElementById("cmsGalleryForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fb = document.getElementById("galFormFeedback");
    const id = document.getElementById("galId").value.trim();
    const resolvedImg = buildImageKitUrl(document.getElementById("galImageUrl").value, {
      width: 1200,
      quality: 85,
    });
    if (!resolvedImg) {
      showNotice(fb, "Please enter a valid http(s) ImageKit URL or relative path.", "err");
      return;
    }

    const payload = {
      title: document.getElementById("galTitle").value.trim(),
      category: document.getElementById("galCategory").value,
      aspect_ratio: document.getElementById("galAspectRatio").value,
      year: document.getElementById("galYear").value.trim() || "2026",
      tool_used: document.getElementById("galTool").value.trim(),
      caption: document.getElementById("galCaption").value.trim(),
      image_url: resolvedImg.split("?tr=")[0],
      published: document.getElementById("galPublished").checked,
      sort_order: id
        ? state.gallery.find((x) => x.id === id)?.sort_order ?? state.gallery.length + 1
        : state.gallery.length + 1,
    };

    try {
      if (isSupabaseConfigured() && state.session?.access_token) {
        if (isUuid(id)) {
          const updated = await supabaseRequest(
            `/rest/v1/gallery_items?id=eq.${encodeURIComponent(id)}`,
            { method: "PATCH", auth: true, prefer: "return=representation", body: payload },
          );
          state.gallery = state.gallery.map((g) => (g.id === id ? updated[0] : g));
        } else {
          const created = await supabaseRequest("/rest/v1/gallery_items", {
            method: "POST",
            auth: true,
            prefer: "return=representation",
            body: payload,
          });
          if (id) {
            state.gallery = state.gallery.map((g) => (g.id === id ? created[0] : g));
          } else {
            state.gallery.push(created[0]);
          }
        }
      } else {
        const entry = { ...payload, id: id || `local-${crypto.randomUUID()}` };
        if (id) {
          state.gallery = state.gallery.map((g) => (g.id === id ? entry : g));
        } else {
          state.gallery.push(entry);
        }
      }
      writeLocalStore(LOCAL_GAL_KEY, state.gallery);
      resetGalleryForm();
      syncGalPreview();
      showNotice(fb, "Gallery item saved.", "ok");
      renderAll();
    } catch (err) {
      showNotice(fb, `Save failed: ${err.message}`, "err");
    }
  });

  document.getElementById("cmsRefreshMsgsBtn").addEventListener("click", loadPortfolioData);

  // Export & Copy Config
  document.getElementById("cmsExportJsonBtn").addEventListener("click", () => {
    const blob = new Blob(
      [JSON.stringify({ projects: state.projects, gallery_items: state.gallery }, null, 2)],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "arambuuu-cms-export.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById("cmsCopyConfigBtn").addEventListener("click", async () => {
    const cfg = getRuntimeConfig();
    const snippet = `export const DEFAULT_CONFIG = {\n  supabaseUrl: ${JSON.stringify(
      cfg.supabaseUrl,
    )},\n  supabaseAnonKey: ${JSON.stringify(cfg.supabaseAnonKey)},\n  imagekitEndpoint: ${JSON.stringify(
      cfg.imagekitEndpoint,
    )},\n  imagekitUploadFolder: ${JSON.stringify(cfg.imagekitUploadFolder)},\n};`;
    const fb = document.getElementById("cmsSettingsFeedback");
    try {
      await navigator.clipboard.writeText(snippet);
      showNotice(fb, "Copied js/config.js snippet to clipboard.", "ok");
    } catch {
      showNotice(fb, snippet, "info");
    }
  });
}

function renderAll() {
  renderHome();
  renderAbout();
  renderProjectsPage();
  renderToolsPage();
  if (state.route === "studio-manage") updateCmsGate();
}

// ---------- Boot ----------
function boot() {
  state.session = loadSession();
  initTheme();
  initRouter();
  initDialogs();
  initContactForm();
  initCms();

  document.getElementById("projectSearchInput")?.addEventListener("input", (e) => {
    state.projectSearch = e.target.value;
    renderProjectsPage();
  });

  loadPortfolioData();
}

boot();
