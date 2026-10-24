// Twitter card image = wahi Open Graph wala image reuse karte hain (duplicate JSX
// se bachne ke liye). Next.js is file ko twitter:image metadata me daal deta hai.
export { default, alt, size, contentType } from "./opengraph-image";
// Next runtime ko static string literal se parhta hai, re-export se nahi.
export const runtime = "edge";
