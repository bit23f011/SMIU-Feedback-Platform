import { ImageResponse } from "next/og";

/*
  Apple touch icon (mobile home-screen shortcut).

  Yahan koi text nahi hai - sirf official mark ki geometry. Text hota to
  ImageResponse ko font rasterize karna parta (network fetch), jo build ke
  waqt fail ho sakta hai. SVG ko base64 data URL bana kar <img> me daalte
  hain: yeh Satori ka sabse reliable rasta hai.

  Note: iOS shortcut icons ke corners khud round karta hai, is liye background
  poora square rakha hai (transparent nahi).
*/

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const alt = "ProfAura";

const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 64 64">
<defs><linearGradient id="o" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#f4675e"/><stop offset="100%" stop-color="#f59f4a"/></linearGradient></defs>
<ellipse cx="32" cy="33" rx="29" ry="13" transform="rotate(-22 32 33)" fill="none" stroke="url(#o)" stroke-width="4" stroke-linecap="round"/>
<path d="M23 8h20a11 11 0 0 1 11 11v18a11 11 0 0 1-11 11H25l-11 8 2.8-8A11 11 0 0 1 12 37V19A11 11 0 0 1 23 8Z" fill="#1f2a52"/>
<g fill="#ffffff">
<path d="M33 15 45.6 20.2 33 25.4 20.4 20.2 33 15Z"/>
<path d="M43.6 21.2a1 1 0 0 1 1 1v5.6a1 1 0 0 1-2 0v-5.6a1 1 0 0 1 1-1Z"/>
<circle cx="43.6" cy="29.6" r="1.7"/>
<circle cx="33" cy="30.4" r="4.7"/>
<path d="M33 35.9c5 0 9 3 9 8.3V47H24v-2.8c0-5.3 4-8.3 9-8.3Z"/>
</g>
</svg>`;

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={svgDataUrl(MARK_SVG)} width={140} height={140} alt="" />
      </div>
    ),
    { ...size },
  );
}
