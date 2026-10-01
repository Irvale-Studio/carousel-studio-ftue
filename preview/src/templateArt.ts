/**
 * Preview stand-in art for the v5 templates, drawn from a theme so the canvas can re-colour and
 * re-font a template live. Preview host only: in the app the template is a real Canva design.
 * `npm run templates` writes each template at its own theme to public/templates/<id>.svg (the
 * panel thumbnails). The canvas renders the same SVG inline, so it picks up the Google Fonts that
 * index.html loads; the thumbnails are <img>s and fall back to the system font in each stack.
 */
export type ThemeStyle = { background: string; text: string; accent: string; headingFont: string; bodyFont: string };

/** Font ids match FONTS in App.tsx. */
export const FONT_STACKS: Record<string, string> = {
  "archivo-black": "'Archivo Black', 'Arial Black', sans-serif",
  anton: "Anton, Impact, 'Arial Narrow', sans-serif",
  montserrat: "Montserrat, Arial, sans-serif",
  inter: "Inter, Arial, sans-serif",
  playfair: "'Playfair Display', Georgia, serif",
  "dm-serif": "'DM Serif Display', Georgia, serif",
  "libre-baskerville": "'Libre Baskerville', Georgia, serif",
  lora: "Lora, Georgia, serif",
};
// Weights index.html loads; anything else would be faux-bolded by the browser.
const HEADING_WEIGHT: Record<string, number> = { montserrat: 800, inter: 700 };
const BOLD_WEIGHT: Record<string, number> = { montserrat: 800, inter: 700, playfair: 700, "libre-baskerville": 700, lora: 700 };

const heading = (t: ThemeStyle) =>
  `font-family="${FONT_STACKS[t.headingFont]}" font-weight="${HEADING_WEIGHT[t.headingFont] ?? 400}"`;
const body = (t: ThemeStyle, bold = false) =>
  `font-family="${FONT_STACKS[t.bodyFont]}" font-weight="${bold ? BOLD_WEIGHT[t.bodyFont] ?? 400 : 400}"`;
const svg = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">${inner}</svg>`;

/** Each template at its own theme. App.tsx TEMPLATES carries the same values (checked by `npm run templates`). */
export const TEMPLATE_THEMES: Record<string, ThemeStyle> = {
  branding: { background: "#ECE4D6", text: "#111111", accent: "#E1663C", headingFont: "archivo-black", bodyFont: "inter" },
  focus: { background: "#F2EEE4", text: "#141414", accent: "#D7E66A", headingFont: "montserrat", bodyFont: "inter" },
  niche: { background: "#FFFFFF", text: "#1F2A5A", accent: "#2B3FA0", headingFont: "anton", bodyFont: "inter" },
  mindset: { background: "#4E5BC4", text: "#FFFFFF", accent: "#EDA88A", headingFont: "playfair", bodyFont: "inter" },
  healthy: { background: "#46512F", text: "#FFFFFF", accent: "#E4F25A", headingFont: "archivo-black", bodyFont: "lora" },
  habits: { background: "#F7E3E6", text: "#3A2A30", accent: "#3D5AFE", headingFont: "montserrat", bodyFont: "lora" },
  timeblock: { background: "#B4824A", text: "#FFFFFF", accent: "#F7D66B", headingFont: "playfair", bodyFont: "montserrat" },
  simple: { background: "#3F6E57", text: "#FFFFFF", accent: "#9ED8CC", headingFont: "dm-serif", bodyFont: "inter" },
};

export const TEMPLATE_ART: Record<string, (t: ThemeStyle) => string> = {
  branding: (t) => svg(`
  <defs><filter id="paper" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7"/>
    <feColorMatrix values="0 0 0 0 0.42  0 0 0 0 0.36  0 0 0 0 0.28  0 0 0 0.2 0"/>
  </filter></defs>
  <rect width="1080" height="1350" fill="${t.background}"/>
  <rect width="1080" height="1350" filter="url(#paper)"/>
  <g ${body(t)} font-size="40" fill="${t.text}">
    <text x="110" y="150" letter-spacing="1">HARPER RUSSO</text>
  </g>
  <text x="970" y="150" text-anchor="end" ${body(t, true)} font-size="40" fill="${t.text}">#branding</text>
  <g ${heading(t)} font-size="146" fill="${t.text}">
    <text x="104" y="560" textLength="862" lengthAdjust="spacingAndGlyphs">BRANDING</text>
    <text x="104" y="700" textLength="660" lengthAdjust="spacingAndGlyphs">IS MORE</text>
    <text x="104" y="840" textLength="862" lengthAdjust="spacingAndGlyphs">THAN JUST</text>
    <text x="104" y="980" textLength="560" lengthAdjust="spacingAndGlyphs">LOOKS</text>
  </g>
  <path d="M108 1028 C 300 1004, 560 994, 738 998 C 752 999 752 1013 738 1014 C 560 1014, 320 1022, 112 1040 Z" fill="${t.accent}"/>
  <path d="M1080 820 C 1012 864, 964 916, 940 978 C 920 1032, 962 1084, 994 1056 C 1020 1032, 996 976, 950 970 C 908 966, 872 982, 842 1000" fill="none" stroke="${t.accent}" stroke-width="11" stroke-linecap="round" stroke-dasharray="26 20"/>
  <text x="110" y="1250" ${body(t)} font-size="46" fill="${t.text}">@reallygreatsite</text>
  <text x="970" y="1250" text-anchor="end" ${body(t, true)} font-size="46" fill="${t.text}">2025</text>`),

  focus: (t) => svg(`
  <rect width="1080" height="1350" fill="${t.background}"/>
  <circle cx="930" cy="150" r="34" fill="${t.text}"/>
  <path d="M930 132 l5 12 13 1 -10 8 3 13 -11 -7 -11 7 3 -13 -10 -8 13 -1z" fill="${t.background}"/>
  <rect x="226" y="560" width="680" height="104" fill="${t.accent}"/>
  <g ${body(t)} font-size="104" fill="${t.text}" letter-spacing="-3">
    <text x="236" y="520">How to</text>
    <text x="400" y="770">in a Distracted</text>
    <text x="700" y="895">World</text>
  </g>
  <text x="246" y="645" ${heading(t)} font-size="104" fill="${t.text}" textLength="640" lengthAdjust="spacingAndGlyphs">Stay Focused</text>
  <text x="540" y="1230" text-anchor="middle" ${body(t)} font-size="30" fill="${t.text}">reallygreatsite.com</text>`),

  niche: (t) => svg(`
  <defs><pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
    <circle cx="3" cy="3" r="2.2" fill="${t.text}" opacity="0.16"/>
  </pattern></defs>
  <rect width="1080" height="1350" fill="${t.background}"/>
  <rect width="1080" height="1350" fill="url(#dots)"/>
  <text x="90" y="120" ${body(t)} font-size="28" letter-spacing="5" fill="${t.text}">FRANCOIS MERCER</text>
  <circle cx="950" cy="112" r="40" fill="none" stroke="${t.accent}" stroke-width="4"/>
  <path d="M928 112 h40 M952 96 l16 16 -16 16" fill="none" stroke="${t.accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <g ${heading(t)} font-size="230" fill="${t.text}">
    <text x="84" y="470" textLength="560" lengthAdjust="spacingAndGlyphs">HOW TO</text>
    <text x="84" y="720" textLength="880" lengthAdjust="spacingAndGlyphs">FIND YOUR</text>
    <text x="84" y="970" textLength="610" lengthAdjust="spacingAndGlyphs">NICHE</text>
  </g>
  <rect x="84" y="1080" width="996" height="56" fill="${t.accent}"/>
  <text x="90" y="1250" ${body(t)} font-size="26" letter-spacing="4" fill="${t.text}">REALLYGREATSITE.COM</text>`),

  mindset: (t) => svg(`
  <defs><linearGradient id="g" x1="0" y1="0" x2="0.6" y2="1">
    <stop offset="0" stop-color="${t.background}"/>
    <stop offset="1" stop-color="${t.accent}"/>
  </linearGradient></defs>
  <rect width="1080" height="1350" fill="url(#g)"/>
  <g ${body(t)} font-size="26" letter-spacing="3" fill="${t.text}" opacity="0.85">
    <text x="80" y="110">@REALLYGREATSITE</text>
    <text x="1000" y="110" text-anchor="end">SWIPE NOW</text>
  </g>
  <text x="80" y="620" ${heading(t)} font-style="italic" font-size="112" fill="${t.text}">Mindset shifts</text>
  <g ${body(t)} font-size="74" fill="${t.text}">
    <text x="80" y="720">that will accelerate</text>
    <text x="80" y="810">your career</text>
  </g>
  <g ${body(t)} font-size="24" letter-spacing="2" fill="${t.text}" opacity="0.8">
    <text x="80" y="1200">CHANGE HOW YOU THINK.</text>
    <text x="80" y="1240">CHANGE HOW YOU GROW.</text>
  </g>`),

  healthy: (t) => svg(`
  <defs><filter id="blur"><feGaussianBlur stdDeviation="60"/></filter></defs>
  <rect width="1080" height="1350" fill="${t.background}"/>
  <g filter="url(#blur)">
    <circle cx="820" cy="300" r="220" fill="#FFFFFF" opacity="0.22"/>
    <circle cx="200" cy="1050" r="260" fill="#000000" opacity="0.25"/>
    <circle cx="900" cy="1100" r="200" fill="#FFFFFF" opacity="0.3"/>
  </g>
  <text x="80" y="110" ${body(t)} font-size="26" letter-spacing="3" fill="${t.accent}">THRIVE UNLIMITED</text>
  <g fill="none" stroke="${t.accent}" stroke-width="4">
    <circle cx="96" cy="300" r="14"/><circle cx="140" cy="300" r="14"/><circle cx="184" cy="300" r="14"/><circle cx="228" cy="300" r="14"/>
  </g>
  <g ${heading(t)} font-size="150" fill="${t.accent}" letter-spacing="-5">
    <text x="76" y="530">healthy</text>
    <text x="76" y="680">lifestyle</text>
  </g>
  <text x="300" y="820" ${body(t)} font-style="italic" font-size="150" fill="${t.accent}">tips</text>
  <g ${body(t)} font-style="italic" font-size="38" fill="${t.text}">
    <text x="80" y="1130">Small choices, big</text>
    <text x="80" y="1180">impact on your daily life</text>
  </g>
  <text x="80" y="1270" ${body(t)} font-size="22" letter-spacing="3" fill="${t.text}" opacity="0.8">@REALLYGREATSITE</text>`),

  habits: (t) => svg(`
  <defs><filter id="soft"><feGaussianBlur stdDeviation="18"/></filter></defs>
  <rect width="1080" height="1350" fill="${t.background}"/>
  <g filter="url(#soft)">
    <circle cx="180" cy="1010" r="150" fill="${t.accent}" opacity="0.35"/>
    <circle cx="420" cy="1120" r="170" fill="#FFFFFF" opacity="0.6"/>
    <circle cx="700" cy="1040" r="150" fill="${t.accent}" opacity="0.6"/>
    <circle cx="930" cy="1160" r="170" fill="#F4D36B" opacity="0.9"/>
    <circle cx="560" cy="1290" r="160" fill="#8DB07A" opacity="0.9"/>
    <circle cx="120" cy="1280" r="140" fill="${t.text}" opacity="0.45"/>
    <circle cx="860" cy="900" r="110" fill="#E77C9A" opacity="0.7"/>
  </g>
  <rect x="80" y="150" width="840" height="96" rx="6" fill="${t.accent}"/>
  <text x="112" y="216" ${heading(t)} font-size="52" fill="${t.background}" textLength="776" lengthAdjust="spacingAndGlyphs">5 HABITS that changed my life</text>
  <g ${body(t)} font-size="40" fill="${t.text}">
    <text x="84" y="350">Quiet mornings, long walks</text>
    <text x="84" y="405">and saying no more often.</text>
  </g>`),

  timeblock: (t) => svg(`
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.45"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.6"/>
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="50"/></filter>
  </defs>
  <rect width="1080" height="1350" fill="${t.background}"/>
  <rect width="1080" height="1350" fill="url(#shade)"/>
  <g filter="url(#blur)">
    <circle cx="600" cy="420" r="230" fill="#000000" opacity="0.55"/>
    <ellipse cx="600" cy="820" rx="330" ry="240" fill="${t.accent}" opacity="0.7"/>
  </g>
  <text x="540" y="1050" text-anchor="middle" ${heading(t)} font-style="italic" font-size="110" fill="${t.accent}">Time blocking</text>
  <g ${body(t, true)} font-size="72" fill="${t.text}" text-anchor="middle">
    <text x="540" y="1140">tips for business</text>
    <text x="540" y="1220">owners</text>
  </g>`),

  simple: (t) => svg(`
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000000" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="40"/></filter>
  </defs>
  <rect width="1080" height="1350" fill="${t.background}"/>
  <rect width="1080" height="1350" fill="url(#shade)"/>
  <g filter="url(#blur)">
    <ellipse cx="540" cy="1150" rx="520" ry="160" fill="${t.accent}" opacity="0.7"/>
    <circle cx="140" cy="260" r="200" fill="#000000" opacity="0.35"/>
    <circle cx="960" cy="200" r="220" fill="#000000" opacity="0.35"/>
  </g>
  <g ${heading(t)} font-size="108" fill="${t.text}" text-anchor="middle">
    <text x="540" y="560">Simple ways I</text>
    <text x="540" y="680">show up for</text>
    <text x="540" y="800">myself</text>
  </g>
  <text x="540" y="1250" text-anchor="middle" ${body(t)} font-size="26" letter-spacing="3" fill="${t.text}" opacity="0.85">@REALLYGREATSITE</text>`),
};
