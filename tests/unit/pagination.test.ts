import { describe, expect, it } from "vitest";

import { pageHref } from "@/features/discovery/pagination";

/*
  pageHref untrusted filters ko URL me daalta hai. Yeh sirf navigation hai; asli
  had DB me hai (har list fn apni limit ko clamp karti hai), is liye bara page
  number likhne se kuch nahi hota. Yahan bas shape verify karte hain.
*/

describe("pageHref", () => {
  it("page 1 par koi `page` param nahi likhta (saaf URL)", () => {
    expect(pageHref("/admin/people", undefined, 1)).toBe("/admin/people");
    expect(pageHref("/admin/people", { category: "teacher" }, 1)).toBe("/admin/people?category=teacher");
  });

  it("khali / null / undefined filters skip ho jate hain", () => {
    expect(pageHref("/x", { q: "   ", category: "", a: null, b: undefined }, 1)).toBe("/x");
  });

  it("filters + page ko URL me daalta hai, page aakhir me", () => {
    expect(pageHref("/admin/people", { category: "teacher" }, 3)).toBe(
      "/admin/people?category=teacher&page=3",
    );
  });

  it("value ko trim karta hai aur number ko string banata hai", () => {
    expect(pageHref("/x", { c: 5 }, 1)).toBe("/x?c=5");
    expect(pageHref("/x", { q: "  ali  " }, 1)).toBe("/x?q=ali");
  });
});
