import React, { useState, useEffect, useMemo } from 'react';
import {
  ALERTS_CATALOG,
  ALERT_CATEGORIES,
  ACCESS_TIERS,
  TEXTURE_ENGINES,
  AVATAR_FRAMES,
  CHOREOGRAPHY_MODES,
} from './data/alertsCatalog';
import {
  subscribeToEcosystemAuth,
  signInWithGoogleAccount,
  signOutEcosystem,
  checkPackUnlockStatus,
  getSubscriptionsPortalUrl,
  PLAN_BADGES,
  RANK_LEVELS,
} from './services/ecosystemAuth';
import { soundEngine, SOUND_PRESETS_LIST } from './services/soundEngine';
import {
  broadcastObsAlert,
  listenObsBroadcast,
  getObsBrowserSourceUrl,
  downloadStandaloneAlertHTML,
} from './services/obsBundleExporter';
import AvatarRing from './components/AvatarRing';
import FundingView from './components/FundingView';
import AlertOverlay, {
  GlobalSvgFilters,
  PackSvgEmblem,
  AlertStageRenderer,
  TransparentFramedAvatar,
} from './components/AlertOverlay';
import { useAlertQueue } from './hooks/useAlertQueue';
import { normalizeStreamEvent } from './core/queue/EventNormalizer';
import './App.css';

// Sidebar Category shortcuts matching the user's mockup + full-screen & widgets
const SIDEBAR_CATEGORIES = [
  { id: 'follow', label: 'متابعين جدد', dotColor: '#2DD4BF' },
  { id: 'subscribe', label: 'اشتراكات', dotColor: '#B9834A' },
  { id: 'donation', label: 'هبات وتبرعات', dotColor: '#A79E92' },
  { id: 'raid', label: 'غزو وتكبيس', dotColor: '#EF4444' },
  { id: 'fullscreen', label: 'ملء الشاشة Full-Screen', dotColor: '#EC4899' },
  { id: 'scenes', label: 'شاشات البث (بدء/استراحة/نهاية)', dotColor: '#2DD4BF' },
  { id: 'widgets', label: 'أدوات البث HUD', dotColor: '#38BDF8' },
];

export default function App() {
  // -------------------------------------------------------------------------
  // 1. CHECK FOR OBS STUDIO BROWSER SOURCE WIDGET MODE (?obs=1)
  // -------------------------------------------------------------------------
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const isObsMode = urlParams.get('obs') === '1';
  const obsInitialPackId = urlParams.get('pack') || 'shadow-monarch-twin-eyes';

  // -------------------------------------------------------------------------
  // 2. STATE: AUTH, NAVIGATION, FILTERS, FAVORITES, LIBRARY, CUSTOMIZER
  // -------------------------------------------------------------------------
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('explore'); // 'explore' | 'details' | 'library' | 'favorites' | 'login'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTierFilter, setSelectedTierFilter] = useState('all');
  const [selectedTextureFilter, setSelectedTextureFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'name'

  // Currently inspected pack in View 2 (Pack Details & Live Studio)
  const [selectedPackId, setSelectedPackId] = useState('shadow-monarch-twin-eyes');
  const [detailsTab, setDetailsTab] = useState('customizer'); // 'customizer' | 'specs' | 'reviews'

  // Live Customizer overrides for testing & OBS export
  const [customOverrides, setCustomOverrides] = useState({
    username: '',
    amount: '',
    subtext: '',
    message: '',
    soundPreset: '',
    avatarFrame: '',
    choreography: '',
  });

  // Saved Favorites & Owned/Unlocked Store Packs & Active OBS toggles (persisted in localStorage)
  const [favoriteIds, setFavoriteIds] = useState(() => {
    try {
      const saved = localStorage.getItem('mnalerts_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const [ownedPackIds, setOwnedPackIds] = useState(() => {
    try {
      const saved = localStorage.getItem('mnalerts_owned_packs');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const [obsEnabledMap, setObsEnabledMap] = useState(() => {
    try {
      const saved = localStorage.getItem('mnalerts_obs_enabled');
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  // Live Overlay Trigger State (fires over the screen or inside ?obs=1)
  const [liveTriggeredAlert, setLiveTriggeredAlert] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Live Priority Alert Queue & Preemption Engine (Milestone 1)
  const {
    activeAlert: queueActiveAlert,
    queueSize,
    isPaused,
    enqueue: queueEnqueue,
    skip: queueSkip,
    clear: queueClear,
    pause: queuePause,
    resume: queueResume,
    completeActive,
  } = useAlertQueue({ maxCapacity: 100, dedupWindowMs: 5000 });

  // Sync active alert from priority queue to live overlay renderer
  useEffect(() => {
    if (queueActiveAlert) {
      const targetPack =
        queueActiveAlert.pack ||
        ALERTS_CATALOG.find((p) => p.id === queueActiveAlert.packId) ||
        ALERTS_CATALOG[0];
      const customData = queueActiveAlert.customOverrides || queueActiveAlert.customData || {};
      setLiveTriggeredAlert({
        pack: targetPack,
        customData,
        ts: Date.now(),
      });
      broadcastObsAlert(targetPack, customData);
    } else {
      setLiveTriggeredAlert(null);
    }
  }, [queueActiveAlert]);

  // -------------------------------------------------------------------------
  // 3. EFFECTS: AUTH SUBSCRIPTION, LOCALSTORAGE SYNC, OBS BROADCAST LISTENER
  // -------------------------------------------------------------------------
  useEffect(() => {
    const unsub = subscribeToEcosystemAuth((u) => {
      setUser(u);
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('mnalerts_favorites', JSON.stringify(favoriteIds));
    } catch (_) {}
  }, [favoriteIds]);

  useEffect(() => {
    try {
      localStorage.setItem('mnalerts_owned_packs', JSON.stringify(ownedPackIds));
    } catch (_) {}
  }, [ownedPackIds]);

  useEffect(() => {
    try {
      localStorage.setItem('mnalerts_obs_enabled', JSON.stringify(obsEnabledMap));
    } catch (_) {}
  }, [obsEnabledMap]);

  // Listen for remote OBS broadcasts when in ?obs=1 mode (or across tabs)
  useEffect(() => {
    if (isObsMode) {
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';

      // Trigger initial pack if passed via URL
      const initialPack =
        ALERTS_CATALOG.find((p) => p.id === obsInitialPackId) || ALERTS_CATALOG[0];
      const urlOverrides = {
        username: urlParams.get('username') || undefined,
        amount: urlParams.get('amount') || undefined,
        subtext: urlParams.get('subtext') || undefined,
        message: urlParams.get('message') || undefined,
        soundPreset: urlParams.get('sound') || undefined,
        avatarFrame: urlParams.get('frame') || undefined,
        choreography: urlParams.get('choreo') || undefined,
      };
      setTimeout(() => {
        setLiveTriggeredAlert({
          pack: initialPack,
          customData: urlOverrides,
          ts: Date.now(),
        });
      }, 400);
    }

    const unsubBroadcast = listenObsBroadcast((payload) => {
      const targetPack =
        ALERTS_CATALOG.find((p) => p.id === payload.packId) ||
        payload.pack ||
        ALERTS_CATALOG[0];
      setLiveTriggeredAlert({
        pack: targetPack,
        customData: payload.customOverrides || {},
        ts: Date.now(),
      });
    });

    // Expose window.MNAlerts global API for Streamlabs / OBS browser scripts
    window.MNAlerts = {
      trigger: (packIdOrData, customData = {}) => {
        let pack = ALERTS_CATALOG[0];
        let overrides = {};
        let priority = 2;

        if (typeof packIdOrData === 'string') {
          pack = ALERTS_CATALOG.find((p) => p.id === packIdOrData) || ALERTS_CATALOG[0];
          overrides = customData;
          if (customData.priority !== undefined) priority = customData.priority;
        } else if (typeof packIdOrData === 'object' && packIdOrData !== null) {
          pack = packIdOrData.pack || (packIdOrData.packId ? ALERTS_CATALOG.find((p) => p.id === packIdOrData.packId) : null) || ALERTS_CATALOG[0];
          overrides = packIdOrData.customOverrides || packIdOrData;
          if (packIdOrData.priority !== undefined) priority = packIdOrData.priority;
        }

        const streamEvent = normalizeStreamEvent({
          id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: pack.category || 'donation',
          priority,
          sender: { name: overrides.username || pack.defaultSupporter },
          payload: {
            amount: overrides.amount ? parseFloat(overrides.amount) : undefined,
            message: overrides.message,
          },
          customOverrides: overrides,
          pack,
        });

        queueEnqueue(streamEvent);
      },
      skip: () => queueSkip(),
      clear: () => queueClear(),
      pause: () => queuePause(),
      resume: () => queueResume(),
      setVolume: (v) => soundEngine.setVolume(v),
      setSound: (preset, url) => soundEngine.setCustomSound(preset, url),
    };

    return () => unsubBroadcast();
  }, [isObsMode, obsInitialPackId, urlParams]);

  // -------------------------------------------------------------------------
  // 4. HELPERS & HANDLERS
  // -------------------------------------------------------------------------
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3400);
  };

  const selectedPack = useMemo(
    () => ALERTS_CATALOG.find((p) => p.id === selectedPackId) || ALERTS_CATALOG[0],
    [selectedPackId]
  );

  // Reset customizer placeholders when switching selected pack
  const openPackDetails = (pack) => {
    setSelectedPackId(pack.id);
    setCustomOverrides({
      username: pack.defaultSupporter || 'اسم الداعم',
      amount: pack.defaultAmount || '500 EGP',
      subtext: pack.defaultSubtext || pack.headline,
      message: pack.defaultMessage || '',
      soundPreset: pack.soundPreset || 'shadow_eyes',
      avatarFrame: pack.avatarFrameId || 'royal-crown',
      choreography: pack.choreographyId || 'shadow-eyes-blast',
    });
    setDetailsTab('customizer');
    setActiveView('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerLiveAlertTest = (pack, overrides = {}) => {
    const mergedOverrides = {
      username: overrides.username || pack.defaultSupporter || 'اسم الداعم',
      amount: overrides.amount || pack.defaultAmount || '500 EGP',
      subtext: overrides.subtext || pack.defaultSubtext || pack.headline,
      message: overrides.message !== undefined && overrides.message !== '' ? overrides.message : pack.defaultMessage,
      soundPreset: overrides.soundPreset || pack.soundPreset || 'shadow_eyes',
      avatarFrame: overrides.avatarFrame || pack.avatarFrameId || 'royal-crown',
      choreography: overrides.choreography || pack.choreographyId || 'shadow-eyes-blast',
    };
    const streamEvent = normalizeStreamEvent({
      id: `studio_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: pack.category || 'donation',
      priority: overrides.priority !== undefined ? overrides.priority : 2,
      sender: { name: mergedOverrides.username },
      payload: {
        amount: mergedOverrides.amount ? parseFloat(mergedOverrides.amount) : undefined,
        message: mergedOverrides.message,
      },
      customOverrides: mergedOverrides,
      pack,
    });
    queueEnqueue(streamEvent);
  };

  const fireSimulatedEvent = (priority) => {
    let evt;
    if (priority === 0) {
      const p = ALERTS_CATALOG.find((x) => x.id === 'shadow-monarch-twin-eyes') || ALERTS_CATALOG[0];
      evt = normalizeStreamEvent({
        id: `sim_p0_${Date.now()}`,
        type: 'donation',
        priority: 0,
        platform: 'test',
        tier: 'ultra',
        sender: { name: '🚨 تنبيه طوارئ البث (P0)' },
        payload: { amount: 10000, currency: 'EGP', message: 'قطع فوري لأي تنبيه نشط — تنبيه طوارئ قاطع!' },
        customOverrides: {
          username: '🚨 تنبيه طوارئ البث (P0)',
          amount: '10,000 EGP',
          subtext: 'انقطاع طارئ برمجياً',
          message: 'قطع فوري لأي تنبيه نشط — تنبيه طوارئ قاطع!',
        },
        pack: p,
      });
      showToast('🚨 تم إطلاق تنبيه قاطع ذو أولوية 0 (قطع فوري)');
    } else if (priority === 1) {
      const p = ALERTS_CATALOG.find((x) => x.id === 'missile-fire-barrage-strike') || ALERTS_CATALOG[1];
      evt = normalizeStreamEvent({
        id: `sim_p1_${Date.now()}`,
        type: 'raid',
        priority: 1,
        platform: 'twitch',
        tier: 'pro',
        sender: { name: 'قناة نور الألعاب (P1)' },
        payload: { viewers: 850, message: 'غزو القناة بـ 850 محارب!' },
        customOverrides: {
          username: 'قناة نور الألعاب (P1)',
          amount: '850 مشاهد',
          subtext: 'غزو تكبيس ضخم',
          message: 'غزو القناة بـ 850 محارب!',
        },
        pack: p,
      });
      showToast('⚔️ تم إدراج غزو ذو أولوية 1 في الطابور');
    } else if (priority === 2) {
      const p = ALERTS_CATALOG.find((x) => x.id === 'royal-crown-sovereignty') || ALERTS_CATALOG[2];
      evt = normalizeStreamEvent({
        id: `sim_p2_${Date.now()}`,
        type: 'donation',
        priority: 2,
        platform: 'kick',
        tier: 'plus',
        sender: { name: 'أحمد سلطان (P2)' },
        payload: { amount: 500, currency: 'USD', message: 'أفضل بث مباشر ومحتوى سينمائي!' },
        customOverrides: {
          username: 'أحمد سلطان (P2)',
          amount: '$500 USD',
          subtext: 'دعم المركز الأول',
          message: 'أفضل بث مباشر ومحتوى سينمائي!',
        },
        pack: p,
      });
      showToast('💰 تم إدراج دعم ذو أولوية 2 في الطابور');
    } else if (priority === 3) {
      const p = ALERTS_CATALOG.find((x) => x.id === 'cyber-matrix-rain') || ALERTS_CATALOG[3];
      evt = normalizeStreamEvent({
        id: `sim_p3_${Date.now()}`,
        type: 'subscribe',
        priority: 3,
        platform: 'youtube',
        tier: 'plus',
        sender: { name: 'سارة خالد (P3)' },
        payload: { months: 6, tierName: 'عضوية النخبة' },
        customOverrides: {
          username: 'سارة خالد (P3)',
          amount: '6 أشهر',
          subtext: 'اشتراك جديد بالبث',
          message: 'سعيد بالانضمام لعضوية النخبة!',
        },
        pack: p,
      });
      showToast('⭐ تم إدراج اشتراك ذو أولوية 3 في الطابور');
    } else {
      const p = ALERTS_CATALOG.find((x) => x.id === 'neon-retro-synth') || ALERTS_CATALOG[4];
      evt = normalizeStreamEvent({
        id: `sim_p4_${Date.now()}`,
        type: 'follow',
        priority: 4,
        platform: 'twitch',
        tier: 'free',
        sender: { name: 'متابع جديد (P4)' },
        payload: { message: 'أهلاً بك في البث!' },
        customOverrides: {
          username: 'متابع جديد (P4)',
          amount: 'متابعة جديدة',
          subtext: 'متابع جديد انضم للبث',
        },
        pack: p,
      });
      showToast('👤 تم إدراج متابعة ذات أولوية 4 في الطابور');
    }
    queueEnqueue(evt);
  };

  const fireStormTest = () => {
    showToast('⚡ إطلاق عاصفة 10 تنبيهات متتالية لاختبار ترتيب الأولويات والفرز الفوري');
    for (let i = 0; i < 9; i++) {
      const p = ALERTS_CATALOG[i % ALERTS_CATALOG.length];
      const priority = i % 2 === 0 ? 4 : 3;
      queueEnqueue(
        normalizeStreamEvent({
          id: `storm_${Date.now()}_${i}`,
          type: priority === 4 ? 'follow' : 'subscribe',
          priority,
          sender: { name: `عاصفة #${i + 1} (P${priority})` },
          payload: { amount: (i + 1) * 10, message: `تنبيه عاصفة تجريبية #${i + 1}` },
          customOverrides: {
            username: `عاصفة #${i + 1} (P${priority})`,
            amount: `${(i + 1) * 10} EGP`,
            subtext: `عاصفة الأولويات`,
          },
          pack: p,
        })
      );
    }
    // End with a P0 Critical Interruption that preempts!
    setTimeout(() => {
      fireSimulatedEvent(0);
    }, 400);
  };

  const toggleFavorite = (e, packId) => {
    if (e) e.stopPropagation();
    setFavoriteIds((prev) => {
      const exists = prev.includes(packId);
      const next = exists ? prev.filter((id) => id !== packId) : [...prev, packId];
      showToast(exists ? 'تمت إزالة الإشعار من المفضلة' : 'تمت إضافة الإشعار إلى المفضلة ★');
      return next;
    });
  };

  const handleUnlockOrAddToObs = (e, pack) => {
    if (e) e.stopPropagation();
    const status = checkPackUnlockStatus(pack, user, ownedPackIds);

    if (!status.unlocked) {
      // Guide user to unlock via tier or quick store unlock
      if (pack.accessTier === 'store') {
        // Allow instant purchase simulation or redirect to MN Subscriptions
        setOwnedPackIds((prev) => [...new Set([...prev, pack.id])]);
        setObsEnabledMap((prev) => ({ ...prev, [pack.id]: true }));
        soundEngine.playPreset('coins');
        showToast(`🎉 تم فتح "${pack.name}" وإضافته إلى مكتبتك و OBS!`);
        return;
      }
      showToast(`🔒 يتطلب هذا الإشعار: ${status.reason} — يمكنك الترقية أو تبديل الحساب للتجربة`);
      setActiveView('login');
      return;
    }

    // Add to library & enable in OBS + copy OBS URL
    if (!ownedPackIds.includes(pack.id)) {
      setOwnedPackIds((prev) => [...prev, pack.id]);
    }
    setObsEnabledMap((prev) => ({ ...prev, [pack.id]: true }));
    const obsUrl = getObsBrowserSourceUrl(pack.id, customOverrides);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(obsUrl).catch(() => {});
    }
    soundEngine.playPreset(pack.soundPreset || 'chime');
    showToast(`✅ تم تفعيل "${pack.name}" في OBS ونسخ رابط Browser Source!`);
  };

  const copyObsUrlForPack = (pack, overrides = {}) => {
    const url = getObsBrowserSourceUrl(pack.id, overrides);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    showToast('🔗 تم نسخ رابط OBS Browser Source بنجاح! الصقه في OBS Studio (العرض 1920×1080)');
  };

  // Filtered & sorted catalog for Explore view
  const filteredPacks = useMemo(() => {
    return ALERTS_CATALOG.filter((pack) => {
      if (selectedCategory !== 'all' && pack.category !== selectedCategory) return false;
      if (selectedTierFilter !== 'all' && pack.accessTier !== selectedTierFilter) return false;
      if (selectedTextureFilter !== 'all' && pack.textureEngine !== selectedTextureFilter) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.trim().toLowerCase();
        const matchAr = pack.name.toLowerCase().includes(q);
        const matchEn = (pack.nameEn || '').toLowerCase().includes(q);
        const matchDesc = (pack.description || '').toLowerCase().includes(q);
        const matchDesigner = (pack.designer || '').toLowerCase().includes(q);
        if (!matchAr && !matchEn && !matchDesc && !matchDesigner) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ar');
      return 0;
    });
  }, [selectedCategory, selectedTierFilter, selectedTextureFilter, searchQuery, sortBy]);

  // Library & Favorites lists
  const libraryPacks = useMemo(() => {
    return ALERTS_CATALOG.filter(
      (p) => ownedPackIds.includes(p.id) || checkPackUnlockStatus(p, user, ownedPackIds).unlocked
    );
  }, [ownedPackIds, user]);

  const favoritePacks = useMemo(() => {
    return ALERTS_CATALOG.filter((p) => favoriteIds.includes(p.id));
  }, [favoriteIds]);

  const similarPacks = useMemo(() => {
    return ALERTS_CATALOG.filter(
      (p) =>
        p.id !== selectedPack.id &&
        (p.category === selectedPack.category || p.textureEngine === selectedPack.textureEngine)
    ).slice(0, 3);
  }, [selectedPack]);

  // -------------------------------------------------------------------------
  // 5. DEDICATED OBS BROWSER SOURCE TRANSPARENT VIEW (?obs=1)
  // -------------------------------------------------------------------------
  if (isObsMode) {
    return (
      <div className="mn-obs-transparent-root">
        <GlobalSvgFilters />
        <AlertOverlay
          activeAlert={liveTriggeredAlert}
          isObsWidget={true}
          onComplete={() => setLiveTriggeredAlert(null)}
        />
      </div>
    );
  }

  const userPlanBadge = PLAN_BADGES[user?.plan || 'free'] || PLAN_BADGES.free;

  // -------------------------------------------------------------------------
  // 6. MAIN MNALERTS STUDIO & MARKETPLACE INTERFACE
  // -------------------------------------------------------------------------
  return (
    <div className="mnalerts-root" dir="rtl" lang="ar">
      {/* Shared SVG Procedural Filters (Blood Drip, Shattered Glass, Water Caustics, Silk Stitch) */}
      <GlobalSvgFilters />

      {/* Live Overlay Stage for Full-Screen & Pop-over Alert Previews */}
      <AlertOverlay
        activeAlert={liveTriggeredAlert}
        isObsWidget={false}
        onComplete={() => {
          setLiveTriggeredAlert(null);
          completeActive();
        }}
      />

      {/* Toast Notification Pill */}
      {toastMessage && (
        <div className="mn-toast-banner" role="status">
          <span className="mn-toast-dot"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="app-shell">
        {/* =================================================================
            RIGHT-HAND RTL GLASS SIDEBAR (272px — Exact Match to User Mockup)
            ================================================================= */}
        <aside className="sidebar">
          {/* Brand Logo */}
          <div
            className="brand"
            onClick={() => {
              setActiveView('explore');
              setSelectedCategory('all');
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="brand-dot"></div>
            <div className="brand-name">mnalerts</div>
            <span className="brand-tag">OBS + STREAMLABS</span>
          </div>

          {/* Quick Search */}
          <div className="side-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#A79E92" strokeWidth="1.8" />
              <path d="M20 20L16.5 16.5" stroke="#A79E92" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="بحث سريع عن إشعار، دم، زجاج، ماء..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeView !== 'explore') setActiveView('explore');
              }}
            />
          </div>

          {/* Main Navigation */}
          <div className="nav-group">
            <div className="nav-label">القائمة</div>
            <button
              type="button"
              className={`nav-item ${activeView === 'explore' ? 'active' : ''}`}
              onClick={() => setActiveView('explore')}
            >
              <span>استكشاف</span>
              <small>{ALERTS_CATALOG.length}</small>
            </button>
            <button
              type="button"
              className={`nav-item ${activeView === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveView('favorites')}
            >
              <span>المفضلة</span>
              <small>{favoriteIds.length}</small>
            </button>
            <button
              type="button"
              className={`nav-item ${activeView === 'library' ? 'active' : ''}`}
              onClick={() => setActiveView('library')}
            >
              <span>مكتبتي وربط OBS</span>
              <small>{libraryPacks.length}</small>
            </button>
            <button
              type="button"
              className={`nav-item ${activeView === 'funding' ? 'active' : ''}`}
              onClick={() => setActiveView('funding')}
            >
              <span>ادعم تحديث Quant</span>
              <small style={{ color: '#B9834A' }}>$</small>
            </button>
            <button
              type="button"
              className={`nav-item ${activeView === 'details' ? 'active' : ''}`}
              onClick={() => setActiveView('details')}
            >
              <span>الستوديو والتخصيص الحي</span>
              <small style={{ color: '#2DD4BF' }}>Studio</small>
            </button>
          </div>

          {/* Categories Navigation */}
          <div className="nav-group">
            <div className="nav-label">التصنيفات</div>
            <button
              type="button"
              className={`nav-item ${activeView === 'explore' && selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => {
                setSelectedCategory('all');
                setActiveView('explore');
              }}
            >
              <span>جميع الإشعارات</span>
              <small>{ALERTS_CATALOG.length}</small>
            </button>
            {SIDEBAR_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`nav-item ${activeView === 'explore' && selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setActiveView('explore');
                }}
              >
                <span>{cat.label}</span>
                <span className="dot" style={{ background: cat.dotColor }}></span>
              </button>
            ))}
          </div>

          {/* Bottom User & Subscriptions Footer */}
          <div className="sidebar-foot">
            {/* Loyalty & Rank Mini-Status */}
            {user && (
              <div className="loyalty-mini-card">
                <div className="loyalty-mini-row">
                  <span className="loyalty-rank-icon">{user.rankIcon || '⚡'}</span>
                  <div className="loyalty-mini-info">
                    <div className="loyalty-rank-title">{user.rankTitle || 'نجم صاعد'}</div>
                    <div className="loyalty-tenure-sub">
                      ولاء {user.loyaltyMonths || 1} شهر • المستوى {user.rankLevel || 1}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <a
              href={getSubscriptionsPortalUrl()}
              target="_blank"
              rel="noreferrer"
              className="sub-btn"
              style={{ textDecoration: 'none' }}
            >
              <span>الاشتراكات والترقية</span>
              <span style={{ color: 'var(--primary)', fontWeight: 800 }}>MN ↗</span>
            </a>

            <div
              className="user-row"
              onClick={() => setActiveView('login')}
              title="انقر لإدارة الحساب أو تبديل رتبة التجربة"
            >
              <AvatarRing
                tier={user?.plan || 'free'}
                size={40}
                photoURL={user?.photoURL}
                name={user?.displayName || 'زائر'}
              />
              <div className="user-meta">
                <div className="name">{user ? user.displayName : 'تسجيل الدخول'}</div>
                <div className="role" style={{ color: userPlanBadge.color }}>
                  {user ? `اشتراك ${userPlanBadge.label}` : 'اربط حساب MN الخاص بك'}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* =================================================================
            MAIN CONTENT AREA (Views 1..4)
            ================================================================= */}
        <main className="main">
          {/* =================================================================
              INTERACTIVE TEST EVENT SIMULATOR & QUEUE CONTROLS (MILESTONE 1)
              ================================================================= */}
          <div className="mn-queue-simulator-bar">
            <div className="simulator-info">
              <span className="simulator-tag">محاكي التنبيهات والأولويات:</span>
              <span className={`simulator-badge ${isPaused ? 'paused' : ''}`}>
                <span>{isPaused ? '⏸️ متوقف' : '▶️ نشط'}</span>
                <span>•</span>
                <span>طابور الانتظار: {queueSize}</span>
              </span>
            </div>
            <div className="simulator-actions">
              <button
                type="button"
                className="sim-btn sim-btn-p0"
                onClick={() => fireSimulatedEvent(0)}
                title="قطع فوري لأي تنبيه نشط"
              >
                🚨 P0 طوارئ (قطع فوري)
              </button>
              <button
                type="button"
                className="sim-btn sim-btn-p1"
                onClick={() => fireSimulatedEvent(1)}
              >
                ⚔️ P1 غزو
              </button>
              <button
                type="button"
                className="sim-btn sim-btn-p2"
                onClick={() => fireSimulatedEvent(2)}
              >
                💰 P2 هبة
              </button>
              <button
                type="button"
                className="sim-btn sim-btn-p3"
                onClick={() => fireSimulatedEvent(3)}
              >
                ⭐ P3 اشتراك
              </button>
              <button
                type="button"
                className="sim-btn sim-btn-p4"
                onClick={() => fireSimulatedEvent(4)}
              >
                👤 P4 متابع
              </button>
              <button
                type="button"
                className="sim-btn sim-btn-ctrl"
                onClick={() => {
                  queueSkip();
                  showToast('⏭️ تم تخطي الإشعار النشط');
                }}
              >
                ⏭️ تخطي
              </button>
              <button
                type="button"
                className="sim-btn sim-btn-ctrl"
                onClick={() => {
                  if (isPaused) {
                    queueResume();
                    showToast('▶️ تم استئناف الطابور');
                  } else {
                    queuePause();
                    showToast('⏸️ تم إيقاف الطابور مؤقتاً');
                  }
                }}
              >
                {isPaused ? '▶️ استئناف' : '⏸️ إيقاف'}
              </button>
              <button
                type="button"
                className="sim-btn sim-btn-ctrl"
                onClick={() => {
                  queueClear();
                  showToast('🗑️ تم مسح طابور التنبيهات');
                }}
              >
                🗑️ مسح
              </button>
              <button
                type="button"
                className="sim-btn sim-btn-ctrl"
                onClick={fireStormTest}
                style={{ color: '#FBBF24', borderColor: 'rgba(251, 191, 36, 0.4)' }}
              >
                ⚡ عاصفة 10x
              </button>
            </div>
          </div>
          {/* ---------------------------------------------------------------
              VIEW 1: EXPLORE MARKETPLACE (استكشاف الإشعارات)
              --------------------------------------------------------------- */}
          {activeView === 'explore' && (
            <section className="view-section">
              <div className="topbar">
                <div className="page-title">
                  <h1>استكشاف الإشعارات السينمائية والإطارات الملكية (42 حزمة)</h1>
                  <p>
                    إخراج متعدد المراحل (خفوت الإضاءة ← ظهور نورين في الظلام ← انفجار صواريخ ونار بالفيديو والصوت الحقيقي + إطارات المركز الأول #1 المفرغة الخلفية)
                  </p>
                </div>
                <div className="topbar-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => triggerLiveAlertTest(selectedPack, customOverrides)}
                  >
                    💥 إطلاق تجربة ملء الشاشة بالصوت الآن
                  </button>
                  <select
                    className="select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="فرز حسب"
                  >
                    <option value="default">الترتيب الافتراضي (الأقوى أولاً)</option>
                    <option value="name">الاسم (أ - ي)</option>
                  </select>
                </div>
              </div>

              {/* Flagship Quick-Trigger Showcase Bar */}
              <div className="mn-flagship-showcase-bar">
                <div className="flagship-bar-head">
                  <div>
                    <span className="flagship-kicker">🔥 جرب الإخراج السينمائي الفوري بالصوت الحقيقي:</span>
                    <h3>انقر على أي مشهد لإطلاقه مباشرة فوق الشاشة مع الأصوات والفيديوهات المدمجة</h3>
                  </div>
                </div>
                <div className="flagship-quick-btns">
                  <button
                    type="button"
                    className="flagship-fire-pill"
                    onClick={() => {
                      const p = ALERTS_CATALOG.find((x) => x.id === 'shadow-monarch-twin-eyes') || ALERTS_CATALOG[0];
                      triggerLiveAlertTest(p);
                    }}
                  >
                    <span>👁️</span>
                    <span>خفوت الإضاءة + نورين في الظلام + انفجار</span>
                  </button>
                  <button
                    type="button"
                    className="flagship-fire-pill"
                    onClick={() => {
                      const p = ALERTS_CATALOG.find((x) => x.id === 'missile-fire-barrage-strike') || ALERTS_CATALOG[1];
                      triggerLiveAlertTest(p);
                    }}
                  >
                    <span>🚀</span>
                    <span>قصف صواريخ ونيران على الشاشة</span>
                  </button>
                  <button
                    type="button"
                    className="flagship-fire-pill"
                    onClick={() => {
                      const p = ALERTS_CATALOG.find((x) => x.id === 'golden-lion-king-roar') || ALERTS_CATALOG[3];
                      triggerLiveAlertTest(p);
                    }}
                  >
                    <span>🦁</span>
                    <span>زئير الأسد وإطار المركز الأول #1</span>
                  </button>
                  <button
                    type="button"
                    className="flagship-fire-pill"
                    onClick={() => {
                      const p = ALERTS_CATALOG.find((x) => x.id === 'store-crimson-katana-anime') || ALERTS_CATALOG[2];
                      triggerLiveAlertTest(p);
                    }}
                  >
                    <span>⚔️</span>
                    <span>عينان قرمزيتان وشطر الكاتانا</span>
                  </button>
                  <button
                    type="button"
                    className="flagship-fire-pill"
                    onClick={() => {
                      const p = ALERTS_CATALOG.find((x) => x.id === 'nuclear-megaton-detonation') || ALERTS_CATALOG[4];
                      triggerLiveAlertTest(p);
                    }}
                  >
                    <span>☢️</span>
                    <span>القنبلة النووية وموجة الصدمة</span>
                  </button>
                </div>
              </div>

              {/* True Transparent RGBA Royal Frames Showcase (#1 Top Donor & #1 Subscriber) */}
              <div className="mn-frames-showcase-strip">
                <div className="frames-strip-info">
                  <span className="frames-strip-badge">👑 إطارات المرتبة الأولى #1 (شفافة بالكامل RGBA بدون خلفية)</span>
                  <p>تُركّب تلقائياً حول صورة أكثر شخص يدفع وأكثر شخص اشترك في البث — انقر لمعاينتها وتخصيصها:</p>
                </div>
                <div className="frames-strip-items">
                  {AVATAR_FRAMES.filter((f) => f.id !== 'none').map((frame) => (
                    <div
                      key={frame.id}
                      className="frame-showcase-chip"
                      onClick={() => {
                        setCustomOverrides((prev) => ({ ...prev, avatarFrame: frame.id }));
                        setActiveView('details');
                        showToast(`👑 تم اختيار "${frame.nameAr}" في الاستوديو الحي!`);
                      }}
                    >
                      <TransparentFramedAvatar
                        username={frame.rankLabel}
                        frameId={frame.id}
                        size={68}
                        rankBadgeText="#1"
                      />
                      <div className="frame-chip-text">
                        <strong>{frame.nameAr}</strong>
                        <span>{frame.rankLabel} • شفاف RGBA</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Filter Row */}
              <div className="chips">
                {ALERT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`chip ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Access Tier & Texture Engine Filter Bar */}
              <div className="sub-filters-bar">
                <div className="tier-chips-wrap">
                  <span className="filter-group-label">الرتبة والاشتراك:</span>
                  {ACCESS_TIERS.map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      className={`tier-pill-btn ${selectedTierFilter === tier.id ? 'active' : ''}`}
                      style={
                        selectedTierFilter === tier.id
                          ? { borderColor: tier.color, color: tier.color }
                          : undefined
                      }
                      onClick={() => setSelectedTierFilter(tier.id)}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>

                <div className="texture-chips-wrap">
                  <span className="filter-group-label">محرك المؤثرات:</span>
                  <button
                    type="button"
                    className={`tier-pill-btn ${selectedTextureFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedTextureFilter('all')}
                  >
                    الكل
                  </button>
                  {Object.values(TEXTURE_ENGINES).map((tx) => (
                    <button
                      key={tx.id}
                      type="button"
                      className={`tier-pill-btn ${selectedTextureFilter === tx.id ? 'active' : ''}`}
                      onClick={() => setSelectedTextureFilter(tx.id)}
                    >
                      {tx.nameAr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid">
                {filteredPacks.map((pack) => {
                  const unlockStatus = checkPackUnlockStatus(pack, user, ownedPackIds);
                  const isFav = favoriteIds.includes(pack.id);
                  const txInfo = TEXTURE_ENGINES[pack.textureEngine] || TEXTURE_ENGINES['shadow-eyes'];

                  return (
                    <article
                      key={pack.id}
                      className={`card texture-card-${pack.textureEngine}`}
                      onClick={() => openPackDetails(pack)}
                    >
                      <div
                        className="card-preview"
                        style={{
                          '--card-accent': pack.accentColor,
                          '--card-glow': pack.glowColor,
                        }}
                      >
                        {/* Cinematic Boss Art Backdrop inside Card Preview */}
                        {pack.heroArt && (
                          <img
                            src={pack.heroArt}
                            alt=""
                            className="card-preview-hero-art"
                            loading="lazy"
                          />
                        )}

                        {/* Top Badges: Category + Choreography */}
                        <span className="tag-badge">{pack.badgeLabel}</span>
                        <span className="choreo-mini-pill">{pack.choreographyBadgeAr}</span>
                        <button
                          type="button"
                          className={`fav-icon-btn ${isFav ? 'is-fav' : ''}`}
                          onClick={(e) => toggleFavorite(e, pack.id)}
                          title="إضافة للمفضلة"
                        >
                          {isFav ? '★' : '☆'}
                        </button>

                        {/* Live Animated Mini Alert Stage inside Card */}
                        <div className="preview-alert-mini">
                          <div className="mini-emblem-wrap">
                            <TransparentFramedAvatar
                              username={pack.defaultSupporter}
                              frameId={pack.avatarFrameId}
                              accentColor={pack.accentColor}
                              size={58}
                              rankBadgeText="#1"
                            />
                          </div>
                          <div className="mini-alert-copy">
                            <div className="mini-headline">{pack.headline}</div>
                            <div className={`mini-supporter ${txInfo.cssClass}`}>
                              {pack.defaultSupporter}
                              {pack.textureEngine === 'blood-splatter' && (
                                <span className="inline-blood-drips" aria-hidden="true">
                                  <i className="b-drip d1"></i>
                                  <i className="b-drip d3"></i>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Live Fire Button on Hover */}
                        <button
                          type="button"
                          className="card-live-fire-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerLiveAlertTest(pack);
                          }}
                        >
                          ▶ إطلاق بالصوت والفيديو الآن
                        </button>
                      </div>

                      <div className="card-body">
                        <div className="card-title">{pack.name}</div>
                        <div className="card-meta">
                          <span>بواسطة {pack.designer}</span>
                          <span className="texture-tag-mini">{txInfo.nameAr}</span>
                        </div>
                        <div className="card-meta" style={{ marginTop: 4 }}>
                          <span className="price" style={{ color: pack.accentColor }}>
                            {unlockStatus.unlocked ? '✓ متاح في حسابك' : pack.priceDisplay}
                          </span>
                          <span style={{ fontSize: '11px', color: '#fbbf24' }}>
                            👑 {pack.avatarFrameBadge}
                          </span>
                        </div>

                        <div className="card-actions">
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ flex: 1 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openPackDetails(pack);
                            }}
                          >
                            عرض وتخصيص
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            title={
                              unlockStatus.unlocked
                                ? 'إضافة مباشرة إلى OBS Studio'
                                : `فتح الإشعار (${unlockStatus.reason})`
                            }
                            onClick={(e) => handleUnlockOrAddToObs(e, pack)}
                          >
                            {unlockStatus.unlocked ? '+ OBS' : '🔒 فتح'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* ---------------------------------------------------------------
              VIEW 2: PACK DETAILS & LIVE CUSTOMIZER STUDIO (تفاصيل الإشعار)
              --------------------------------------------------------------- */}
          {activeView === 'details' && selectedPack && (
            <section className="view-section">
              <div className="topbar">
                <div className="crumb">
                  <span
                    style={{ cursor: 'pointer', color: 'var(--primary)' }}
                    onClick={() => setActiveView('explore')}
                  >
                    استكشاف
                  </span>{' '}
                  /{' '}
                  <span>
                    {ALERT_CATEGORIES.find((c) => c.id === selectedPack.category)?.label ||
                      'الإشعارات'}
                  </span>{' '}
                  / <b>{selectedPack.name}</b>
                </div>
                <div className="topbar-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setActiveView('explore')}
                  >
                    ← العودة للمتجر
                  </button>
                </div>
              </div>

              <div className="detail-layout">
                {/* Left Column: 16:9 Live Interactive Stage + Customizer/Specs/Reviews Tabs */}
                <div>
                  <div className="stage">
                    <div className="stage-live-preview-wrapper">
                      <AlertStageRenderer
                        pack={selectedPack}
                        customData={customOverrides}
                        isCardPreview={true}
                      />
                    </div>

                    <div className="stage-controls">
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => triggerLiveAlertTest(selectedPack, customOverrides)}
                        >
                          💥 تشغيل بملء الشاشة مع صوت الانفجار والفيديو
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() =>
                            soundEngine.playPreset(
                              customOverrides.soundPreset || selectedPack.soundPreset || 'shadow_eyes'
                            )
                          }
                        >
                          🔊 تجربة المؤثر الصوتي فقط
                        </button>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        1920 × 1080 • 60fps • شفاف لـ OBS (Screen Blend)
                      </span>
                    </div>
                  </div>

                  {/* Tabs: Live Customizer | Technical Specs & Code | Reviews */}
                  <div className="tabs">
                    <button
                      type="button"
                      className={`tab ${detailsTab === 'customizer' ? 'active' : ''}`}
                      onClick={() => setDetailsTab('customizer')}
                    >
                      تخصيص الإشعار والإطار الملكي (Live Studio)
                    </button>
                    <button
                      type="button"
                      className={`tab ${detailsTab === 'specs' ? 'active' : ''}`}
                      onClick={() => setDetailsTab('specs')}
                    >
                      التفاصيل التقنية والكود (HTML/VFX)
                    </button>
                    <button
                      type="button"
                      className={`tab ${detailsTab === 'reviews' ? 'active' : ''}`}
                      onClick={() => setDetailsTab('reviews')}
                    >
                      التقييمات
                    </button>
                  </div>

                  {/* TAB 1: LIVE CUSTOMIZER */}
                  {detailsTab === 'customizer' && (
                    <div className="studio-customizer-panel">
                      <div className="customizer-grid">
                        <div className="field-group">
                          <label>اسم الداعم / صاحب المركز الأول #1</label>
                          <input
                            type="text"
                            className="input"
                            value={customOverrides.username}
                            onChange={(e) =>
                              setCustomOverrides({ ...customOverrides, username: e.target.value })
                            }
                            placeholder="مثال: الملك_عبدالله"
                          />
                        </div>

                        <div className="field-group">
                          <label>قيمة الدعم / المستوى / الكوينات</label>
                          <input
                            type="text"
                            className="input"
                            value={customOverrides.amount}
                            onChange={(e) =>
                              setCustomOverrides({ ...customOverrides, amount: e.target.value })
                            }
                            placeholder="مثال: 1,000 EGP أو TOP #1"
                          />
                        </div>

                        <div className="field-group">
                          <label>👑 إطار صورة الداعم المفرغ الخلفية (RGBA Royal Frame)</label>
                          <select
                            className="select"
                            style={{ width: '100%' }}
                            value={customOverrides.avatarFrame || selectedPack.avatarFrameId || 'royal-crown'}
                            onChange={(e) =>
                              setCustomOverrides({ ...customOverrides, avatarFrame: e.target.value })
                            }
                          >
                            {AVATAR_FRAMES.map((fr) => (
                              <option key={fr.id} value={fr.id}>
                                {fr.nameAr}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="field-group">
                          <label>🎬 سيناريو الإخراج على الشاشة (Screen Choreography)</label>
                          <select
                            className="select"
                            style={{ width: '100%' }}
                            value={customOverrides.choreography || selectedPack.choreographyId || 'shadow-eyes-blast'}
                            onChange={(e) =>
                              setCustomOverrides({ ...customOverrides, choreography: e.target.value })
                            }
                          >
                            {Object.values(CHOREOGRAPHY_MODES).map((ch) => (
                              <option key={ch.id} value={ch.id}>
                                {ch.labelAr}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="field-group">
                          <label>النص الفرعي للإشعار</label>
                          <input
                            type="text"
                            className="input"
                            value={customOverrides.subtext}
                            onChange={(e) =>
                              setCustomOverrides({ ...customOverrides, subtext: e.target.value })
                            }
                          />
                        </div>

                        <div className="field-group">
                          <label>🔊 المؤثر الصوتي الحقيقي (Real Stereo MP3 + Sub-Bass)</label>
                          <select
                            className="select"
                            style={{ width: '100%' }}
                            value={customOverrides.soundPreset || selectedPack.soundPreset}
                            onChange={(e) => {
                              const preset = e.target.value;
                              setCustomOverrides({ ...customOverrides, soundPreset: preset });
                              soundEngine.playPreset(preset);
                            }}
                          >
                            {SOUND_PRESETS_LIST.map((sp) => (
                              <option key={sp.id} value={sp.id}>
                                {sp.labelAr}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                          <label>رسالة الداعم الصوتية / النصية (TTS Message)</label>
                          <input
                            type="text"
                            className="input"
                            value={customOverrides.message}
                            onChange={(e) =>
                              setCustomOverrides({ ...customOverrides, message: e.target.value })
                            }
                            placeholder="اكتب رسالة الداعم لتجربتها داخل الإشعار..."
                          />
                        </div>
                      </div>

                      {/* Direct OBS Browser Source URL Box */}
                      <div className="obs-url-box">
                        <div className="obs-url-header">
                          <span>🔗 رابط المتصفح المباشر لبرنامج OBS Studio / Streamlabs / TikTok Live:</span>
                          <span className="obs-ready-pill">جاهز للنسخ الفوري</span>
                        </div>
                        <div className="obs-url-row">
                          <input
                            type="text"
                            className="input obs-url-input"
                            readOnly
                            value={getObsBrowserSourceUrl(selectedPack.id, customOverrides)}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => copyObsUrlForPack(selectedPack, customOverrides)}
                          >
                            نسخ الرابط لـ OBS
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => triggerLiveAlertTest(selectedPack, customOverrides)}
                          >
                            إرسال تجربة لـ OBS
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: TECHNICAL SPECS & STANDALONE CODE */}
                  {detailsTab === 'specs' && (
                    <div>
                      <div className="specs">
                        <div className="spec">
                          <div className="k">الدقة</div>
                          <div className="v">{selectedPack.specs?.resolution || '1920 × 1080'}</div>
                        </div>
                        <div className="spec">
                          <div className="k">المدة</div>
                          <div className="v">{selectedPack.specs?.durationText || '5 ثوانٍ'}</div>
                        </div>
                        <div className="spec">
                          <div className="k">محرك الخامة</div>
                          <div className="v">
                            {TEXTURE_ENGINES[selectedPack.textureEngine]?.nameAr || 'Custom SVG'}
                          </div>
                        </div>
                        <div className="spec">
                          <div className="k">الصيغ والتقنية</div>
                          <div className="v">{selectedPack.specs?.formats || 'HTML5 / CSS3 / SVG'}</div>
                        </div>
                        <div className="spec">
                          <div className="k">التوافق</div>
                          <div className="v">{selectedPack.specs?.compatibility || 'OBS / Streamlabs'}</div>
                        </div>
                        <div className="spec">
                          <div className="k">المؤثر الصوتي</div>
                          <div className="v">مرفق ({selectedPack.soundPreset})</div>
                        </div>
                      </div>

                      <div className="code-preview-box">
                        <div className="code-preview-head">
                          <span>مقتطف محرك الـ SVG + CSS الخاص بهذا الإشعار:</span>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '5px 12px', fontSize: 12 }}
                            onClick={() => downloadStandaloneAlertHTML(selectedPack, customOverrides)}
                          >
                            ⬇ تنزيل ملف HTML الكامل
                          </button>
                        </div>
                        <pre className="code-block" dir="ltr">
{`<!-- mnalerts Bespoke Texture: ${selectedPack.textureEngine} -->
<div class="mn-textured-alert-card texture-${selectedPack.textureEngine}">
  <span class="mn-supporter-username ${TEXTURE_ENGINES[selectedPack.textureEngine]?.cssClass}">
    ${customOverrides.username || selectedPack.defaultSupporter}
  </span>
</div>
<script>
  // Trigger via OBS Browser Source or Streamlabs Webhook:
  window.MNAlerts.trigger({
    username: "${customOverrides.username || selectedPack.defaultSupporter}",
    amount: "${customOverrides.amount || selectedPack.defaultAmount}"
  });
</script>`}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: REVIEWS */}
                  {detailsTab === 'reviews' && (
                    <div className="reviews-list">
                      <div className="review-item">
                        <p>لا توجد تقييمات بعد. ستظهر هنا تقييمات المستخدمين الحقيقيين فقط.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Action Panel (Add to OBS, Download Files, Similar Alerts) */}
                <div className="panel">
                  <h2>{selectedPack.name}</h2>
                  <div className="by">
                    تصميم <b style={{ color: 'var(--text)' }}>{selectedPack.designer}</b>
                  </div>
                  <div className="price-lg">{selectedPack.priceDisplay}</div>
                  <p className="desc">{selectedPack.description}</p>

                  <div className="stack">
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '13px' }}
                      onClick={(e) => handleUnlockOrAddToObs(e, selectedPack)}
                    >
                      أضف مباشرة إلى OBS Studio
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ width: '100%', padding: '12px' }}
                      onClick={() => {
                        downloadStandaloneAlertHTML(selectedPack, customOverrides);
                        showToast(`📦 جاري تنزيل ملف mnalerts-${selectedPack.id}.html الجاهز لـ OBS!`);
                      }}
                    >
                      تنزيل الملفات (HTML/CSS/SVG Bundle)
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ width: '100%', padding: '11px' }}
                      onClick={(e) => toggleFavorite(e, selectedPack.id)}
                    >
                      {favoriteIds.includes(selectedPack.id)
                        ? '★ مضاف في المفضلة'
                        : '☆ أضف إلى المفضلة'}
                    </button>
                  </div>

                  {/* Similar Packs */}
                  <div className="mini-section">
                    <h4>إشعارات مشابهة</h4>
                    <div className="mini-list">
                      {similarPacks.map((sim) => (
                        <div
                          key={sim.id}
                          className="mini-item"
                          onClick={() => openPackDetails(sim)}
                        >
                          <div className="mini-thumb">
                            <PackSvgEmblem pack={sim} size={36} />
                          </div>
                          <div>
                            <div className="t">{sim.name}</div>
                            <div className="s">
                              {sim.badgeLabel} • {sim.priceDisplay}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ---------------------------------------------------------------
              VIEW 3: MY LIBRARY & FAVORITES (مكتبتي والمفضلة)
              --------------------------------------------------------------- */}
          {(activeView === 'library' || activeView === 'favorites') && (
            <section className="view-section">
              <div className="topbar">
                <div className="page-title">
                  <h1>
                    {activeView === 'favorites' ? 'إشعاراتي المفضلة' : 'مكتبتي والمفضلة'}
                  </h1>
                  <p>
                    الإشعارات الجاهزة للاستخدام والمرتبطة ببرنامج البث OBS Studio و Streamlabs
                  </p>
                </div>
                <div className="tabs" style={{ margin: 0, border: 0 }}>
                  <button
                    type="button"
                    className={`tab ${activeView === 'library' ? 'active' : ''}`}
                    onClick={() => setActiveView('library')}
                  >
                    مكتبتي ({libraryPacks.length})
                  </button>
                  <button
                    type="button"
                    className={`tab ${activeView === 'favorites' ? 'active' : ''}`}
                    onClick={() => setActiveView('favorites')}
                  >
                    المفضلة ({favoritePacks.length})
                  </button>
                </div>
              </div>

              {/* Universal OBS Master Link Banner */}
              <div className="universal-obs-banner">
                <div>
                  <div className="u-obs-title">
                    📡 رابط OBS الموحد لمكتبتك (Universal AlertBox URL)
                  </div>
                  <div className="u-obs-sub">
                    انسخ هذا الرابط وضعه في OBS Studio كـ Browser Source (1920×1080) لتشغيل جميع الإشعارات المفعّلة بالأسفل تلقائياً:
                  </div>
                </div>
                <div className="u-obs-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const url = getObsBrowserSourceUrl('crimson-blood-reaper');
                      if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
                      showToast('✅ تم نسخ رابط OBS الموحد إلى الحافظة!');
                    }}
                  >
                    نسخ رابط OBS الموحد
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      const activePacks = libraryPacks.filter((p) => obsEnabledMap[p.id]);
                      const pick = activePacks[0] || libraryPacks[0] || ALERTS_CATALOG[0];
                      triggerLiveAlertTest(pick);
                    }}
                  >
                    ⚡ إرسال تنبيه تجريبي
                  </button>
                </div>
              </div>

              <div className="lib-grid">
                {(activeView === 'favorites' ? favoritePacks : libraryPacks).map((pack) => {
                  const isObsOn = !!obsEnabledMap[pack.id];
                  return (
                    <div key={pack.id} className="lib-card">
                      <div
                        className="lib-thumb"
                        onClick={() => openPackDetails(pack)}
                        style={{ cursor: 'pointer' }}
                      >
                        <PackSvgEmblem pack={pack} size={52} />
                      </div>
                      <div className="lib-info">
                        <div
                          className="t"
                          style={{ cursor: 'pointer' }}
                          onClick={() => openPackDetails(pack)}
                        >
                          {pack.name}
                        </div>
                        <div className="s">
                          {ALERT_CATEGORIES.find((c) => c.id === pack.category)?.label} •{' '}
                          {isObsOn ? 'مُفعّل في OBS' : 'غير مُفعّل'}
                        </div>
                        <div className="lib-foot">
                          <div className="toggle">
                            <button
                              type="button"
                              aria-label="تفعيل في OBS"
                              className={`switch ${isObsOn ? 'on' : ''}`}
                              onClick={() => {
                                setObsEnabledMap((prev) => ({
                                  ...prev,
                                  [pack.id]: !isObsOn,
                                }));
                                showToast(
                                  !isObsOn
                                    ? `✅ تم تفعيل "${pack.name}" في OBS`
                                    : `تم إيقاف "${pack.name}" مؤقتاً`
                                );
                              }}
                            ></button>
                            <span>ربط تلقائي</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ padding: '6px 10px', fontSize: 12 }}
                              onClick={() => triggerLiveAlertTest(pack)}
                            >
                              ▶ تجربة
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ padding: '6px 10px', fontSize: 12 }}
                              onClick={() => downloadStandaloneAlertHTML(pack)}
                            >
                              تنزيل
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {activeView === 'funding' && (
            <FundingView
              user={user}
              toast={showToast}
              onLogin={async () => { try { await signInWithGoogleAccount(); } catch (_) { setActiveView('login'); } }}
            />
          )}

          {/* ---------------------------------------------------------------
              VIEW 4: SIGN IN & MN ECOSYSTEM TIER / RANK SWITCHER (تسجيل الدخول)
              --------------------------------------------------------------- */}
          {activeView === 'login' && (
            <section className="login-wrap">
              <div className="login-card">
                <div className="brand" style={{ justifyContent: 'center', padding: 0 }}>
                  <div className="brand-dot"></div>
                  <div className="brand-name">mnalerts</div>
                </div>
                <h1>مرحباً بعودتك</h1>
                <p>
                  سجّل الدخول لتبدأ التصفح — نفس حساب الاشتراك المستخدم عبر خدمات{' '}
                  <b style={{ color: 'var(--text)' }}>MOHMMAD NOUR</b>
                </p>

                {user && (
                  <div className="active-account-box">
                    <AvatarRing
                      tier={user.plan || 'free'}
                      size={54}
                      photoURL={user.photoURL}
                      name={user.displayName}
                    />
                    <div className="active-account-meta">
                      <div className="acc-name">{user.displayName}</div>
                      <div className="acc-email">{user.email}</div>
                      <div className="acc-badges">
                        <span
                          className="acc-pill"
                          style={{
                            color: userPlanBadge.color,
                            borderColor: userPlanBadge.color,
                          }}
                        >
                          باقة {userPlanBadge.label}
                        </span>
                        <span className="acc-pill">
                          {user.rankIcon} {user.rankTitle} (ولاء {user.loyaltyMonths} شهر)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="g-btn"
                  onClick={async () => {
                    try {
                      await signInWithGoogleAccount();
                      showToast('✅ تم تسجيل الدخول بحساب Google');
                      setActiveView('explore');
                    } catch (err) {
                      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
                        showToast(err?.code === 'auth/unauthorized-domain'
                          ? '⚠️ هذا النطاق غير مضاف في Firebase Authorized domains'
                          : `تعذّر تسجيل الدخول: ${err?.message || err}`);
                      }
                    }
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
                    />
                  </svg>
                  <span>المتابعة باستخدام Google</span>
                </button>

                {/* Creator Rank Ladder Preview */}
                <div className="ranks-ladder">
                  {RANK_LEVELS.map((r) => (
                    <div
                      key={r.level}
                      className={`rank-step ${(user?.rankLevel || 1) >= r.level ? 'unlocked' : ''}`}
                    >
                      <span>{r.icon}</span>
                      <span>{r.title}</span>
                    </div>
                  ))}
                </div>

                <div className="login-foot">
                  تُدار الاشتراكات والرتب مركزياً عبر{' '}
                  <a href={getSubscriptionsPortalUrl()} target="_blank" rel="noreferrer">
                    بوابة اشتراكات MOHMMAD NOUR
                  </a>
                  {user && (
                    <div style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '6px 14px', fontSize: 12 }}
                        onClick={() => {
                          signOutEcosystem();
                          showToast('تم تسجيل الخروج');
                        }}
                      >
                        تسجيل الخروج
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
