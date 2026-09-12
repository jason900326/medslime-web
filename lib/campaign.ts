export const SIGNUP_TRIAL_CAMPAIGN_START = "2026-09-12T00:00:00+08:00";
export const SIGNUP_TRIAL_CAMPAIGN_END = "2026-09-26T00:00:00+08:00";
export const PRO_TRIAL_DAYS = 14;
export const WELCOME_GIFT_TICKETS = 10;

function timeOf(value: string | Date) {
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.NaN;
}

export function isSignupTrialCampaignOpen(now: Date = new Date()) {
  const current = now.getTime();
  return (
    current >= timeOf(SIGNUP_TRIAL_CAMPAIGN_START) &&
    current < timeOf(SIGNUP_TRIAL_CAMPAIGN_END)
  );
}

export function isEligibleCampaignSignup(createdAt: string | Date | null | undefined) {
  if (!createdAt) return false;
  const created = timeOf(createdAt);
  return (
    Number.isFinite(created) &&
    created >= timeOf(SIGNUP_TRIAL_CAMPAIGN_START) &&
    created < timeOf(SIGNUP_TRIAL_CAMPAIGN_END)
  );
}
