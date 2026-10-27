# Illia Movchan — video editor portfolio

Static site, four screens. No build step, no dependencies.

```bash
python3 -m http.server 4321
```

```
index.html        content and copy
css/style.css     tokens in :root at the top
js/main.js        rail, sequence, monitor, player
assets/           your media
```

## The concept

The site is an **edit suite**, not a brochure.

* **Sequence rail** (left edge) — a playhead that tracks scroll; the marks are clickable.
* **Top bar** — project ID and a live **timecode readout**. It is not decoration: it mirrors
  the position of whatever is playing in the monitor, at 25 fps.
* **Work** — a **program monitor** beside an **inspector**, over a **sequence**.
  The monitor frame takes the shape of whatever clip is loaded: add `data-ar="9/16"` to a
  clip and the frame becomes vertical, `data-ar="4/3"` and it becomes square-ish. Default is
  `16/9`. The frame never shows empty rails around a picture. Clip blocks are sized by real duration
  on a square-root scale (so an 18-minute doc doesn't make a 30-second spot unclickable), the
  ruler above prints honest cumulative running time, and the selected clip loads in the monitor
  with burned-in timecode.
* **SMPTE bars** are the only colour on the site; amber `#ffc400` is the only accent.
* **No rounded corners anywhere** — `*{border-radius:0}` is enforced in the reset.

Set frame rate for the timecode readout with `FPS` at the top of `js/main.js` (default 25).

## Replace before publishing

| Where | Still placeholder |
|---|---|
| `.panel` rows | availability date, years, project count |
| the six `.clip` buttons | real projects, durations and categories |
| `assets/` | all media |

The hero name is one `<span>` per letter, in two rows: `.hero__row--1` (ILLIA, 5 cells) and
`.hero__row--2` (MOVCHAN, 7 cells). Changing the letter count means changing
`grid-template-columns:repeat(N,1fr)` for that row in `css/style.css`.

The timecode in the top bar is driven by scroll: top of page `00:00:00:00`, bottom equals the
total runtime of the clips in the sequence. The monitor's burned-in timecode is separate — it
follows whatever is playing.

## Media

A clip is either a **YouTube video** or a **local file**.

**YouTube** — the way clip 01 works now:

```html
data-yt="kV2X80Zz8LY"
data-poster="https://i.ytimg.com/vi/kV2X80Zz8LY/maxresdefault.jpg"
```

Nothing to upload. The poster is YouTube's own thumbnail (`maxresdefault.jpg`, 1280×720;
fall back to `hqdefault.jpg` if a video has no HD thumbnail). The player script loads only
when someone actually presses play, and the burned-in timecode follows the YouTube player.

**Local file** — the other five clips:

```html
data-video="assets/work/02.mp4"
data-poster="assets/work/02.jpg"
```

```
assets/portrait.jpg           About photo (portrait crop, fills its column)
assets/work/reel.mp4 + .jpg   showreel — opens fullscreen from the amber hero button
assets/work/02.mp4 … 06.mp4   remaining clips + their posters
```

Posters 1280×720. Clips play in-page, so keep them web-sized (1280 wide, H.264, ~2–5 Mbps);
the showreel can be larger since it only loads when someone opens it.

Nothing breaks when a file is missing — frames and the monitor fall back to the slate hatch.

## Filling a vertical slot

Four 9:16 tiles sit under the sequence (`.reels__grid` in `index.html`). **Each tile is its own
player** — pressing play swaps the poster for a YouTube iframe inside that same tile, so nothing
jumps and nothing scrolls. Starting one tile pauses the others and the big monitor.

A tile is an `<article class="reel">` with `data-yt="VIDEO_ID"` (or `data-video="assets/…mp4"`)
and `data-sec` for the duration. Inside it: the poster `<img>`, an empty `<span id="reelMountNN">`
where the player appears, the `.reel__hit` play button holding the index and duration badges, and
`.reel__meta` with the title, the type and a small third line (original title, or a note like
"Client work — brand undisclosed"). A tile with no `data-yt`/`data-video` stays inert.

**Posters for Shorts:** `maxresdefault.jpg` is always 16:9, so a vertical frame would crop it to a
strip. Use `https://i.ytimg.com/vi/VIDEO_ID/oardefault.jpg` — 1080×1920, the real vertical frame.
If that 404s (YouTube has not generated every size yet), `frame0.jpg` works but is only 268×480;
uploading a custom thumbnail to that video makes the big sizes appear.

## Adding a clip

Copy one `<button class="clip">` and set `data-sec` (duration in **seconds** — this drives the
block width and the ruler), then either `data-yt` or `data-video`, plus `data-poster`,
`data-title`, `data-kind`, `data-role`, `data-year`, optionally `data-ar` (frame shape, default
`16/9`), and the visible name and duration.
Update the total runtime in `.tl__foot`. Widths and ruler ticks recalculate automatically.
