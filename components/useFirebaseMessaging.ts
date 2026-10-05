"use client";

import { useEffect } from "react";
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

      // Get FCM token
      setIsTokenFetching(true);
      const currentToken = await messaging.getToken({
        vapidKey: firebaseConfig.vapidKey || "",
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
    const unsubscribe = messaging.onMessage((payload) => {
      console.log("Foreground message received:", payload);
      sendNotification(payload.notification?.title || "New Notification", {
        body: payload.notification?.body || "",
        icon: "/logo.svg",
      });
    });

    return () => unsubscribe();
  }, []);

  // Listen for permission changes
  useEffect(() => {
    const unsub = messaging.onTokenRefresh(() => {
      messaging
        .getToken({ vapidKey: firebaseConfig.vapidKey || "" })
        .then((refreshedToken) => {
          setFcmToken(refreshedToken);
          // Send refreshed token to backend
          setUserFcmToken(refreshedToken).catch((err) =>
            console.error("Error sending refreshed token:", err)
          );
          console.log("FCM token refreshed:", refreshedToken);
        })
        .catch((err) => {
          console.error("Error getting refreshed token:", err);
        });
    });

    return () => unsub();
  }, []);

  return {
    fcmToken,
    initializeMessaging,
    isTokenFetching,
    permission,
  };
}