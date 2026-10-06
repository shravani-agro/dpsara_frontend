"use client";

import { useState, useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { messaging, firebaseConfig } from "@/lib/firebase-config";
import { setUserFcmToken, getUserFcmToken } from "@/lib/admin";
import { useNotification } from "./useNotification";

export function useFirebaseMessaging() {
  const { permission, requestPermission, sendNotification } = useNotification();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isTokenFetching, setIsTokenFetching] = useState(false);

  // Request notification permission and get FCM token
  const initializeMessaging = async () => {
    try {
      // Request browser notification permission
      await requestPermission();

      if (!messaging) {
        console.warn("Firebase Messaging is not supported or not initialized");
        return;
      }

      // Get FCM token
      setIsTokenFetching(true);
      const currentToken = await getToken(messaging, {
        vapidKey: firebaseConfig.vapidKey || undefined,
      });

      if (currentToken) {
        setFcmToken(currentToken);
        // Send token to backend
        await setUserFcmToken(currentToken);
        console.log("FCM Token sent to backend:", currentToken);
      } else {
        console.log(
          "No FCM token obtained. User may have not granted permission."
        );
      }
    } catch (error) {
      console.error("Error initializing Firebase Messaging:", error);
    } finally {
      setIsTokenFetching(false);
    }
  };

  // Listen for foreground messages
  useEffect(() => {
    if (!messaging) return;
    const unsubscribe = onMessage(messaging, (payload: any) => {
      console.log("Foreground message received:", payload);
      sendNotification(payload.notification?.title || "New Notification", {
        body: payload.notification?.body || "",
        icon: "/logo.svg",
      });
    });

    return () => unsubscribe();
  }, []);

  return {
    fcmToken,
    initializeMessaging,
    isTokenFetching,
    permission,
  };
}