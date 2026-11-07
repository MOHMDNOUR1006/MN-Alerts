import {
  collection, doc, getDocs, setDoc, query, where, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { isDeveloperEmail } from './ecosystemAuth';

/** Funding goal for the next Quant update, in US dollars. */
export const FUNDING_GOAL_USD = 10000;

// Payment destination — set in Vercel env (never hardcoded).
const env = import.meta.env;
export const VODAFONE_CASH_NUMBER = (env.VITE_VODAFONE_CASH_NUMBER || '').trim();
export const VODAFONE_CASH_OWNER = (env.VITE_VODAFONE_CASH_OWNER_NAME || '').trim();
export const MEEZA_INFO = (env.VITE_MEEZA_CARD_INFO || '').trim();

export const canAcceptPayments = Boolean(VODAFONE_CASH_NUMBER || MEEZA_INFO);
export const isAdminUser = (user) => Boolean(user && isDeveloperEmail(user.email));

/** Real totals: the sum of contributions the owner has confirmed as received. */
export async function fetchFundingState() {
  if (!db) return { raisedUsd: 0, count: 0, contributors: [] };
  const snap = await getDocs(collection(db, 'funding_contributions'));
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const raisedUsd = items.reduce((sum, c) => sum + (Number(c.amountUsd) || 0), 0);
  const contributors = items
    .filter((c) => c.publicName)
    .sort((a, b) => (b.amountUsd || 0) - (a.amountUsd || 0))
    .map((c) => ({ name: c.publicName, amountUsd: c.amountUsd }));
  return { raisedUsd, count: items.length, contributors };
}

const normalizeTxn = (raw) => String(raw || '').replace(/[^A-Za-z0-9]/g, '');

/** Contributor submits proof of a transfer; it is pending until the owner confirms it. */
export async function submitPledge(user, { method, amountEgp, senderPhone, transactionId, publicName }) {
  if (!user?.uid) throw new Error('سجّل الدخول بحساب Google أولاً.');
  if (!db) throw new Error('قاعدة البيانات غير متصلة.');
  const txn = normalizeTxn(transactionId);
  if (txn.length < 6 || txn.length > 30) throw new Error('رقم العملية غير صحيح.');
  const amount = Number(amountEgp);
  if (!(amount >= 10)) throw new Error('الحد الأدنى للمساهمة 10 جنيه.');

  const data = {
    uid: user.uid,
    email: user.email || '',
    method,
    amountEgp: amount,
    senderPhone: String(senderPhone || ''),
    transactionId: txn,
    publicName: String(publicName || '').slice(0, 40),
    status: 'pending',
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'funding_pledges', `fp_${txn}`), data);
}

export async function listPendingPledges() {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'funding_pledges'), where('status', '==', 'pending')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Owner confirms the money arrived and records its USD value. This is what moves the progress bar. */
export async function confirmPledge(pledge, amountUsd, adminEmail) {
  const usd = Number(amountUsd);
  if (!(usd > 0)) throw new Error('أدخل القيمة بالدولار.');
  const batch = writeBatch(db);
  batch.set(doc(db, 'funding_contributions', pledge.id), {
    amountUsd: usd,
    amountEgp: pledge.amountEgp,
    method: pledge.method,
    publicName: pledge.publicName || '',
    confirmedBy: adminEmail,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, 'funding_pledges', pledge.id), { status: 'approved', reviewedBy: adminEmail });
  await batch.commit();
}

export async function rejectPledge(pledge, adminEmail) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'funding_pledges', pledge.id), { status: 'rejected', reviewedBy: adminEmail });
  await batch.commit();
}
