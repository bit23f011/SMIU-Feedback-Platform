"use client";
import { useEffect } from "react";
import { useSiteExperience } from "@/components/layout/site-experience";
import type { NotificationRow } from "@/features/notifications/types";
export function NotificationBannerClient({
  notifications,
}: {
  notifications: NotificationRow[];
}) {
  const { announce } = useSiteExperience();
  useEffect(() => {
    announce(notifications);
  }, [notifications, announce]);
  return null;
}
