/**
 * Account / Billing tab for Settings.
 * States:
 *  1. paid + jwt + subscription  → balance dashboard
 *  1a. paid + jwt + payment/provisioning pending → waiting spinner
 *  1b. paid + jwt + no subscription → subscribe prompt
 *  2. paid + !jwt → sign-up prompt (Continue with Google)
 *  3. self-managed → fallback (tab should be hidden, but graceful)
 */
import React from "react";

import type { SubscriptionPriceInfo } from "@ipc/backendApi";
import { PrimaryButton, Modal } from "@shared/kit";
import { LogOutIcon } from "@shared/kit/icons";
import { AutoTopUpControl } from "@shared/billing/AutoTopUpControl";
import { AnimatedBalance } from "@shared/billing/AnimatedBalance";
import { addToastError } from "@shared/toast";

import googleIcon from "@assets/set-up-skills/Google.svg";
import s from "./AccountTab.module.css";
import { useAccountState } from "./useAccountState";

function formatDollars(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatSubscriptionPrice(price: SubscriptionPriceInfo | null): string {
  if (!price || !price.amountCents) return "$25/mo";
  const dollars = price.amountCents / 100;
  const interval = price.interval === "year" ? "yr" : "mo";
  return `$${dollars.toFixed(dollars % 1 === 0 ? 0 : 2)}/${interval}`;
}

const PER_MONTH_PLAN_USD = 5;

// ── Sub-components ────────────────────────────────────────────────

function AccountFooter(props: {
  email: string | null;
  onLogout: () => void;
  confirmOpen: boolean;
  setConfirmOpen: (v: boolean) => void;
  logoutBusy: boolean;
  onConfirmLogout: () => void;
}) {
  return (
    <>
      <div className={s.accountFooter}>
        <div className={s.accountAvatar}>
          {props.email ? props.email.charAt(0).toUpperCase() : "?"}
        </div>
        <span className={s.accountEmail}>{props.email}</span>
        <button
          type="button"
          className={s.logoutBtn}
          onClick={props.onLogout}
          aria-label="Log out"
          title="Log out"
        >
          <LogOutIcon />
        </button>
      </div>
      <Modal
        open={props.confirmOpen}
        onClose={() => {
          if (props.logoutBusy) return;
          props.setConfirmOpen(false);
        }}
        header="Log out?"
        aria-label="Confirm log out"
      >
        <p className={s.logoutConfirmDescription}>
          You will stay in subscription mode, but your current account session will be signed out.
        </p>
        <div className={s.logoutConfirmActions}>
          <button
            type="button"
            className={s.logoutConfirmCancel}
            onClick={() => props.setConfirmOpen(false)}
            disabled={props.logoutBusy}
          >
            Cancel
          </button>
          <button
            type="button"
            className={s.logoutConfirmAccept}
            onClick={() => void props.onConfirmLogout()}
            disabled={props.logoutBusy}
          >
            {props.logoutBusy ? "Logging out..." : "Log out"}
          </button>
        </div>
      </Modal>
    </>
  );
}

function SignUpPrompt(props: { onContinueWithGoogle: () => void }) {
  return (
    <div className={s.root}>
      <div className={s.signUpCard}>
        <h3 className={s.signUpTitle}>Sign up to continue</h3>
        <p className={s.signUpHint}>Sign in or create your account to continue</p>
        <button type="button" className={s.googleBtn} onClick={props.onContinueWithGoogle}>
          <img src={googleIcon} alt="" width={20} height={20} />
          Continue with Google
        </button>
      </div>
    </div>
  );
}

function PaymentPendingCard(props: { subscribePaymentPending: boolean; footer: React.ReactNode }) {
  return (
    <div className={s.root}>
      <div className={s.subscribeCard}>
        <span className="UiButtonSpinner" aria-hidden="true" />
        <h3 className={s.subscribeTitle}>
          {props.subscribePaymentPending ? "Waiting for payment..." : "Setting up your account..."}
        </h3>
        <p className={s.subscribeHint}>
          {props.subscribePaymentPending
            ? "Complete the checkout in your browser, then return here."
            : "Provisioning your API keys. This may take a moment."}
        </p>
      </div>
      {props.footer}
    </div>
  );
}

function SubscribePrompt(props: {
  onSubscribe: () => void;
  subscribeBusy: boolean;
  subscriptionPrice: SubscriptionPriceInfo | null;
  footer: React.ReactNode;
}) {
  return (
    <div className={s.root}>
      <div className={s.subscribeCard}>
        <h3 className={s.subscribeTitle}>Subscribe to get started</h3>
        <p className={s.subscribeHint}>
          Get AI credits, 200+ integrations, and more with your OpenClaw subscription.
        </p>
        <PrimaryButton
          onClick={props.onSubscribe}
          loading={props.subscribeBusy}
          disabled={props.subscribeBusy}
        >
          Subscribe {formatSubscriptionPrice(props.subscriptionPrice)}
        </PrimaryButton>
      </div>
      {props.footer}
    </div>
  );
}

function BalanceDashboard(props: {
  state: ReturnType<typeof useAccountState>;
  footer: React.ReactNode;
}) {
  const st = props.state;
  const remaining = st.balance?.remaining ?? 0;
  const usage = st.balance?.usage ?? 0;
  const subscriptionExpired =
    st.subscription?.status === "canceled" || (st.subscription === null && st.balance !== null);
  const balanceDepleted =
    !subscriptionExpired &&
    st.subscription !== null &&
    st.balance !== null &&
    st.balance.remaining <= 0.05;
  const showRedBalance = subscriptionExpired || balanceDepleted;

  return (
    <div className={s.root}>
      <div className={s.balanceCard}>
        <div className={s.balanceHeader}>
          <h3 className={s.balanceTitle}>Balance</h3>
          <button
            type="button"
            className={s.manageLink}
            onClick={st.handleManageSubscription}
            disabled={st.portalBusy}
          >
            Manage
          </button>
        </div>

        <div className={s.balanceHero}>
          <span
            className={`${s.balanceAmount}${showRedBalance ? ` ${s["balanceAmount--expired"]}` : ""}`}
          >
            {showRedBalance ? "$0" : <AnimatedBalance value={remaining} />}
          </span>
          {st.balancePolling ? (
            <span className={s.balancePollingHint}>
              <span className={s.balancePollingSpinner} aria-hidden="true" />
              Updating...
            </span>
          ) : (
            <span className={s.balanceLabel}>Remaining credits</span>
          )}
          <span className={s.infoIcon} title="Credits remaining on your plan">
            &#9432;
          </span>
        </div>

        {subscriptionExpired && (
          <div className={s.expiredCard}>
            <div className={s.expiredBody}>
              <div className={s.expiredTitle}>Subscription expired</div>
              <div className={s.expiredSubtitle}>Subscription paused. Renew to restore access.</div>
            </div>
            <button
              type="button"
              className={s.expiredAction}
              onClick={() => {
                if (st.subscription === null) {
                  void st.handleSubscribe();
                } else {
                  void st.handleManageSubscription();
                }
              }}
            >
              Renew now
            </button>
          </div>
        )}

        {balanceDepleted && (
          <div className={s.expiredCard}>
            <div className={s.expiredBody}>
              <div className={s.expiredTitle}>No credits left</div>
              <div className={s.expiredSubtitle}>Top up to continue using AI.</div>
            </div>
            <button type="button" className={s.expiredAction} onClick={() => void st.handleTopUp()}>
              Top up
            </button>
          </div>
        )}

        <div className={s.statsRow}>
          <div className={s.statBox}>
            <span className={s.statLabel}>Used today</span>
            <span className={s.statValue}>{formatDollars(0)}</span>
          </div>
          <div className={s.statBox}>
            <span className={s.statLabel}>Used this month</span>
            <span className={s.statValue}>
              <AnimatedBalance value={usage} />
            </span>
          </div>
          <div className={s.statBox}>
            <span className={s.statLabel}>Per month plan</span>
            <span className={s.statValue}>{formatDollars(PER_MONTH_PLAN_USD)}</span>
          </div>
        </div>
      </div>

      <AutoTopUpControl
        settings={st.autoTopUp}
        loading={st.autoTopUpLoading}
        saving={st.autoTopUpSaving}
        error={st.autoTopUpError}
        onPatch={st.handleAutoTopUpPatch}
        onError={addToastError}
        title="Auto refill credits"
      />

      <div className={s.topUpSection}>
        <h3 className={s.topUpTitle}>One-Time Top-Up</h3>
        <div className={s.topUpRow}>
          <div className={s.topUpInputWrap}>
            <span className={s.topUpCurrency}>$</span>
            <input
              type="number"
              className={s.topUpInput}
              value={st.topUpAmount}
              onChange={(e) => st.setTopUpAmount(e.target.value)}
              min={0.01}
              step={0.01}
            />
          </div>
          <button
            type="button"
            className={s.topUpButton}
            onClick={() => void st.handleTopUp()}
            disabled={st.topUpPending}
          >
            {st.topUpPending ? "Opening..." : "Top Up"}
          </button>
        </div>
      </div>

      {props.footer}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

export function AccountTab() {
  const state = useAccountState();

  const footer = state.jwt ? (
    <AccountFooter
      email={state.email}
      onLogout={state.onLogout}
      confirmOpen={state.confirmLogoutOpen}
      setConfirmOpen={state.setConfirmLogoutOpen}
      logoutBusy={state.logoutBusy}
      onConfirmLogout={state.handleConfirmLogout}
    />
  ) : null;

  if (state.mode === "paid" && !state.jwt) {
    return <SignUpPrompt onContinueWithGoogle={state.handleContinueWithGoogle} />;
  }

  if (state.mode === "paid" && state.jwt && (state.subscribePaymentPending || state.provisioning)) {
    return (
      <PaymentPendingCard subscribePaymentPending={state.subscribePaymentPending} footer={footer} />
    );
  }

  if (state.mode === "paid" && state.jwt && state.needsSubscription) {
    return (
      <SubscribePrompt
        onSubscribe={() => void state.handleSubscribe()}
        subscribeBusy={state.subscribeBusy}
        subscriptionPrice={state.subscriptionPrice}
        footer={footer}
      />
    );
  }

  if (state.mode === "paid" && state.jwt) {
    return <BalanceDashboard state={state} footer={footer} />;
  }

  return (
    <div className={s.root}>
      <div className={s.balanceCard}>
        <h3 className={s.balanceTitle}>Account</h3>
        <p className={s.selfManagedHint}>
          You are in self-managed mode. Switch to subscription in the Other tab to use managed AI
          models.
        </p>
      </div>
    </div>
  );
}
