"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";

// VisuallyHidden = content screen readers ko milta hai magar visually chhupa hota hai.
// Icon-only buttons ke accessible labels ke liye.
const VisuallyHidden = VisuallyHiddenPrimitive.Root;

export { VisuallyHidden };
