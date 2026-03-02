import React from "react";
import { getDesktopApiOrNull } from "@ipc/desktopApi";

export type DeepLinkAuthParams = {
  jwt: string;
  email: string;
  userId: string;
  isNewUser: boolean;
};

/**
 * Shared deep-link subscription for `auth` and `stripe-success` events.
 * Handles URL parsing and param normalization; delegates actions to callbacks.
 */
export function useDeepLinkAuth(handlers: {
  onAuth: (params: DeepLinkAuthParams) => void;
  onAuthError?: () => void;
  onStripeSuccess: () => void;
}) {
  const handlersRef = React.useRef(handlers);
  handlersRef.current = handlers;

  React.useEffect(() => {
    const api = getDesktopApiOrNull();
    if (!api?.onDeepLink) return;

    const unsub = api.onDeepLink((payload) => {
      if (payload.host === "auth" || payload.pathname === "/auth") {
        const { token, email, userId, isNewUser } = payload.params;
        if (token && email && userId) {
          handlersRef.current.onAuth({
            jwt: token,
            email: decodeURIComponent(email),
            userId,
            isNewUser: isNewUser === "true",
          });
        } else {
          handlersRef.current.onAuthError?.();
        }
      } else if (payload.host === "stripe-success") {
        handlersRef.current.onStripeSuccess();
      }
    });

    return unsub;
  }, []);
}
