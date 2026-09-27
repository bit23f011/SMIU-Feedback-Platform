import { expect, test } from "@playwright/test";

/*
  Public smoke - sirf bahar se dikhne wala behaviour check karta hai. Yeh RLS ya
  RPC gate ka substitute NAHI (wo DB me test hote hain). Maqsad: build chalti hai
  aur admin surface anon ke liye chhupa rehta hai (README §50).
*/

test.describe("public smoke", () => {
  test("home page load hota hai aur brand dikhta hai", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ProfAura/);
  });

  test("/admin bina sign-in ke reach nahi hota", async ({ page }) => {
    const response = await page.goto("/admin");
    // requireAdmin() anon user ko home bhej deta hai; admin area reveal nahi hota.
    await expect(page).not.toHaveURL(/\/admin(\/|$)/);
    // Redirect/allow chahe jo ho, server error nahi hona chahiye.
    expect(response?.status() ?? 0).toBeLessThan(500);
  });
});
