import React, { useEffect, useState, useCallback } from 'react';
import {
  FUNDING_GOAL_USD, VODAFONE_CASH_NUMBER, VODAFONE_CASH_OWNER, MEEZA_INFO,
  canAcceptPayments, isAdminUser, fetchFundingState, submitPledge,
  listPendingPledges, confirmPledge, rejectPledge,
} from '../services/funding';

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export default function FundingView({ user, onLogin, toast }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState([]);
  const [usdInputs, setUsdInputs] = useState({});
  const [form, setForm] = useState({ method: 'vodafone_cash', amountEgp: '', senderPhone: '', transactionId: '', publicName: '' });
  const [busy, setBusy] = useState(false);

  const admin = isAdminUser(user);

  const load = useCallback(async () => {
    try {
      setState(await fetchFundingState());
      setError('');
    } catch (e) {
      setError('تعذّر تحميل بيانات التمويل الحقيقية حالياً.');
    }
    if (admin) {
      try { setPending(await listPendingPledges()); } catch (_) {}
    }
  }, [admin]);

  useEffect(() => { load(); }, [load]);

  const raised = state?.raisedUsd || 0;
  const pct = Math.min(100, (raised / FUNDING_GOAL_USD) * 100);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await submitPledge(user, form);
      toast('✅ تم استلام طلبك. سيظهر في الشريط بعد تأكيد وصول المبلغ.');
      setForm({ ...form, amountEgp: '', transactionId: '' });
    } catch (err) {
      toast(err?.code === 'permission-denied' ? 'رقم العملية مستخدم من قبل أو البيانات غير صحيحة.' : err.message);
    }
    setBusy(false);
  };

  return (
    <section className="view-section">
      <div className="topbar">
        <div className="page-title">
          <h1>دعم تحديث Quant القادم</h1>
          <p>عند الوصول إلى الهدف يبدأ تطوير التحديث. الأرقام أدناه هي المبالغ المؤكَّد وصولها فعلياً فقط.</p>
        </div>
      </div>

      <div className="funding-card">
        <div className="funding-numbers">
          <div><b>{fmt(raised)}</b><span> تم جمعها</span></div>
          <div><b>{fmt(FUNDING_GOAL_USD)}</b><span> الهدف</span></div>
        </div>
        <div className="funding-bar"><div className="funding-fill" style={{ width: `${pct}%` }} /></div>
        <div className="funding-sub">
          {state ? `${pct.toFixed(1)}% • ${state.count} مساهمة مؤكَّدة` : error || 'جارٍ التحميل…'}
        </div>
        {state?.contributors?.length > 0 && (
          <div className="funding-wall">
            {state.contributors.map((c, i) => <span key={i} className="acc-pill">{c.name} — {fmt(c.amountUsd)}</span>)}
          </div>
        )}
      </div>

      <div className="studio-customizer-panel">
        <h3 style={{ margin: 0 }}>كيف تساهم؟</h3>
        {!canAcceptPayments ? (
          <p className="u-obs-sub">فتح باب المساهمات قريباً — لم يتم إعداد وسيلة الدفع بعد.</p>
        ) : (
          <>
            <ol className="u-obs-sub" style={{ lineHeight: 2, paddingInlineStart: 20 }}>
              {VODAFONE_CASH_NUMBER && (
                <li>فودافون كاش: حوّل إلى <b dir="ltr">{VODAFONE_CASH_NUMBER}</b>{VODAFONE_CASH_OWNER && ` (${VODAFONE_CASH_OWNER})`}</li>
              )}
              {MEEZA_INFO && <li>ميزة: {MEEZA_INFO}</li>}
              <li>أدخل بيانات التحويل بالأسفل ليتم تأكيدها.</li>
            </ol>
            {!user ? (
              <button type="button" className="btn btn-primary" onClick={onLogin}>سجّل الدخول بـ Google للمساهمة</button>
            ) : (
              <form onSubmit={submit} className="customizer-grid">
                <div className="field-group"><label>وسيلة الدفع</label>
                  <select className="select" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                    {VODAFONE_CASH_NUMBER && <option value="vodafone_cash">فودافون كاش</option>}
                    {MEEZA_INFO && <option value="meeza">ميزة</option>}
                  </select></div>
                <div className="field-group"><label>المبلغ المحوَّل (جنيه)</label>
                  <input className="input" type="number" min="10" required value={form.amountEgp} onChange={(e) => setForm({ ...form, amountEgp: e.target.value })} /></div>
                <div className="field-group"><label>رقم هاتف المحوِّل</label>
                  <input className="input" required pattern="01[0125][0-9]{8}" value={form.senderPhone} onChange={(e) => setForm({ ...form, senderPhone: e.target.value })} /></div>
                <div className="field-group"><label>رقم العملية</label>
                  <input className="input" required value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} /></div>
                <div className="field-group" style={{ gridColumn: '1 / -1' }}><label>الاسم الذي يظهر علناً (اختياري — اتركه فارغاً للبقاء مجهولاً)</label>
                  <input className="input" maxLength={40} value={form.publicName} onChange={(e) => setForm({ ...form, publicName: e.target.value })} /></div>
                <button type="submit" disabled={busy} className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>إرسال بيانات التحويل</button>
              </form>
            )}
          </>
        )}
      </div>

      {admin && (
        <div className="studio-customizer-panel">
          <h3 style={{ margin: 0 }}>لوحة المالك: طلبات بانتظار التأكيد ({pending.length})</h3>
          {pending.map((p) => (
            <div key={p.id} className="review-item">
              <div className="review-head"><strong>{p.email}</strong><span>{p.amountEgp} ج.م • {p.method}</span></div>
              <p>هاتف {p.senderPhone} • عملية {p.transactionId}</p>
              <div className="obs-url-row">
                <input className="input" type="number" min="0" step="0.01" placeholder="القيمة بالدولار بعد التأكد من وصول المبلغ"
                  value={usdInputs[p.id] || ''} onChange={(e) => setUsdInputs({ ...usdInputs, [p.id]: e.target.value })} />
                <button className="btn btn-primary" onClick={async () => {
                  try { await confirmPledge(p, usdInputs[p.id], user.email); toast('تم التأكيد'); load(); } catch (err) { toast(err.message); }
                }}>تأكيد الوصول</button>
                <button className="btn btn-ghost" onClick={async () => { await rejectPledge(p, user.email); load(); }}>رفض</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
