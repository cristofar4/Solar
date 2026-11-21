# Solar

Marketing site for a solar installation, battery storage and long-term care company.
Plain HTML, CSS and JavaScript. No build step and no dependencies.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## What's on the page

| Section | What it does |
| --- | --- |
| **Sun-path navigation** | The nav bar carries today's sun arc, with sunrise and sunset times at its ends. At rest the sun sits where the real sun is right now near the visitor. Hover or focus a link and the sun travels the arc to it. After dark it waits half-set on the horizon, and the dot in “Plan my installation” turns hollow. |
| **Section rail** | On wide screens, a vertical rail on the left shows which section you're in, and you can click it to jump. |
| **Day / night view** | Switches between the light and dark themes. Follows the system setting until the visitor picks one. |
| **Folded hero** | One photo split across three folded panels, graded as dawn, midday and evening. The panels unfold once when the page loads. |
| **One approach** | The Home / Business switch changes the photo and specs. The “Business” nav link turns it on. |
| **Systems** | The service rows expand to show details. |
| **A day on your roof** | An energy model of an 8 kW array with a 13.5 kWh battery, using the visitor's own sunrise, sunset and noon sun height. Drag the sun, or press play, to see solar output, home use, battery charge and grid exchange. |
| **Projects** | Project cards with small charts. |
| **Care** | Assess / Design / Install / Support tabs, each with its own photo. |
| **Contact** | Form with inline validation, plus FAQs. |

Animation is limited to the hero unfolding once, the sun moving along the arc, and short transitions. All of it is turned off when the visitor has asked for reduced motion.

## Sun times

Sun times come from the browser's time zone, so the visitor never sees a location prompt. A lookup table holds about 70 major zones. Other zones fall back to an estimate from the UTC offset. The maths is the NOAA solar-position approximation, in `js/main.js` under “Sun maths”.

## Before going live

- **Form:** `js/main.js` → “Assessment form” only validates and shows a thank-you message. Connect the `TODO` there to your CRM or email service.
- **Copy and figures:** The project names and numbers, the service specs and the FAQ answers are placeholders. Replace them with real ones.

## Files

```
index.html
css/styles.css
js/main.js
assets/img/        photos (WebP)
```

## Photo credits

Photos are from [Unsplash](https://unsplash.com) and used under the Unsplash License:
`photo-1600585154340` (hero house), `photo-1605980413988` (house with solar roof),
`photo-1613665813446` (warehouse rooftop), `photo-1611365892117` (office and solar field),
`photo-1621905251189` (electrician), `photo-1581092160562` (drawing plans),
`photo-1624397640148` (roof install), `photo-1559302504` (panel maintenance).
Add the photographers' names if you want full attribution, or swap in your own project photos.
