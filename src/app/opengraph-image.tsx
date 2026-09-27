import { ImageResponse } from "next/og";

import { SITE } from "@/lib/constants";

/*
  Social share card (Open Graph). next/og runtime par PNG banata hai - koi
  external asset nahi, sirf brand colours + text.

  Headline wahi hai jo homepage par hai. "Know your teachers before you pick a
  course" jaan boojh kar hataya gaya: students teacher choose nahi karte, is
  liye wo line share hone par bhi ghalat wada karti thi.

  Satori rule: har multi-child div par display:flex hona chahiye.
*/
export const runtime = "edge";

export const alt = `${SITE.name}: ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#ffffff",
          padding: "72px 80px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {/* Top accent bar - patli, sirf ek indigo line */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            width: "1200px",
            height: "8px",
            backgroundColor: "#4858a3",
          }}
        />

        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#1b1d26" }}>
            ProfAura
          </div>
          <div style={{ display: "flex", marginLeft: 8, fontSize: 40, fontWeight: 700, color: "#d23f37" }}>
            +
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              color: "#1b1d26",
              maxWidth: "900px",
            }}
          >
            Understand your learning experience.
          </div>
          <div
            style={{
              display: "flex",
              width: 96,
              height: 5,
              marginTop: 28,
              borderRadius: 3,
              backgroundColor: "#f4675e",
            }}
          />
        </div>

        {/* Footer line */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 24,
            color: "#5b6070",
          }}
        >
          <div style={{ display: "flex" }}>Anonymous, student-only reviews</div>
          <div style={{ display: "flex" }}>
            {SITE.university.shortName} · {SITE.university.city}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
