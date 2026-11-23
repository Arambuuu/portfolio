# Graph Report - portfolio  (2026-11-23)

## Corpus Check
- Corpus is ~12,912 words - fits in a single context window. You may not need a graph.

## Summary
- 114 nodes · 264 edges · 8 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Cluster 0
- Cluster 1
- Cluster 2
- Cluster 3
- Cluster 4
- Cluster 5
- Cluster 6
- Cluster 7

## God Nodes (most connected - your core abstractions)
1. `initCms()` - 22 edges
2. `buildImageKitUrl()` - 16 edges
3. `supabaseRequest()` - 14 edges
4. `el()` - 12 edges
5. `isSupabaseConfigured()` - 12 edges
6. `renderProjectsPage()` - 11 edges
7. `renderCmsLists()` - 11 edges
8. `renderAll()` - 11 edges
9. `clearNode()` - 10 edges
10. `getRuntimeConfig()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Portfolio & CMS Shell (index.html)` --connects_to--> `Supabase DB & RLS Schema`  [INFERRED]
  index.html → supabase/schema.sql
- `openProjectDialog()` --calls--> `sanitizeUrl()`  [EXTRACTED]
  js/app.js → js/config.js
- `uploadFileToImageKit()` --calls--> `buildImageKitUrl()`  [EXTRACTED]
  js/app.js → js/config.js
- `renderCmsLists()` --calls--> `buildImageKitUrl()`  [EXTRACTED]
  js/app.js → js/config.js
- `renderCmsSettings()` --calls--> `getRuntimeConfig()`  [EXTRACTED]
  js/app.js → js/config.js

## Import Cycles
- None detected.

## Communities (8 total, 0 thin omitted)

### Community 0 - "Cluster 0"
Cohesion: 0.11
Nodes (13): handler(), clearRuntimeConfig(), DEFAULT_CONFIG, sanitizeUrl(), appJs, css, expectedSig, html (+5 more)

### Community 1 - "Cluster 1"
Cohesion: 0.16
Nodes (19): boot(), initDialogs(), initRouter(), initTheme(), loadSession(), populateProjectForm(), resetGalleryForm(), resetProjectForm() (+11 more)

### Community 2 - "Cluster 2"
Cohesion: 0.29
Nodes (20): deleteGalleryItem(), deleteMessage(), deleteProject(), initCms(), initContactForm(), loadPortfolioData(), moveProject(), readLocalStore() (+12 more)

### Community 3 - "Cluster 3"
Cohesion: 0.27
Nodes (17): bindImagePreviewInput(), buildGalleryCard(), buildProjectRow(), clearNode(), el(), getPublishedGallery(), getPublishedProjects(), openGalleryDialog() (+9 more)

### Community 4 - "Cluster 4"
Cohesion: 0.15
Nodes (12): concurrency, cancel-in-progress, group, name, on, push, workflow_dispatch, permissions (+4 more)

### Community 5 - "Cluster 5"
Cohesion: 0.17
Nodes (12): environment, runs-on, steps, name, url, jobs, deploy, id (+4 more)

### Community 6 - "Cluster 6"
Cohesion: 0.47
Nodes (4): ImageKit Media CDN & Transforms, Supabase DB & RLS Schema, Portfolio & CMS Shell (index.html), Surface Brief (index.html)

### Community 7 - "Cluster 7"
Cohesion: 0.50
Nodes (3): cleanUrls, headers, $schema

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `buildImageKitUrl()` connect `Cluster 3` to `Cluster 0`, `Cluster 1`, `Cluster 2`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `initCms()` (e.g. with `resetGalleryForm()` and `resetProjectForm()`) actually correct?**
  _`initCms()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Cluster 0` be split into smaller, more focused modules?**
  _Cohesion score 0.10952380952380952 - nodes in this community are weakly interconnected._
- **Why does `sanitizeUrl()` connect `Cluster 0` to `Cluster 1`, `Cluster 2`, `Cluster 3`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._