# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev     # start with nodemon (auto-restart) — normal dev loop
npm start        # start with plain node
node server/seed.js                  # wipe Bike collection and reseed from data/bikes.json
node data/generateBikeSitemap.js     # regenerate data/bikesitemap.xml from data/bikes.json
```

There is no test suite, linter, or build step configured (`npm test` is a stub). There's no bundler either — views and CSS are served as-is.

The server needs a `.env` (see keys already in the local `.env`, gitignored): `PORT`, `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (bcrypt hash — see the pattern in admin.routes.js), `BHASH_USER`/`BHASH_PASS`/`BHASH_SENDER` (BhashSMS WhatsApp API). MongoDB must be reachable for the app to boot — `app.js` calls `process.exit(1)` on a failed initial connection.

## Architecture

Server-rendered Express 5 app (CommonJS, no frontend framework/build step). EJS templates render full pages including `<head>`; `public/css/style.css` is empty — styling lives in per-view inline `<style>` blocks instead.

**Entry point**: `server/app.js` — connects Mongoose, mounts `/admin` (admin.routes.js) before `/` (public.routes.js), serves `public/` statically, sets EJS view engine rooted at `views/`.

**Routing split**:
- `server/routes/public.routes.js` — customer-facing site. Route order matters here: `/models` (all models) and `/motorcycle/:subCategory` (redwing/bigwing filter) are declared *before* the generic `/:category` and `/:category/:slug` catch-alls, since Express matches top-down. `allowedCategories = ["motorcycle", "scooter", "e2w"]` gates the catch-all routes — invalid categories 404.
- `server/routes/admin.routes.js` — CMS behind the `auth` middleware (JWT in an httpOnly cookie, checked in `server/middleware/auth.js`; missing/invalid token redirects to `/admin/login`, not a 401). Login is a single hardcoded admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars, bcrypt-compared) — there is no admin user model.

**Data model** (`server/models/bike.model.js` is the core one): a `Bike` has top-level `isActive`/`bookingsOpen` flags (the latter drives the green "Bookings Open" badge on listing cards and the model-detail title — used for pre-book-only models), a `features` object (safety/comfort/design/technology), and a `variants` array, each variant carrying its own `price` breakdown (exShowroom, roadTaxAndReg, insuranceBase, onRoadBase, zeroDepPremium, finalOnRoad) and its own `specs` (performance/body/engine/motor/transmission/tyres/suspension/electricals/chassis/battery_and_charging/connectivity_features). Every features/specs entry uses the shared `sectionSchema` shape `{ show: Boolean, items: Mixed[] }` — `show` controls whether the section renders on the model-detail page, `items` is a loosely-typed array of key/value pairs. When adding a new features or specs section, follow this `{show, items}` convention rather than inventing a new shape.

`views/website/model-detail.ejs` accesses `model.colors[0].image`/`.name` and `model.variants[0].price.exShowroom` unconditionally (no length guard) — every Bike document needs at least one `colors` entry and one `variants` entry with `price.exShowroom` set, or the detail page throws.

**Known gap — admin edit form is out of sync with the schema**: `views/admin/add-model.ejs`/`edit-model.ejs` and their handlers in `admin.routes.js` (`POST /admin/add`, `POST /admin/edit/:id`) read/write a flat shape (top-level `price`, `image`, `specs`, comma-split `features` string) that doesn't match the real nested schema above (no top-level `price`/`specs` fields exist; `features` is an object, not a string). Saving through that form silently drops fields Mongoose doesn't recognize and can fail validation on `features`. The routes that *do* work correctly against the real schema: `POST /admin/update-price/:bikeId/:variantId` (per-variant price breakup) and `POST /admin/toggle-status/:id` (isActive). For anything else (specs, colors, features, bookingsOpen), edit `data/bikes.json` and reseed, or write a direct Mongoose update — don't rely on the Edit Model screen.

`Lead`, `Contact`, and `Service` are the three inbound-form collections (quote/brochure requests, contact-us messages, service bookings respectively); each has its own `status` enum driving the admin list/filter views (`admin/leads.ejs`, `admin/contact-us.ejs`, `admin/services.ejs`).

**`data/bikes.json`** is the seed source of truth for bike catalog data (not read at runtime by the app itself). `server/seed.js` reads it, normalizes loose/optional fields into the strict `{show, items}` section shape via `buildSectionFromArray`/`buildSectionFromObject`, and does a full `deleteMany()` + `insertMany()` — running it wipes and replaces the entire `Bike` collection. Edit `data/bikes.json` and rerun the seed to change catalog content in bulk; use the admin CMS for one-off edits without touching the seed file.

**Lead capture flow** (`POST /leads` in public.routes.js): saves a `Lead` doc, responds immediately, then sends a WhatsApp message via the BhashSMS HTTP API asynchronously (fire-and-forget IIFE after `res.json`) — template choice (`tansi_model_brochure_share` vs `tansi_vehicle_price_quote`) depends on the `source` field. Same fire-and-forget-after-response pattern is used for service-booking confirmations in `POST /create-appointment`. When touching these routes, keep the response fast/synchronous and the WhatsApp call in the background block — don't await it before responding.

**Image uploads**: `POST /admin/upload-image` accepts multipart via `multer` (in-memory), resizes/re-encodes with `sharp` to `800x600` JPEG, and writes to `public/images/<uuid>.jpg` directly (no cloud storage). `public/images/bike/<slug>/` and `public/images/scooter/<slug>/` hold the numbered per-model gallery images referenced from `data/bikes.json`/Mongo `coverImage`/`colors[].image` fields.

**Sitemap**: `public/sitemap.xml` is a static hand-maintained file for core pages; `data/generateBikeSitemap.js` generates a separate `data/bikesitemap.xml` from `data/bikes.json` for bike/category URLs (production base URL is hardcoded in that script) — it's a standalone script, not wired into any route or npm script, so rerun it manually after catalog changes.
