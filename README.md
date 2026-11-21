# Solar

Marketing site for a solar installation, battery storage and long-term care company.
Plain HTML, CSS and JavaScript. No build step. The animation libraries ship inside the repo, so the site works without any CDN.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## The idea: one scroll is one day

Scrolling the page is living through a single day, from 05:50 to 22:00.

- The colour of the sky behind the page changes with the hour.
- A soft sun glow rises, crosses the screen and sets as you scroll.
- The sun in the navigation travels its arc in step with the page.
- Each section is stamped with its time of day, and the rail on the left keeps the clock.
- The page ends at night, with the house still running on its battery.

## Sections, in scroll order

| Time | Section | What happens |
| --- | --- | --- |
| — | **Intro** | A loader charges the sunburst logo from 000 to 100, then splits open along a slanted cut. The nav drops in, the headline rises word by word, and the photo unfolds like a brochure. |
| 05:50 | **Hero** | A 3D folded triptych that tilts with the mouse. Scrolling pins it, flattens the folds and opens it into a full-width “One home. One day.” frame. |
| 07:30 | **Statement** | The words light up as you read. The three counters count up. |
| 09:00 | **How it works** | Pinned canvas story. Sunlight particles hit the roof panels and pulses run down the wires. The battery fills, the sun sets, stars come out and the windows light up. The steps and live readouts follow your scroll. |
| — | **Marquee** | Giant “Capture ✳ Store ✳ Use ✳ Care” band. It speeds up and leans with scroll speed. |
| 12:00 | **Systems** | Vertical scroll drives a horizontal track of five cards, with image parallax and an animated battery drawing. On phones it becomes a swipeable row. |
| 14:30 | **Your roof today** | A clear-day energy model for the visitor's own location. Drag the sun along the sky arc. The sky changes colour, energy flows animate between panels, inverter, home, battery and grid, and the chart cursor follows. On first view, the sun sweeps from midnight to the current time. |
| 16:30 | **Projects** | Staggered cards with wipe-in photos, counting numbers, drawn charts and 3D hover tilt. |
| 18:00 | **Sunset** | A pinned scene. The sky scrolls through the sunset colours, a huge sun sinks below the horizon, “The sun goes down.” turns into “Your lights stay on.” and the stars appear. |
| 19:30 | **Care** | Night section. A sticky photo frame wipes between Assess, Design, Install and Support as each step reaches the middle of the screen. |
| 21:00 | **Contact** | Twinkling star field with occasional shooting stars, the form and the FAQs. |
| 22:00 | **Footer** | A giant “solar” wordmark fills with sun yellow as you reach the bottom. |

Across the page there's smooth scrolling, magnetic buttons, a custom cursor on desktop (it reads “Drag” over the simulator) and a film-grain overlay.

## Accessibility and fallbacks

- **Reduced motion:** visitors who ask for reduced motion get no loader, smooth scrolling, pinning or scrubbing. Every section shows in place, and the simulator still works.
- **If the scripts fail:** the HTML and CSS are complete on their own. Failsafes hide the loader and reveal the intro elements after a few seconds.
- **Keyboard and screen readers:** the simulator is driven by a native range input, so it works with the keyboard and announces the time and values. The custom cursor only appears with a mouse.

## Sun times

The simulator and the footer use the visitor's own sunrise and sunset. These come from the browser's time zone, so there's no location prompt. The calculation is the NOAA solar-position approximation in `js/core.js`. The page's own narrative day uses a fixed sunrise of 06:10 and sunset of 18:30.

## Files

```
index.html
css/styles.css
js/core.js        page clock, sun-path nav, simulator, care steps, form
js/scenes.js      canvas scenes: photon story, night sky, sunset stars
js/motion.js      GSAP / ScrollTrigger / Lenis choreography
js/vendor/        gsap 3.12.5, ScrollTrigger 3.12.5, lenis 1.1.13
assets/img/       photos (WebP)
```

## Before going live

- **Form:** `js/core.js` → section 10 only validates and shows a thank-you message. Connect the `TODO` to your CRM or email service.
- **Copy and figures:** the project names and numbers, the service specs, the FAQ answers and the stats are placeholders. Replace them with real ones.

## Credits

- [GSAP](https://gsap.com) and ScrollTrigger, under the GSAP Standard License.
- [Lenis](https://github.com/darkroomengineering/lenis), MIT.
- Photos from [Unsplash](https://unsplash.com), under the Unsplash License: `photo-1600585154340` (hero house), `photo-1605980413988` (house with solar roof), `photo-1613665813446` (warehouse rooftop), `photo-1611365892117` (office and solar field), `photo-1621905251189` (electrician), `photo-1581092160562` (drawing plans), `photo-1624397640148` (roof install), `photo-1559302504` (panel maintenance). Swap in your own project photos when you have them.
