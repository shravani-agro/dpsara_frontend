"use client";

import { useEffect, useState } from "react";

export interface NotificationPermission {
  permission: "granted" | "denied" | "default";
}

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermission>({
    permission: "default",
  });

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!("Notification" in window)) {
      setPermission({ permission: "denied" });
      return { permission: "denied" };
    }

    const result = await Notification.requestPermission();
    setPermission({ permission: result });
    return { permission: result };
  };

  const sendNotification = async (
    title: string,
    options: NotificationOptions = {}
  ) => {
    if (permission.permission !== "granted") {
      await requestPermission();
    }

    if (permission.permission === "granted") {
      new Notification(title, {
        icon: "/logo.svg",
        badge: "/logo.svg",
        ...options,
      });
    }
  };

  return {
    permission,
    requestPermission,
    sendNotification,
  };
}