# Graph Report - .  (2026-05-03)

## Corpus Check
- Large corpus: 32 files · ~958,994 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 46 nodes · 40 edges · 15 communities detected
- Extraction: 65% EXTRACTED · 35% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.89)
- Token cost: 88,546 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Automation Services|Automation Services]]
- [[_COMMUNITY_Portfolio Core|Portfolio Core]]
- [[_COMMUNITY_Supporting Assets|Supporting Assets]]
- [[_COMMUNITY_Styling System|Styling System]]
- [[_COMMUNITY_Motion & Animation|Motion & Animation]]
- [[_COMMUNITY_Automation Services|Automation Services]]
- [[_COMMUNITY_Portfolio Core|Portfolio Core]]
- [[_COMMUNITY_Project Showcase|Project Showcase]]
- [[_COMMUNITY_Project Showcase|Project Showcase]]
- [[_COMMUNITY_Project Showcase|Project Showcase]]
- [[_COMMUNITY_ML Detection|ML Detection]]
- [[_COMMUNITY_Supporting Assets|Supporting Assets]]
- [[_COMMUNITY_Supporting Assets|Supporting Assets]]
- [[_COMMUNITY_Portfolio Core|Portfolio Core]]
- [[_COMMUNITY_Brand Assets|Brand Assets]]

## God Nodes (most connected - your core abstractions)
1. `Global Stylesheet` - 8 edges
2. `Services Page` - 7 edges
3. `Home Page` - 5 edges
4. `handleUserInput()` - 3 edges
5. `Projects Page` - 3 edges
6. `Alex Shvachko Portfolio Owner` - 3 edges
7. `addMessage()` - 2 edges
8. `showTypingIndicator()` - 2 edges
9. `Static Site Architecture` - 2 edges
10. `Inline Page-Specific Styles` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Services Page` --implements--> `Inline Page-Specific Styles`  [INFERRED]
  services/index.html → CLAUDE.md
- `Static Site Architecture` --rationale_for--> `Global Stylesheet`  [EXTRACTED]
  CLAUDE.md → assets/css/styles.css
- `Home Page` --references--> `Global Stylesheet`  [EXTRACTED]
  index.html → assets/css/styles.css
- `Home Page` --implements--> `GoatCounter Analytics Tracking`  [EXTRACTED]
  index.html → CLAUDE.md
- `Projects Page` --references--> `Global Stylesheet`  [EXTRACTED]
  projects/index.html → assets/css/styles.css

## Hyperedges (group relationships)
- **All Pages Share Common Assets** — index_html, projects_index_html, services_index_html, styles_css, main_js, particles_config_js [EXTRACTED 1.00]
- **Service Pages Linked from Services Hub** — services_index_html, digital_marketing_service, personal_coaching_service, personalized_automations_service [INFERRED 0.85]
- **Portfolio Project Documentation** — cv_tailors_jpg, cv_tailors_proj_png, final_disney_png, draft_png, er_png [INFERRED 0.85]
- **Service Pages Hero Images** — automations_img, coaching_img, bck_marketing_img [INFERRED 0.85]
- **Machine Learning Project Outputs** — wafer_map_input_png, wafer_map_target_png, metrics_scratch_detection_png, my_results_png [INFERRED 0.85]
- **RAG Application Demonstration** — logo_rag_jpg, rag_screen_png [INFERRED 0.85]
- **Automation Platform Demonstrations** — n8n_marketing_png, logo_jpg [INFERRED 0.75]

## Communities (15 total, 9 thin omitted)

### Community 0 - "Automation Services"
Cohesion: 0.29
Nodes (7): Digital Marketing Service Page, Inline Page-Specific Styles, Personal Coaching Service Page, Personalized Automations Service Page, Project Data Structure, Projects Page, Services Page

### Community 1 - "Portfolio Core"
Cohesion: 0.33
Nodes (5): Alex Shvachko Portfolio Owner, Cyber Education Center (Employer), GoatCounter Analytics Tracking, Home Page, Millimedical Solutions (Employer)

### Community 2 - "Supporting Assets"
Cohesion: 0.6
Nodes (3): addMessage(), handleUserInput(), showTypingIndicator()

### Community 3 - "Styling System"
Cohesion: 0.4
Nodes (4): Google Fonts Integration, Monochrome Color Palette, Pill-Shaped Navigation Components, Global Stylesheet

### Community 5 - "Automation Services"
Cohesion: 0.5
Nodes (4): Automations Service Hero Image, Digital Marketing Service Background, Personal Coaching Service Hero Image, n8n Marketing Automation Setup

### Community 6 - "Portfolio Core"
Cohesion: 0.67
Nodes (3): CV Tailors Project Portfolio Image, CV Tailors Project Screenshots, Entity Relationship Diagram

## Knowledge Gaps
- **27 isolated node(s):** `GSAP-Powered Entry Animations`, `Monochrome Color Palette`, `GoatCounter Analytics Tracking`, `Project Data Structure`, `Pill-Shaped Navigation Components` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Global Stylesheet` connect `Styling System` to `Automation Services`, `Portfolio Core`, `Motion & Animation`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `Home Page` connect `Portfolio Core` to `Styling System`, `Motion & Animation`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `Services Page` connect `Automation Services` to `Portfolio Core`, `Styling System`, `Motion & Animation`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Services Page` (e.g. with `Inline Page-Specific Styles` and `Digital Marketing Service Page`) actually correct?**
  _`Services Page` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `GSAP-Powered Entry Animations`, `Monochrome Color Palette`, `GoatCounter Analytics Tracking` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._