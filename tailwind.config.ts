import type { Config } from "tailwindcss";

/*
  ProfAura design tokens (Tailwind layer).

  Approved brand palette - sirf 3 accents:
    coral   #F4675E  (signature accent: brand mark, ratings, highlights)
    magenta #C658A1  (secondary accent: tags, category chips)
    indigo  #4858A3  (primary action colour: buttons, links, active nav)

  Baaki poora UI white / off-white / halka neutral rehta hai. Dark colours kabhi
  dominate nahi karte. GRADIENTS bilkul nahi - har jagah flat colour.

  Semantic tokens (background, primary, border...) CSS variables se aate hain
  (globals.css) taake alpha `hsl(var(--token) / 0.5)` ke sath kaam kare.
  Neeche wale direct scales fine-grained tints ke liye hain.
*/
const config: Config = {
  /*
    Light theme PRIMARY hai. Dark theme optional hai aur `.dark` class se chalta
    hai (ThemeProvider <html> par lagata hai). Tokens globals.css me hain, is
    liye yahan sirf strategy batani hoti hai.
  */
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1180px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--surface-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        /*
          Brand accent #1: coral (#F4675E is stop 400).
          Steps 50/100/200 SIRF surfaces aur borders ke liye hain, is liye wo
          variables se aate hain aur dark theme me khud gehre ho jate hain.
          300+ fixed hain kyunke wo text/solid fills me use hote hain.
        */
        coral: {
          50: "hsl(var(--coral-50))",
          100: "hsl(var(--coral-100))",
          200: "hsl(var(--coral-200))",
          300: "#fba8a2",
          400: "#f4675e",
          500: "#e8524a",
          600: "#d23f37",
          700: "#af322c",
          800: "#8f2a25",
          900: "#762522",
        },
        // ---- Brand accent #2: magenta (#C658A1 is stop 500) ----
        magenta: {
          50: "hsl(var(--magenta-50))",
          100: "hsl(var(--magenta-100))",
          200: "hsl(var(--magenta-200))",
          300: "#eaaad4",
          400: "#da7cbb",
          500: "#c658a1",
          600: "#ab4189",
          700: "#8c346f",
          800: "#732c5c",
          900: "#5f264c",
        },
        // ---- Brand accent #3: indigo (#4858A3 is stop 500) = primary action ----
        indigo: {
          50: "hsl(var(--indigo-50))",
          100: "hsl(var(--indigo-100))",
          200: "hsl(var(--indigo-200))",
          300: "#a7b3db",
          400: "#7a8ac4",
          500: "#4858a3",
          600: "#3d4b8e",
          700: "#333e75",
          800: "#2c3561",
          900: "#252c50",
        },
        /*
          Neutral ink scale (text + surfaces + borders). Poora scale variables se
          aata hai aur dark theme me ULT jata hai (50 sabse gehra, 900 sabse
          halka). Is ki wajah se neutral UI ek hi jagah se theme ho jata hai.
        */
        ink: {
          50: "hsl(var(--ink-50))",
          100: "hsl(var(--ink-100))",
          200: "hsl(var(--ink-200))",
          300: "hsl(var(--ink-300))",
          400: "hsl(var(--ink-400))",
          500: "hsl(var(--ink-500))",
          600: "hsl(var(--ink-600))",
          700: "hsl(var(--ink-700))",
          800: "hsl(var(--ink-800))",
          900: "hsl(var(--ink-900))",
        },
        /*
          System STATE colours - brand accents nahi. Sirf alerts/banners me use hote
          hain (success / warning / danger). Inhe tags ya buttons par mat lagao.
        */
        state: {
          success: "hsl(var(--state-success))",
          "success-soft": "hsl(var(--state-success-soft))",
          warning: "hsl(var(--state-warning))",
          "warning-soft": "hsl(var(--state-warning-soft))",
          danger: "hsl(var(--state-danger))",
          "danger-soft": "hsl(var(--state-danger-soft))",
        },
        /* Official logo mark ke do fills (dark theme me ulat jate hain). */
        logo: {
          pin: "hsl(var(--logo-pin))",
          glyph: "hsl(var(--logo-glyph))",
        },
      },

      borderRadius: {
        // Restrained radius - base 8px. Kuch bhi giant pill nahi.
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
      },

      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "sans-serif"],
      },

      fontSize: {
        // Thoda tighter display scale - oversized type avoid karne ke liye.
        "display-sm": ["1.75rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "display-md": ["2.25rem", { lineHeight: "1.15", letterSpacing: "-0.022em" }],
        "display-lg": ["2.75rem", { lineHeight: "1.1", letterSpacing: "-0.025em" }],
      },

      boxShadow: {
        // Sab shadows subtle - neutral ink par, koi coloured glow nahi. Card/xs
        // ko halka sa upar kiya (0.04 -> 0.06) taake stronger border ke sath
        // cards "flat" na lagein aur surface page se alag dikhe.
        xs: "0 1px 2px 0 rgb(27 29 38 / 0.05)",
        card: "0 1px 2px 0 rgb(27 29 38 / 0.06), 0 1px 3px 0 rgb(27 29 38 / 0.05)",
        "card-hover": "0 4px 16px -4px rgb(27 29 38 / 0.10), 0 1px 2px 0 rgb(27 29 38 / 0.04)",
        pop: "0 12px 32px -10px rgb(27 29 38 / 0.16), 0 1px 3px 0 rgb(27 29 38 / 0.05)",
        // Inset press-feedback (button :active)
        press: "inset 0 1px 2px 0 rgb(27 29 38 / 0.12)",
      },

      transitionTimingFunction: {
        // Ek hi easing poore product me - consistency = professional feel.
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },

      animation: {
        "fade-in": "fade-in 0.25s ease-out both",
        "fade-up": "fade-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 0.16s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-down": "slide-down 0.16s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-in-right": "slide-in-right 0.22s cubic-bezier(0.22, 1, 0.36, 1) both",
        "caret-blink": "caret-blink 1.1s steps(1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
