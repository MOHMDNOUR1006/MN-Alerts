/**
 * MN Alerts — Unified Ecosystem Auth, Subscription Tiers & Loyalty Rank Engine
 * Connects directly to MN Subscriptions Firebase Auth + Firestore (`subscriptions-88ad4`)
 * and calculates Subscription Tier + Loyalty Tenure + Creator Rank.
 */

import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

const FOUNDER_EMAILS = ['abdosy275@gmail.com', 'abdsoy275@gmail.com', 'mohmadnour@gmail.com'];

export const TIER_ORDER = {
  free: 0,
  plus: 1,
  pro: 2,
  ultra: 3,
  developer: 4,
};

export const PLAN_BADGES = {
  free: { label: 'Free (مجاني)', color: '#94A3B8' },
  plus: { label: 'Plus (بلس)', color: '#38BDF8' },
  pro: { label: 'Pro (برو)', color: '#2DD4BF' },
  ultra: { label: 'Ultra (ألترا)', color: '#C084FC' },
  developer: { label: 'المؤسس (Founder)', color: '#FDE047' },
};

export const RANK_LEVELS = [
  { id: 1, level: 1, key: 'rookie', title: 'صانع محتوى صاعد', nameAr: 'صانع محتوى صاعد (Rookie)', minXp: 0, icon: '🌱', badge: '🌱', color: '#94a3b8' },
  { id: 2, level: 2, key: 'rising', title: 'ستريمر متألق', nameAr: 'ستريمر متألق (Streamer)', minXp: 300, icon: '⚡', badge: '⚡', color: '#38bdf8' },
  { id: 3, level: 3, key: 'veteran', title: 'نجم محترف', nameAr: 'نجم محترف (Pro Creator)', minXp: 900, icon: '🔥', badge: '🔥', color: '#2dd4bf' },
  { id: 4, level: 4, key: 'master', title: 'أسطورة البث', nameAr: 'أسطورة البث (Stream Master)', minXp: 2200, icon: '👑', badge: '👑', color: '#a855f7' },
  { id: 5, level: 5, key: 'mythic', title: 'الرتبة الخالدة', nameAr: 'الرتبة الخالدة (Mythic Icon)', minXp: 5000, icon: '🌌', badge: '🌌', color: '#fde047' },
];

export function isDeveloperEmail(email) {
  return Boolean(email) && FOUNDER_EMAILS.includes(String(email).trim().toLowerCase());
}

export function enrichUserWithRank(user) {
  if (!user) return null;
  const r = getRankForUser(user);
  return { ...user, rankLevel: r.level, rankTitle: r.title, rankIcon: r.icon };
}

const authListeners = new Set();
let currentUser = null;
let authReady = false;

function emit(user) {
  currentUser = user;
  authListeners.forEach((cb) => {
    try { cb(user); } catch (_) {}
  });
}

/** Loads the real subscription of a signed-in Google user from Firestore (subscriptions/{uid}). */
async function buildUser(fbUser) {
  const base = {
    uid: fbUser.uid,
    email: fbUser.email || '',
    displayName: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : ''),
    photoURL: fbUser.photoURL || '',
  };
  let sub = { plan: 'free', loyaltyMonths: 0, xp: 0 };
  try {
    sub = await syncSubscription(fbUser.uid, base.email);
  } catch (err) {
    console.warn('[MN Alerts] subscription lookup failed:', err);
  }
  return enrichUserWithRank({ ...base, ...sub });
}

export function subscribeToEcosystemAuth(callback) {
  authListeners.add(callback);
  if (authReady) callback(currentUser);
  return () => authListeners.delete(callback);
}

if (auth) {
  onAuthStateChanged(auth, async (fbUser) => {
    authReady = true;
    emit(fbUser ? await buildUser(fbUser) : null);
  });
} else {
  authReady = true;
}

export async function signInWithGoogleAccount() {
  if (!auth || !googleProvider) {
    throw new Error('Firebase غير مُعدّ: تأكد من متغيرات VITE_FIREBASE_* في Vercel.');
  }
  await signInWithPopup(auth, googleProvider);
}

export async function signOutEcosystem() {
  if (auth) await signOut(auth);
}

export function getSubscriptionsPortalUrl() {
  return 'https://mn-subscriptions.vercel.app';
}

export function getRankForUser(user) {
  if (!user) return RANK_LEVELS[0];
  if (isDeveloperEmail(user.email) || user.plan === 'developer') return RANK_LEVELS[4];
  const xp = Number(user.xp || 0);
  let current = RANK_LEVELS[0];
  for (const r of RANK_LEVELS) {
    if (xp >= r.minXp) current = r;
  }
  return current;
}

/**
 * Checks if a user meets the unlock requirement of an alert/package:
 * - accessType: 'free' | 'plus' | 'pro' | 'ultra' | 'loyalty' | 'store'
 */
export function checkPackUnlockStatus(pack, user, ownedIds = []) {
  if (!pack) return { unlocked: false, reason: '', reasonAr: '' };
  const accessType = pack.accessType || pack.accessTier || 'free';
  if (ownedIds.includes(pack.id)) return { unlocked: true, reason: 'مملوك في مكتبتك', reasonAr: 'مملوك في مكتبتك' };
  if (accessType === 'free') return { unlocked: true, reason: 'مجاني للجميع', reasonAr: 'مجاني للجميع' };

  const userPlan = user ? (isDeveloperEmail(user.email) ? 'developer' : (user.plan || 'free')) : 'free';
  if (userPlan === 'developer') {
    return { unlocked: true, reason: '👑 مفتوح تلقائياً (حساب المؤسس)', reasonAr: '👑 مفتوح تلقائياً (حساب المؤسس)' };
  }

  const userTierNum = TIER_ORDER[userPlan] ?? 0;

  if (accessType === 'plus' || accessType === 'pro' || accessType === 'ultra') {
    const reqNum = TIER_ORDER[accessType] ?? 1;
    if (userTierNum >= reqNum) {
      const msg = `مفتوح ضمن اشتراكك (${userPlan.toUpperCase()})`;
      return { unlocked: true, reason: msg, reasonAr: msg };
    }
    const msg = `يتطلب اشتراك ${accessType.toUpperCase()} أو أعلى`;
    return { unlocked: false, reason: msg, reasonAr: msg };
  }

  if (accessType === 'loyalty') {
    const months = Number(user?.loyaltyMonths || 0);
    const rank = getRankForUser(user);
    const reqMonths = pack.requiredMonths || 3;
    const reqRank = pack.requiredRank || 3;
    if (months >= reqMonths || rank.id >= reqRank || userTierNum >= TIER_ORDER.ultra) {
      const msg = 'مفتوح باستحقاق الولاء والرتبة';
      return { unlocked: true, reason: msg, reasonAr: msg };
    }
    const msg = `يتطلب ولاء ${reqMonths} أشهر اشتراك أو رتبة المستوى ${reqRank} (أو خطة ULTRA)`;
    return { unlocked: false, reason: msg, reasonAr: msg };
  }

  if (accessType === 'store') {
    if (userTierNum >= TIER_ORDER.ultra) {
      const msg = 'مفتوح مجاناً لحاملي اشتراك ULTRA';
      return { unlocked: true, reason: msg, reasonAr: msg };
    }
    const msg = `شراء منفرد (${pack.priceEgp || 120} ج.م) أو مجاناً مع خطة ULTRA`;
    return { unlocked: false, reason: msg, reasonAr: msg };
  }

  return { unlocked: false, reason: 'مغلق', reasonAr: 'مغلق' };
}

/** Reads the real subscription document for this user (readable only by its owner per Firestore rules). */
export async function syncSubscription(uid, email = '') {
  if (isDeveloperEmail(email)) {
    return { plan: 'developer', isDeveloper: true, loyaltyMonths: 24, xp: 9999, status: 'active' };
  }
  if (!db || !uid) return { plan: 'free', loyaltyMonths: 0, xp: 0, status: 'active' };

  const snap = await getDoc(doc(db, 'subscriptions', uid));
  if (!snap.exists()) return { plan: 'free', loyaltyMonths: 0, xp: 0, status: 'active' };

  const f = snap.data();
  if (f.expiresAt && new Date(f.expiresAt) <= new Date()) {
    return { plan: 'free', loyaltyMonths: 0, xp: 0, status: 'expired' };
  }
  const plan = String(f.plan || 'free').toLowerCase();
  let loyaltyMonths = 1;
  if (f.createdAt) {
    loyaltyMonths = Math.max(1, Math.floor((Date.now() - new Date(f.createdAt).getTime()) / (30 * 24 * 3600 * 1000)) + 1);
  }
  const planBonus = { ultra: 2600, pro: 1200, plus: 450 }[plan] || 0;
  return { plan, loyaltyMonths, xp: planBonus + loyaltyMonths * 150, status: 'active', expiresAt: f.expiresAt || null };
}
