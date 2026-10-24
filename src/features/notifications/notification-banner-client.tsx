"use client";
import { useEffect } from "react";
import { useSiteExperience } from "@/components/layout/site-experience";
import type { NotificationRow } from "@/features/notifications/types";
export function NotificationBannerClient({
  notification,
}: {
  notification: NotificationRow;
}) {
  const { announce } = useSiteExperience();
  useEffect(() => {
    announce(notification);
  }, [notification, announce]);
  return null;
}
