import React from "react";
import { useAppSelector } from "@store/hooks";
import { backendApi } from "@ipc/backendApi";
import { openExternal } from "@shared/utils/openExternal";
import { useBannerRegister } from "./BannerContext";
import type { BannerItem } from "./types";

const BANNER_ID = "subscription-expired";

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 7v4m0 2.5h.008M4.34 17h11.32c1.34 0 2.18-1.45 1.51-2.606L11.51 3.606a1.745 1.745 0 00-3.02 0L2.83 14.394C2.16 15.55 3 17 4.34 17z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SubscriptionBannerSource() {
  const subscription = useAppSelector((s) => s.auth.subscription);
  const balance = useAppSelector((s) => s.auth.balance);
  const jwt = useAppSelector((s) => s.auth.jwt);

  const handleRenew = React.useCallback(async () => {
    if (!jwt) return;
    try {
      if (subscription === null) {
        const result = await backendApi.createSetupCheckout(jwt, {});
        openExternal(result.checkoutUrl);
      } else {
        const result = await backendApi.getPortalUrl(jwt);
        openExternal(result.portalUrl);
      }
    } catch {
      // Stripe redirect failed — silently ignore; user can retry
    }
  }, [jwt, subscription]);

  // canceled → renew via portal; null + balance → lapsed, new checkout; null + no balance → never subscribed, no banner
  const shouldShow =
    subscription?.status === "canceled" || (subscription === null && balance !== null);

  const banner = React.useMemo<BannerItem | null>(() => {
    if (!shouldShow) return null;
    return {
      id: BANNER_ID,
      variant: "warning",
      icon: <WarningIcon />,
      title: "Subscription expired",
      subtitle: "Subscription paused. Renew to restore access.",
      action: { label: "Renew now", onClick: () => void handleRenew() },
      dismissible: "session",
    };
  }, [shouldShow, handleRenew]);

  useBannerRegister(banner);

  return null;
}
