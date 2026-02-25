# Roof Measurement Tool — Australian Implementation Plan

> **Status:** Research complete. Ready to build when time permits.  
> **Created:** February 2026  
> **Context:** All Roofs Web Apps — future add-on product/feature

---

## 1. What We're Building

A web tool similar to **TakData.no** (Norway) — a user types an address, the tool returns:

- Sloped roof area (m²)
- Roof pitch / inclination (degrees)
- Roof type (Hipped, Gabled, Flat, Skillion, etc.)
- Primary roof material (Tile, Metal, Concrete, etc.)
- Hip/valley/ridge length estimates
- An aerial map view with the building highlighted
- (Future) PDF report output

**Primary use case:** Roofing contractors getting instant area/pitch data for quoting without a site visit.

---

## 2. Inspiration: How TakData.no Works

TakData is a Norwegian SaaS tool using this data chain:

```
Kartverket (Norwegian Mapping Authority)
    ↓ Government-funded LiDAR + aerial photogrammetry (whole country)
FKB-Bygning Dataset — per-face 3D roof polygons with vertex heights
    ↓
Norkart — commercial geodata company, licensed API reseller
    ↓
TakData.no — Leaflet map UI + Norkart API
    ↓
Roof pitch, per-face area, dimensions in seconds
```

Key: Norway has a centrally-funded national 3D building dataset. Australia does not — but Geoscape fills the gap commercially.

---

## 3. Australian Data Stack

### Primary Data Source: Geoscape Australia

**Website:** https://geoscape.com.au  
**API Docs:** https://api-docs.geoscape.com.au  
**Hub / Free Signup:** https://hub.geoscape.com.au

Geoscape is Australia's equivalent geodata authority (formerly PSMA). They hold:
- National building footprints (polygon geometry)
- Per-building roof height, eave height, volume
- Roof type, material, colour
- Address linkage via G-NAF (national address file)

Geoscape data is derived from **aerial imagery + photogrammetry** updated continuously. Quality is excellent in all capital cities and major regional centres.

### Secondary (Future Upgrade): Nearmap

**Developer portal:** https://developer.nearmap.com  
Nearmap provides:
- High-res aerial tile imagery (for map display)
- AI Feature API — per-face roof polygons (like TakData per-surface breakdown)
- DSM (Digital Surface Model) — true 3D point cloud for precision pitch
- Roof Age API, material detection

**Nearmap is enterprise/quote-only** — minimum ~$15,000–$25,000/yr AUD. Not worth it until the product has paying customers. Start with Geoscape.

### Map Tiles: OpenStreetMap (Free) or MapTiler

- **OSM free tier:** https://tile.openstreetmap.org  
- **MapTiler free tier:** 100,000 tile requests/month free  
  https://www.maptiler.com/cloud/  
- **Nearmap tiles (future):** Aerial photography — far better for showing roofs

---

## 4. Core API Calls Per Search (Geoscape)

Every roof lookup makes **3 API calls** consuming **13 Geoscape credits**:

```
Step 1: Address → Coordinates
  Geoscape Addresses API → geocode
  Endpoint: GET /v1/addresses/geocoder?addressString={address}
  Cost: 1 credit

Step 2: Coordinates → Building Record
  Geoscape Buildings API v2 → findByPoint
  Endpoint: GET /v2/buildings/byPoint?latitude={lat}&longitude={lng}
  Cost: 8 credits

Step 3: Heights & Roofs Add-on (same call, additionalProperties param)
  additionalProperties=heightsAndRoofs
  Cost: +4 credits
  
─────────────────────────────────────────────
Total: 13 credits per roof lookup
```

### What You Get Back

From the Buildings API + heightsAndRoofs response:

```json
{
  "building_pid": "...",
  "geometry": { "type": "Polygon", "coordinates": [[...]] },
  "area": 142.5,                    // footprint m² (flat)
  "roof_height": 7.2,               // highest point above ground (m)
  "eave_height": 3.1,               // eave line above ground (m)
  "roof_type": "HIP",               // HIP / GABLE / FLAT / SKILLION / DUTCH_GABLE / COMPLEX
  "primary_roof_material": "TILE",  // TILE / METAL / CONCRETE / FIBROUS_CEMENT / OTHER
  "roof_colour": "#B5451B",         // hex colour
  "volume": 891.0,                  // building volume m³ (not useful for pitch calc)
  "estimated_levels": "1",
  "building_source": "AERIAL"
}
```

---

## 5. Pitch & Area Calculations

### Step 1: Calculate Rise and Run

```javascript
const rise = roof_height - eave_height;          // vertical height of roof (m)
const footprintPolygon = geometry.coordinates[0]; // array of [lng, lat] points

// Get the narrowest dimension of the footprint (the "run" side)
// For a rectangular house, run = short_side / 2
const { shortSide, longSide } = getFootprintDimensions(footprintPolygon);
const run = shortSide / 2;
```

### Step 2: Calculate Pitch Angle

```javascript
const pitchRadians = Math.atan2(rise, run);
const pitchDegrees = pitchRadians * (180 / Math.PI);
// e.g. 22.5° — typical suburban Australian house
```

### Step 3: Calculate Sloped Roof Area

```javascript
// The pitch factor converts flat footprint to actual sloped surface area
const pitchFactor = 1 / Math.cos(pitchRadians);
const slopedArea = footprintArea * pitchFactor;

// Example: 142.5 m² footprint at 22.5° pitch
// pitchFactor = 1 / cos(22.5°) = 1.082
// slopedArea = 142.5 × 1.082 = 154.2 m²
```

### Step 4: Estimate Flashing Lengths

```javascript
// Hip length (for hipped roofs) — each hip rafter
// Hip runs from corner of eaves to ridge, at 45° in plan
const ridgeLength = longSide - shortSide; // approx for full hip
const hipLength = Math.sqrt(Math.pow(shortSide / 2, 2) + Math.pow(rise, 2)) * (shortSide > 0 ? 1 : 0);
// Number of hips: 4 for full hip, 2 for dutch gable, 0 for gable

// Valley length (for complex/joined roofs — requires join geometry, estimate only)
```

### Helper: Get Footprint Dimensions from Polygon

```javascript
function getFootprintDimensions(coordinates) {
  // Use minimum bounding rectangle approach
  // Simple approximation: get lat/lng extent in metres
  const lats = coordinates.map(c => c[1]);
  const lngs = coordinates.map(c => c[0]);
  
  const latSpan = (Math.max(...lats) - Math.min(...lats)) * 111320; // approx metres
  const lngSpan = (Math.max(...lngs) - Math.min(...lngs)) * 111320 * Math.cos(lats[0] * Math.PI / 180);
  
  return {
    shortSide: Math.min(latSpan, lngSpan),
    longSide:  Math.max(latSpan, lngSpan)
  };
}
```

### Accuracy by Roof Type

| Roof Type (`roof_type`) | Sloped Area Accuracy | Pitch Accuracy | Notes |
|---|---|---|---|
| `HIP` | ✅ Very good | ✅ Very good | All faces same pitch |
| `GABLE` | ✅ Very good | ✅ Very good | Main faces same pitch |
| `SKILLION` | ✅ Good | ✅ Good | Single plane |
| `DUTCH_GABLE` | ✅ Good | ✅ Good | Similar to hipped |
| `FLAT` | ✅ Trivially correct | N/A (0°) | No pitch factor needed |
| `COMPLEX` | ⚠️ Estimate | ⚠️ Estimate | Multiple pitches averaged |

---

## 6. Pricing & Credits

### Geoscape Hub Plans (incl. GST)

| Plan | Monthly Cost | Credits/mo | Searches/mo (13cr each) | Overage per search |
|---|---|---|---|---|
| **Free** | $0 | 20,000 | ~1,538 | N/A (hard cap) |
| Team | $300 | 30,000 | ~2,307 | ~$0.20 |
| Pro | $1,000 | 100,000 | ~7,692 | ~$0.16 |
| Enterprise | Quote | Unlimited | Unlimited | Negotiated |

**Start on Free.** 1,538 searches/month is plenty to build and test the product.

**Signup:** https://hub.geoscape.com.au/sign-up

### Future: Nearmap (when revenue justifies it)

| Component | Estimated Annual AUD |
|---|---|
| Aerial imagery tiles | ~$3,000–$8,000/yr |
| AI Packs (per-face roof data) | ~$15,000–$50,000/yr |
| DSM (3D surface model) | ~$5,000–$20,000/yr |
| Transactional (per-query) | ~$0.50–$3.00/query |

Nearmap is enterprise sales only — contact them directly: https://www.nearmap.com/au/en/contact-sales

---

## 7. Architecture

### Tech Stack (using existing infrastructure)

```
Frontend
  Leaflet.js               — map rendering (already familiar)
  Leaflet-Geoman plugin    — draw/display building polygons
  MapTiler / OSM tiles     — free base map (swap for Nearmap later)
  Vanilla JS or React      — depends on frontend preference

Backend (Node.js — existing VPS/stack)
  Express route            — /api/roof-lookup?address=...
  Geoscape API wrapper     — handles auth, geocode, building fetch
  Calculation module       — pitch, sloped area, flashing lengths
  Response formatter       — structured JSON result

Database (optional, for caching)
  Cache results by address — avoid re-querying for same address
  Store lookup history     — for user accounts / report history
```

### API Flow Diagram

```
User types address
      ↓
POST /api/roof-lookup { address: "123 Smith St, Perth WA 6000" }
      ↓
Backend: Geoscape geocode → { lat, lng }
      ↓
Backend: Geoscape buildings findByPoint → { footprint, heights, type, material }
      ↓
Backend: calculateRoof({ area, roof_height, eave_height, geometry, roof_type })
      ↓
  {
    footprintArea: 142.5,
    pitchDegrees: 22.5,
    pitchRatio: "4:12",
    slopedArea: 154.2,
    ridgeLength: 8.4,
    hipCount: 4,
    hipLength: 4.6,  (each hip)
    roofType: "HIP",
    material: "TILE",
    colour: "#B5451B",
    eaveHeight: 3.1,
    roofHeight: 7.2
  }
      ↓
Frontend: Display on Leaflet map with overlaid footprint polygon + data panel
```

---

## 8. Frontend UI (TakData-Style)

```
┌─────────────────────────────────────────────────────────┐
│  🔍  [123 Smith Street, Balcatta WA 6021          ] [Go] │
└─────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────────────┐
│                      │  │  Roof Measurements            │
│   [Leaflet Map]      │  │  ─────────────────────────── │
│                      │  │  📐 Sloped Area:  154.2 m²   │
│   Building outline   │  │  📏 Footprint:   142.5 m²   │
│   highlighted        │  │  🔺 Pitch:        22.5°      │
│   in green           │  │  📊 Pitch Ratio:  4.8:12     │
│                      │  │  🏠 Roof Type:    Hipped      │
│   © OpenStreetMap    │  │  🔩 Material:     Tile        │
│                      │  │                               │
└──────────────────────┘  │  Estimated lengths:           │
                          │  Ridge:     8.4 m             │
                          │  Hip (×4):  4.6 m each        │
                          │  Eave line: 36.2 m            │
                          │                               │
                          │  [Copy] [Download PDF]        │
                          └──────────────────────────────┘
```

---

## 9. Leaflet Plugins to Use

| Plugin | Purpose | URL |
|---|---|---|
| **Leaflet** core | Map rendering | https://leafletjs.com |
| **Leaflet-Geoman** | Draw + display polygons, snapping | https://geoman.io |
| **Leaflet Measure Path** | Show measurements on polygon | https://github.com/perliedman/leaflet-measure-path |
| **leaflet-providers** | Easy tile source switching (OSM, Esri satellite, etc.) | https://github.com/leaflet-extras/leaflet-providers |

---

## 10. Coverage: Australian Capital Cities

| City | Geoscape Data Quality | Notes |
|---|---|---|
| Sydney + surrounds | ✅ Excellent | Full metro coverage |
| Melbourne + surrounds | ✅ Excellent | Full metro coverage |
| Brisbane + Gold Coast | ✅ Excellent | Full metro coverage |
| Perth + surrounds | ✅ Excellent | Full metro coverage |
| Adelaide + surrounds | ✅ Very good | Full metro coverage |
| Canberra | ✅ Very good | Full metro coverage |
| Darwin | ✅ Good | Urban areas covered |
| Hobart | ✅ Good | Urban areas covered |

Rural/remote: data exists but quality degrades — treat as out of scope for v1.

---

## 11. Build Order / Milestones

### Phase 1 — Backend Core (1–2 days)
- [ ] Sign up for Geoscape free tier at https://hub.geoscape.com.au/sign-up
- [ ] Get API key from Geoscape Hub
- [ ] Build `geoscapeClient.js` — wrapper for geocode + buildings endpoints
- [ ] Build `roofCalculator.js` — pitch, sloped area, flashing lengths
- [ ] Express route: `GET /api/roof-lookup?address=...`
- [ ] Test with 10–20 real Australian addresses

### Phase 2 — Frontend (1–2 days)
- [ ] Leaflet map with OSM base tiles
- [ ] Address search input + debounce
- [ ] Call backend API on search
- [ ] Render building footprint polygon on map
- [ ] Data panel showing all calculated values
- [ ] Leaflet-Geoman for polygon display (no drawing needed initially)

### Phase 3 — Polish (1 day)
- [ ] Pitch ratio display (e.g. "4.8:12" format for tradies)
- [ ] Roof type icon/illustration
- [ ] Copy to clipboard button
- [ ] Basic error handling (address not found, building not found)
- [ ] Mobile responsive layout

### Phase 4 — Integration into All Roofs App (TBD)
- [ ] Add as a tab or page in existing Project Manager app
- [ ] Pre-fill from project address if available
- [ ] Store result against job/quote record
- [ ] Optional: export to PDF with company branding

### Phase 5 — Upgrade Path (when revenue justifies)
- [ ] Nearmap aerial tiles subscription (replace OSM tiles)
- [ ] Nearmap AI Feature API (per-face breakdown like TakData)
- [ ] Nearmap DSM (precise 3D pitch per face)
- [ ] Multiple roof faces shown individually on map

---

## 12. Key Code Snippets (Ready to Use)

### Geoscape Auth Header
```javascript
const GEOSCAPE_API_KEY = process.env.GEOSCAPE_API_KEY;
const headers = { 'Authorization': GEOSCAPE_API_KEY };
```

### Geocode Address
```javascript
async function geocodeAddress(address) {
  const url = `https://api.geoscape.com.au/v1/addresses/geocoder?addressString=${encodeURIComponent(address)}&maxNumberOfResults=1`;
  const res = await fetch(url, { headers });
  const data = await res.json();
  return data.features[0]?.geometry?.coordinates; // [lng, lat]
}
```

### Get Building + Roof Data
```javascript
async function getBuildingData(lat, lng) {
  const url = `https://api.geoscape.com.au/v2/buildings/findByPoint?latitude=${lat}&longitude=${lng}&additionalProperties=heightsAndRoofs`;
  const res = await fetch(url, { headers });
  const data = await res.json();
  return data.features[0]?.properties;
}
```

### Calculate Roof Metrics
```javascript
function calculateRoof(building) {
  const { area, roof_height, eave_height, roof_type, geometry } = building;
  
  const rise = roof_height - eave_height;
  const { shortSide, longSide } = getFootprintDimensions(geometry.coordinates[0]);
  const run = shortSide / 2;
  
  const pitchRadians = Math.atan2(rise, run);
  const pitchDegrees = +(pitchRadians * 180 / Math.PI).toFixed(1);
  const pitchRatio = `${(rise / run * 3).toFixed(1)}:12`; // using 3" ref
  
  const pitchFactor = 1 / Math.cos(pitchRadians);
  const slopedArea = +(area * pitchFactor).toFixed(1);
  
  // Ridge length (approximate)
  const ridgeLength = +(longSide - shortSide).toFixed(1);
  
  // Hip length (for hipped roofs — each of 4 hips)
  const hipLength = +(Math.sqrt(Math.pow(run, 2) + Math.pow(rise, 2))).toFixed(1);
  
  // Eave perimeter (approximate)
  const eavePerimeter = +(2 * (shortSide + longSide)).toFixed(1);
  
  return {
    footprintArea: +area.toFixed(1),
    slopedArea,
    pitchDegrees,
    pitchRatio,
    rise: +rise.toFixed(2),
    run: +run.toFixed(2),
    ridgeLength,
    hipCount: roof_type === 'HIP' ? 4 : roof_type === 'DUTCH_GABLE' ? 2 : 0,
    hipLength,
    eavePerimeter,
    roofType:  building.roof_type,
    material:  building.primary_roof_material,
    colour:    building.roof_colour,
    eaveHeight: eave_height,
    roofHeight: roof_height
  };
}

function getFootprintDimensions(coordinates) {
  const lats = coordinates.map(c => c[1]);
  const lngs = coordinates.map(c => c[0]);
  const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const latSpan = (Math.max(...lats) - Math.min(...lats)) * 111320;
  const lngSpan = (Math.max(...lngs) - Math.min(...lngs)) * 111320 * Math.cos(midLat * Math.PI / 180);
  return {
    shortSide: Math.min(latSpan, lngSpan),
    longSide:  Math.max(latSpan, lngSpan)
  };
}
```

### Express Route (complete)
```javascript
router.get('/api/roof-lookup', async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: 'Address required' });
    
    const coords = await geocodeAddress(address);
    if (!coords) return res.status(404).json({ error: 'Address not found' });
    
    const [lng, lat] = coords;
    const building = await getBuildingData(lat, lng);
    if (!building) return res.status(404).json({ error: 'No building found at this address' });
    
    const roof = calculateRoof(building);
    
    res.json({
      address,
      coordinates: { lat, lng },
      footprintPolygon: building.geometry,
      roof
    });
  } catch (err) {
    console.error('Roof lookup error:', err);
    res.status(500).json({ error: 'Lookup failed' });
  }
});
```

---

## 13. Reference Links

| Resource | URL |
|---|---|
| Geoscape Hub (signup + API key) | https://hub.geoscape.com.au/sign-up |
| Geoscape API Docs | https://api-docs.geoscape.com.au |
| Geoscape Buildings Guide | https://docs.geoscape.com.au/projects/buildings_guide/en/stable/index.html |
| Geoscape Buildings Heights & Roofs Data Model | https://docs.geoscape.com.au/projects/buildings_guide/en/stable/appendix/appendix_roof_and_heights.html |
| Geoscape Pricing/Credits | https://geoscape.com.au/geoscape-hub/#pricing |
| Leaflet.js | https://leafletjs.com |
| Leaflet Plugins Directory | https://leafletjs.com/plugins.html |
| Leaflet-Geoman | https://geoman.io |
| MapTiler Cloud (free tiles) | https://www.maptiler.com/cloud/ |
| Nearmap Developer Portal | https://developer.nearmap.com |
| Nearmap AI Feature API | https://developer.nearmap.com/docs/ai-api |
| Nearmap DSM API | https://developer.nearmap.com/docs/dsm-and-true-ortho-api |
| TakData.no (the Norwegian inspiration) | https://takdata.no |
| Norkart (Taksdata's data source) | https://www.norkart.no |

---

## 14. Notes & Decisions

- **Why Geoscape over Nearmap to start:** Free tier available, self-serve signup, public pricing, sufficient accuracy for quoting purposes.
- **Why not OpenStreetMap building data:** OSM buildings in Australia have footprints but no 3D/height/pitch data. Not useful for this tool.
- **Volume field not used:** Geoscape's `volume` is total building volume including walls, not just roof — can't derive pitch from it cleanly.
- **Pitch calculation method:** Trigonometric derivation from `roof_height` − `eave_height` (rise) and footprint short side ÷ 2 (run). Same method TakData uses per face; we apply it to the whole building using average geometry.
- **Complex roofs (`roof_type = COMPLEX`):** Flag these in the UI as "estimated" — the calculation is a reasonable average but a site visit is recommended for unusually complex builds.
- **Nearmap upgrade trigger:** When average monthly searches exceed ~1,500 (free tier limit) and/or paying subscribers exist to offset the $15k+ annual cost.

---

*End of document — ready to implement when the time is right.*
