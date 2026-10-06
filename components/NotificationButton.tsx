"use client";

import { useFirebaseMessaging } from "./useFirebaseMessaging";
import { useNotification } from "./useNotification";
import { Button, Badge, Input } from "@/components/ui";

export function NotificationCenter() {
  const { permission, requestPermission, sendNotification } = useNotification();
  const { fcmToken, initializeMessaging, isTokenFetching } = useFirebaseMessaging();

  return (
    <div className="space-y-4">
      {/* Permission Status */}
      <div>
        <Badge
          color={
            permission.permission === "granted"
              ? "emerald"
              : permission.permission === "denied"
                ? "red"
                : "amber"
          }
        >
          {permission.permission}
        </Badge>
        <span className="text-sm text-slate-400">
          {permission.permission === "granted"
            ? "Notifications enabled"
            : permission.permission === "denied"
              ? "Notifications disabled"
              : "Request permission"}
        </span>
      </div>

      {/* FCM Token Status */}
      {fcmToken ? (
        <div>
          <span className="text-xs text-slate-500">FCM Token:</span>
          <Input
            value={fcmToken}
            readOnly
            className="bg-slate-900/50 rounded w-full py-2 text-xs mt-1"
          />
        </div>
      ) : (
        <span className="text-xs text-slate-500">No FCM token yet</span>
      )}

      {/* Token Fetching State */}
      {isTokenFetching && (
        <div className="mt-2">
          <span className="text-xs text-slate-500">Fetching FCM token...</span>
        </div>
      )}

      {/* Actions */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={requestPermission}
          disabled={permission.permission !== "default"}
        >
          {permission.permission === "default" ? "Request Permission" : "Re-check"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={initializeMessaging}
          disabled={
            permission.permission !== "granted" ||
            isTokenFetching
          }
        >
          {isTokenFetching ? "Setting Up..." : "Initialize FCM"}
        </Button>
      </div>

      {/* Quick Send */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-400">Quick Send</label>
        <Input
          placeholder="Message title"
          className="mb-2"
        />
        <Input
          placeholder="Message body"
          className="mb-2"
        />
        <Button
          size="sm"
          onClick={() => {
            // This would need the full FCM setup
            sendNotification("Test", { body: "Test notification" });
          }}
        >
          Send Test
        </Button>
      </div>
    </div>
  );
}