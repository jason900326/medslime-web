import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateStudyStreak,
  cloneStarterState,
  duplicateCoinRefund,
  getLocalDateKey,
  getLocalWeekKey,
  normalizeState,
  rollRarity,
} from "../lib/game-state-logic.ts";

const activity = (overrides = {}) => ({
  questionsAnswered: 0,
  mistakesReviewed: 0,
  focusSeconds: 0,
  ...overrides,
});

test("cloneStarterState returns independent mutable collections", () => {
  const first = cloneStarterState();
  const second = cloneStarterState();

  first.coins = 99;
  first.slimes["n-green"].nickname = "Green";
  first.claimedTaskIds.push("task-1");

  assert.equal(second.coins, 0);
  assert.equal(second.slimes["n-green"].nickname, undefined);
  assert.deepEqual(second.claimedTaskIds, []);
});

test("normalizeState clamps numeric balances and strips retired slime fields", () => {
  const normalized = normalizeState({
    coins: -12,
    tickets: 7,
    pity: -2,
    totalPulls: 4,
    claimedAchievementIds: ["a", 123, null],
    claimedTaskIds: ["t", false],
    slimes: {
      "n-green": {
        owned: true,
        nickname: "  小綠  ",
        fragments: 999,
        accessoryUnlocked: true,
        accessoryEquipped: true,
      },
      "r-test": {
        owned: true,
        fragments: 10,
      },
    },
  });

  assert.equal(normalized.coins, 0);
  assert.equal(normalized.tickets, 7);
  assert.equal(normalized.pity, 0);
  assert.equal(normalized.totalPulls, 4);
  assert.deepEqual(normalized.claimedAchievementIds, ["a"]);
  assert.deepEqual(normalized.claimedTaskIds, ["t"]);
  assert.deepEqual(normalized.slimes["n-green"], {
    owned: true,
    nickname: "  小綠  ",
  });
  assert.deepEqual(normalized.slimes["r-test"], { owned: true });
  assert.equal("fragments" in normalized.slimes["n-green"], false);
  assert.equal("accessoryUnlocked" in normalized.slimes["n-green"], false);
});

test("calculateStudyStreak counts today and consecutive previous active days", () => {
  const now = new Date(2026, 8, 17, 12, 0, 0);
  const activityByDate = {
    "2026-09-17": activity({ questionsAnswered: 5 }),
    "2026-09-16": activity({ focusSeconds: 600 }),
    "2026-09-15": activity({ mistakesReviewed: 1 }),
    "2026-09-13": activity({ questionsAnswered: 99 }),
  };

  assert.equal(calculateStudyStreak(activityByDate, now), 3);
});

test("calculateStudyStreak keeps yesterday's streak when today has no activity", () => {
  const now = new Date(2026, 8, 17, 12, 0, 0);
  const activityByDate = {
    "2026-09-16": activity({ questionsAnswered: 1 }),
    "2026-09-15": activity({ questionsAnswered: 1 }),
  };

  assert.equal(calculateStudyStreak(activityByDate, now), 2);
  assert.equal(calculateStudyStreak({}, now), 0);
});

test("local date and week keys use Monday as the week boundary", () => {
  const monday = new Date(2026, 8, 14, 12, 0, 0);
  const sunday = new Date(2026, 8, 20, 12, 0, 0);
  const nextMonday = new Date(2026, 8, 21, 12, 0, 0);

  assert.equal(getLocalDateKey(monday), "2026-09-14");
  assert.equal(getLocalWeekKey(monday), "2026-09-14");
  assert.equal(getLocalWeekKey(sunday), "2026-09-14");
  assert.equal(getLocalWeekKey(nextMonday), "2026-09-21");
});

test("duplicate refund values stay aligned with rarity balancing", () => {
  assert.equal(duplicateCoinRefund("N"), 20);
  assert.equal(duplicateCoinRefund("R"), 35);
  assert.equal(duplicateCoinRefund("SR"), 60);
  assert.equal(duplicateCoinRefund("SSR"), 150);
});

test("rollRarity respects probability boundaries and forced rarity", () => {
  assert.equal(rollRarity(false, false, () => 0), "N");
  assert.equal(rollRarity(false, false, () => 0.449999), "N");
  assert.equal(rollRarity(false, false, () => 0.45), "R");
  assert.equal(rollRarity(false, false, () => 0.819999), "R");
  assert.equal(rollRarity(false, false, () => 0.82), "SR");
  assert.equal(rollRarity(false, false, () => 0.996999), "SR");
  assert.equal(rollRarity(false, false, () => 0.997), "SSR");
  assert.equal(rollRarity(false, true, () => 0), "SR");
  assert.equal(rollRarity(true, false, () => 0), "SSR");
  assert.equal(rollRarity(true, true, () => 0), "SSR");
});
