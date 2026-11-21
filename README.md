# Solar

Marketing site for a solar company: panels, home batteries, EV charging, and long-term care for homes and businesses.
Plain HTML, CSS and JavaScript. No build step. The animation libraries ship inside the repo, so the site works without any CDN.

## Run it

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Design

- **Look:** dark, cinematic and built around real photography. The palette is a solar cell at dusk, blue-black glass with aluminium greys, lit by one warm sunlight accent. One light "daylight" section (How it works) breaks up the dark.
- **Type:** Fraunces, a soft and curly serif, for headlines. Pinyon Script, a flowing script, sets one gold accent word in each headline, and that word appears as if being written. Geist is used for text and Geist Mono for small labels.
- **Signature effect:** photos change by switching on cell by cell, like a panel catching the sun. Each cell scales in carrying its slice of the next photo, with a flash of sunlight. The same effect opens the page and runs the hero slideshow and the How it works frame.

## Sections

| Section | What it does |
| --- | --- |
| **Header** | Transparent over the hero, turns to frosted glass on scroll, and hides while you read down. **Solutions** opens a menu with photo cards. A small chip shows whether the sun is up near you. On phones there's a full-screen menu. |
| **Hero** | Full-screen slideshow of four real photos with the cell transition, a slow zoom and progress bars you can click. Scrolling shrinks the photo into a rounded frame. |
| **Trust bar** | 25-year warranty, 1–2 days on site, 24/7 monitoring, one crew. |
| **Statement** | The words light up as you scroll, the counters count up, and an installer photo wipes in with parallax. |
| **What we do** | Four expanding photo panels: Solar panels, Battery storage, EV charging, Care & monitoring. |
| **Homes / Business** | Split screen. The half you point at grows and shows its details. The Homes and Business nav links open the matching half. |
| **How it works** | Pinned on wide screens. Assess → Design → Install → Power on, with the photo frame switching cell by cell. Elsewhere the steps stack. |
| **System sizer** | Sliders for monthly use, sun hours and backup hours. It shows system size, panel count, roof space, battery, yearly output and CO₂ avoided, and a roof that lights up panel by panel. Sun hours default to an estimate for the visitor's area. |
| **Projects** | Vertical scroll drives a horizontal gallery, with parallax and a skew that follows scroll speed. On phones it becomes a swipeable row. |
| **Marquee** | A giant word band that speeds up with scrolling. |
| **Contact** | Quote form over a sunset photo, plus FAQs. |
| **Footer** | A giant "solar" wordmark filled with an aerial photo of solar rows, plus links and today's sunrise and sunset near the visitor. |

Across the page there's smooth scrolling, magnetic buttons, and a custom cursor on desktop that shows "View" over projects and "Drag" over sliders.

## Accessibility and fallbacks

- **Reduced motion:** visitors who ask for reduced motion get every section in place, with no intro, pinning or slideshow autoplay.
- **If the scripts fail:** the HTML and CSS still make a complete page.
- **Keyboard:** everything works from the keyboard, including the menus, panels, split halves, sliders and form.

## Files

```
index.html
css/styles.css
js/core.js     header and menus, slideshow, panels, split, process steps, sizer, form, sun estimate
js/motion.js   GSAP / ScrollTrigger / Lenis: cell transition, intro, pins, reveals, cursor
js/vendor/     gsap 3.12.5, ScrollTrigger 3.12.5, lenis 1.1.13
assets/img/    photos (WebP)
```

## Before going live

- **Form:** `js/core.js` → section 8 only validates and shows a thank-you message. Connect the `TODO` to your CRM or email service.
- **Content:** the project names and sizes, the stats, the service specs and the FAQ answers are placeholders. Replace them with your real ones.
- **Photos:** these are Unsplash stock photos of real installations. Swap in photos of your own jobs when you have them, using the same file names.

## Credits

- [GSAP](https://gsap.com) and ScrollTrigger, under the GSAP Standard License. [Lenis](https://github.com/darkroomengineering/lenis), MIT.
- Photos from [Unsplash](https://unsplash.com), under the Unsplash License. IDs:
  1782297040435, 1630608354129, 1660330589243, 1730807908064, 1700529289398, 1780445392792, 1780445392417,
  1766507680004, 1726221062415, 1637417494521, 1617269778723, 1660330589257, 1581092160562, 1624397640148,
  1655300283246, 1586366461834, 1777919407084, 1694327671725, 1780445392692, 1698752822107, 1780445392628,
  1698752821934, 1723133371535.
