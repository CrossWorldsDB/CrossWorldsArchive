# CrossWorlds Archive

Community archive of ripped assets from Sonic Racing CrossWorlds.

---

## What It Hosts

- Textures — characters, vehicles, tracks, UI, effects
- Audio — music, sound effects, voice lines

---

## Folder Structure

```
CrossWorldsArchive/
├── index.html
├── asset.html
├── contribute.html
├── css/style.css
├── js/main.js
├── data/assets.json
└── assets/
    ├── textures/
    │   ├── characters/
    │   ├── vehicles/
    │   ├── tracks/
    │   ├── ui/
    │   ├── effects/
    │   └── misc/
    └── audio/
        ├── music/
        ├── sfx/
        └── voice/
```

---

## Adding Assets

1. Fork the repo
2. Add your file to the right folder under `assets/`
3. Add an entry to `data/assets.json`
4. Open a pull request

### JSON format

```json
{
  "id": "sonic_body_diffuse",
  "name": "Sonic Body Diffuse",
  "description": "Main diffuse texture for Sonic's character model.",
  "type": "texture",
  "item_type": "character",
  "patch_version": "1.2.0",
  "category": "character",
  "file": "assets/textures/characters/sonic_body_diffuse.png",
  "resolution": "1024x1024",
  "tags": ["sonic", "character", "body"]
}
```

`type`: `texture` or `audio`  
`item_type`: `character`, `vehicle`, `track`, `ui`, `effects`, or `misc`  
`resolution`: image dimensions, or `N/A` for audio

---

Not affiliated with SEGA or Sonic Team.
