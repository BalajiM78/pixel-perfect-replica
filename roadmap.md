# Roadmap — ATS Resume Agent premium frontend rebuild

Source: github.com/Balaji1718/ATS-Agent (frontend rebuild; backend + Python engine remain on Render; Supabase project stays external).

## Tasks
- [ ] Design system (styles.css tokens, fonts, theme provider)
- [ ] Core libs: config, supabase session, typed API client (ported contract), auth guard
- [ ] App shell (sidebar, mobile nav, theme toggle, user menu) + route guard layout
- [ ] Landing page (/) and auth page (/auth: sign-in, sign-up, recovery)
- [ ] Dashboard (/dashboard)
- [ ] Unified workspace (/workspace): resume select/upload + JD paste/URL extract + options + run
- [ ] Results (/results/$runId): score gauge, dimensions, skills, projects, actions, AI advisory, downloads
- [ ] Editor (/editor/$runId): CodeMirror LaTeX, compile, PDF preview, .tex/.pdf/.docx exports
- [ ] History (/history) with search, delete, artifact downloads
- [ ] Resume library (/resumes): upload, master selection, download, delete
- [ ] Evidence library (/evidence): CRUD, doc extraction, recommendations
- [ ] Providers (/settings/providers): enable/disable, priority, preferred, keys, tests, web reader
- [ ] Account (/settings/account) and preferences (/settings/preferences)
- [ ] Tests: routing/guards, api config gating, upload validation
- [ ] Verify build + tests; check /tmp/observability build-errors.log

## Blocked on user (not questions — setup actions)
- Add `VITE_API_URL` (Render backend URL), `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` in project settings
- Add the Lovable preview/published origins to `FRONTEND_ORIGIN` on the Render service
