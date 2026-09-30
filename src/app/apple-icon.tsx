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
export const alt = "SMIU Feedback Platform";

const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="132" height="132" viewBox="0 0 64 50">
<defs><mask id="m">
<rect x="5" y="43" width="54" height="4" fill="white"/>
<rect x="10" y="27" width="44" height="16" fill="white"/>
<rect x="10" y="21" width="6" height="22" fill="white"/>
<path d="M9.2 21.5 Q13 16.5 16.8 21.5 Z" fill="white"/>
<rect x="12.4" y="16" width="1.2" height="4" fill="white"/>
<rect x="48" y="21" width="6" height="22" fill="white"/>
<path d="M47.2 21.5 Q51 16.5 54.8 21.5 Z" fill="white"/>
<rect x="50.4" y="16" width="1.2" height="4" fill="white"/>
<rect x="27" y="13" width="10" height="30" fill="white"/>
<path d="M25 13 L32 7 L39 13 Z" fill="white"/>
<path d="M28.6 7 Q32 1.5 35.4 7 Z" fill="white"/>
<rect x="31.4" y="0.5" width="1.2" height="6" fill="white"/>
<circle cx="32" cy="0.9" r="1" fill="white"/>
<path d="M29 43 V33 A3 3 0 0 1 35 33 V43 Z" fill="black"/>
<path d="M30.4 25 V21 A1.6 1.6 0 0 1 33.6 21 V25 Z" fill="black"/>
<path d="M17 42 V38 A2.2 2.2 0 0 1 21.4 38 V42 Z" fill="black"/>
<path d="M22.4 42 V38 A2.2 2.2 0 0 1 26.8 38 V42 Z" fill="black"/>
<path d="M37.2 42 V38 A2.2 2.2 0 0 1 41.6 38 V42 Z" fill="black"/>
<path d="M42.6 42 V38 A2.2 2.2 0 0 1 47 38 V42 Z" fill="black"/>
</mask></defs>
<rect width="64" height="50" fill="#f7f2ea" mask="url(#m)"/>
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
          background: "#8a1f2b",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={svgDataUrl(MARK_SVG)} width={132} height={132} alt="" />
      </div>
    ),
    { ...size },
  );
}
