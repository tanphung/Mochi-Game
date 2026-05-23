# Adding Assets to Mochi Pet

All assets live under `frontend/public/assets/`. The game falls back to emoji when an image file is missing, so you can add assets incrementally without touching core code.

---

## Asset Folders

| Folder | Contents |
|--------|----------|
| `public/assets/pets/` | Pet body images (per color variant) |
| `public/assets/hats/` | Hat item images |
| `public/assets/glasses/` | Glasses item images |
| `public/assets/necklaces/` | Necklace item images |
| `public/assets/shirts/` | Shirt item images |
| `public/assets/handheld/` | Handheld item images |
| `public/assets/rooms/` | Room background images |
| `public/assets/ui/` | UI icons, logos, etc. |

---

## Adding a New Accessory Item

### 1. Add the image file
Place a PNG/WebP file in the appropriate subfolder:
```
public/assets/hats/hat_beret.png
```
Recommended size: **256×256px**, transparent background, WebP or PNG.

### 2. Add an entry to the category file
Edit the relevant file in `frontend/lib/data/items/`:

```typescript
// lib/data/items/hats.ts
{ id: "hat_beret", name: "Beret", category: "hat", image: "/assets/hats/hat_beret.png",
  rarity: "rare", unlockLevel: 4, zIndex: 5,
  scale: 1.1, offsetX: 0, offsetY: -64, rotation: -8, enabled: true },
```

**Field reference:**
- `id` — unique string, format `{category}_{name}` (e.g. `hat_beret`)
- `image` — path starting with `/assets/...`, OR an emoji string (e.g. `"🎩"`) as fallback
- `rarity` — `"common"` | `"rare"` | `"epic"` | `"legendary"`
- `unlockLevel` — must be ≥ the category minimum (see table below)
- `zIndex` — use the value for the category (see table below); do NOT change
- `scale` — 1.0 = natural size; adjust to fit on the pet
- `offsetX` / `offsetY` — pixel offset from pet center (positive Y = down)
- `rotation` — degrees clockwise

**Category unlock minimums & zIndex values:**

| Category | Min unlock level | zIndex |
|----------|-----------------|--------|
| hat      | 3               | 5      |
| glasses  | 5               | 6      |
| shirt    | 7               | 2      |
| necklace | 10              | 3      |
| handheld | 15              | 4      |

### 3. Done
`itemManifest.ts` auto-combines all category files — no changes needed there. The item will appear in the wardrobe and unlock at the specified level.

---

## Adding a New Room

### 1. (Optional) Add a background image
```
public/assets/rooms/room_beach.jpg
```
Recommended size: **400×400px** or larger. If omitted, only the CSS gradient is shown.

### 2. Add an entry to `lib/data/roomManifest.ts`

```typescript
{
  id: "beach",
  name: "Beach",
  emoji: "🏖️",
  unlockLevel: 6,
  background: "linear-gradient(160deg, #87ceeb 0%, #f4e4ba 60%, #e8c87a 100%)",
  // backgroundImage: "/assets/rooms/room_beach.jpg",  // uncomment if you have the image
},
```

---

## Adding a Pet Color

Pet colors are free-form hex strings chosen in `CreatePetForm`. No manifest entry needed — the color is stored on-chain and applied dynamically.

---

## Image vs Emoji Fallback

`PetPreview` and `InventoryEditor` both check whether `item.image` starts with `/` or `http`. If it does, they render an `<img>` tag; otherwise they render the string as an emoji inside a `<span>`. This means you can ship emoji-only items and upgrade them to images later without any code changes.
