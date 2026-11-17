# josephwon.dev

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | Home page: the simple one-pager |
| `full/index.html` | The full 3D site (the blue dot after the name switches between them) |
| `css/simple.css`, `js/simple.js` | Styles and script for the home page |
| `css/style.css` | Styling for the full site, including dark mode |
| `js/projects.js` | **Content** — every carousel entry: text, table rows, tools, gallery |
| `js/main.js` | Full site: scene, carousel, project panel, theme and input handling |
| `js/portal.js` | The blue transition between the two versions |
| `minimal/index.html` | Redirects old `/minimal/` links to the home page |
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
