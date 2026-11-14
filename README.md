# josephwon.dev

Personal portfolio of Joseph Won — a static site (plain HTML, CSS and JavaScript, no build step).

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The page |
| `css/style.css` | All styling, including dark mode |
| `js/projects.js` | **Content** — every carousel entry: text, table rows, tools, gallery |
| `js/main.js` | Scene, carousel, project panel, theme and input handling |
| `js/models.js` | Procedural stand-in parts and the GLB loader |
| `js/harmonograph.js` | The animated background |
| `js/audio.js` | Sound effects and ambient hum (synthesised) |
| `js/sky.js` | Procedural cloud and reflection textures |
| `assets/models/` | CAD models converted from STEP to GLB |
| `assets/<project>/` | Gallery images (full size + `-thumb`) and video |

## Editing content

Open `js/projects.js`. Each entry documents its fields at the top of the file.
To add a gallery image, put the file in `assets/<project>/` and add
`{ src, thumb, alt, caption }` to that project's `gallery`.

## Preview locally

The site uses ES modules, so it must be served over http:

```
python serve.py
```

then open http://localhost:5173.

## Deploy

Cloudflare Pages, connected to this repository: no build command, output directory `/`.
Three.js and the Inter Tight font load from public CDNs.
