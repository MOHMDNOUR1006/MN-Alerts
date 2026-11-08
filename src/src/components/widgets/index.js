/**
 * index.js - Master Registry & Catalog for all 16 Stream Widgets
 * Grounded in: PROJECT.md § 3 & Features F16-F31
 */

import ChatBox from './ChatBox.jsx';
import EventList from './EventList.jsx';
import GoalWidget from './GoalWidget.jsx';
import TipJar from './TipJar.jsx';
import TopSupporters from './TopSupporters.jsx';
import EndCredits from './EndCredits.jsx';
import MediaShare from './MediaShare.jsx';
import PollWidget from './PollWidget.jsx';
import SpinWheel from './SpinWheel.jsx';
import StreamBoss from './StreamBoss.jsx';
import EmoteWall from './EmoteWall.jsx';
import SponsorBanner from './SponsorBanner.jsx';
import CountdownTimer from './CountdownTimer.jsx';
import StreamLabels from './StreamLabels.jsx';
import ViewerCounter from './ViewerCounter.jsx';
import CustomWidget from './CustomWidget.jsx';

import WidgetContainer, { WidgetErrorBoundary } from './WidgetContainer.jsx';

export {
  WidgetContainer,
  WidgetErrorBoundary,
  ChatBox,
  EventList,
  GoalWidget,
  TipJar,
  TopSupporters,
  EndCredits,
  MediaShare,
  PollWidget,
  SpinWheel,
  StreamBoss,
  EmoteWall,
  SponsorBanner,
  CountdownTimer,
  StreamLabels,
  ViewerCounter,
  CustomWidget,
};

/**
 * Authoritative registry mapping widget type strings to their React components.
 */
export const WIDGET_REGISTRY = {
  'chat-box': ChatBox,
  'event-list': EventList,
  'goals-progress': GoalWidget,
  'tip-jar': TipJar,
  'top-supporters': TopSupporters,
  'end-credits': EndCredits,
  'media-share': MediaShare,
  'polls': PollWidget,
  'spin-wheel': SpinWheel,
  'stream-boss': StreamBoss,
  'emote-wall': EmoteWall,
  'sponsor-banner': SponsorBanner,
  'countdown-timer': CountdownTimer,
  'stream-labels': StreamLabels,
  'viewer-counter': ViewerCounter,
  'custom-html': CustomWidget,

  // Convenient shorthand aliases
  'chatbox': ChatBox,
  'eventlist': EventList,
  'goals': GoalWidget,
  'tipjar': TipJar,
  'topsupporters': TopSupporters,
  'endcredits': EndCredits,
  'mediashare': MediaShare,
  'poll': PollWidget,
  'spinwheel': SpinWheel,
  'streamboss': StreamBoss,
  'emotewall': EmoteWall,
  'sponsor': SponsorBanner,
  'countdown': CountdownTimer,
  'labels': StreamLabels,
  'viewers': ViewerCounter,
  'custom': CustomWidget,
};

/**
 * Returns the component associated with a widget type string, or null if unknown.
 *
 * @param {string} type
 * @returns {React.ComponentType|null}
 */
export function getWidgetComponent(type) {
  if (!type || typeof type !== 'string') return null;
  return WIDGET_REGISTRY[type.toLowerCase().trim()] || null;
}

/**
 * 16 Stream Widgets Catalog Metadata with default dimensions and descriptions.
 */
export const WIDGET_CATALOG = [
  {
    type: 'chat-box',
    nameAr: 'صندوق الدردشة',
    nameEn: 'Chat Box',
    description: 'تغذية دردشة حية مع دعم الشارات والإيموجي والتلاشي التلقائي',
    defaultWidth: 380,
    defaultHeight: 460,
    category: 'engagement',
  },
  {
    type: 'event-list',
    nameAr: 'شريط الأحداث الأخيرة',
    nameEn: 'Event List',
    description: 'قائمة متحركة لأحدث المتابعات والاشتراكات والتبرعات',
    defaultWidth: 360,
    defaultHeight: 300,
    category: 'alerts',
  },
  {
    type: 'goals-progress',
    nameAr: 'أشرطة الأهداف',
    nameEn: 'Goals & Progress Bars',
    description: 'شريط أهداف متوهج للتبرعات والمشتركين مع احتفال عند الإنجاز',
    defaultWidth: 420,
    defaultHeight: 90,
    category: 'monetization',
  },
  {
    type: 'tip-jar',
    nameAr: 'جرة التبرعات الفيزيائية',
    nameEn: 'Tip Jar',
    description: 'محاكاة فيزيائية 2D لتساقط العملات مع تصادم واقعي واصطدام',
    defaultWidth: 280,
    defaultHeight: 360,
    category: 'monetization',
  },
  {
    type: 'top-supporters',
    nameAr: 'منصة كبار الداعمين',
    nameEn: 'Top Supporters',
    description: 'منصة تتويج ثلاثية لأفضل الداعمين مع إطارات أفاتار ملكية',
    defaultWidth: 380,
    defaultHeight: 240,
    category: 'monetization',
  },
  {
    type: 'end-credits',
    nameAr: 'تتر نهاية البث',
    nameEn: 'End Credits',
    description: 'شريط تتر سينمائي متحرك يشكر كل الداعمين والمشتركين',
    defaultWidth: 500,
    defaultHeight: 600,
    category: 'community',
  },
  {
    type: 'media-share',
    nameAr: 'مشاركة الوسائط والفيديو',
    nameEn: 'Media Share',
    description: 'مشغل فيديو في الشاشة لمشاركات المتابعين مع شريط تقدم وتخطي',
    defaultWidth: 480,
    defaultHeight: 290,
    category: 'engagement',
  },
  {
    type: 'polls',
    nameAr: 'استطلاعات الرأي الحية',
    nameEn: 'Live Polls',
    description: 'تصويت تفاعلي للمشاهدين مع أشرطة نسب مئوية في الوقت الفعلي',
    defaultWidth: 360,
    defaultHeight: 240,
    category: 'engagement',
  },
  {
    type: 'spin-wheel',
    nameAr: 'عجلة الحظ والجوائز',
    nameEn: 'Spin Wheel',
    description: 'عجلة جوائز تفاعلية مع فيزياء تباطؤ ونقرات صوتية',
    defaultWidth: 340,
    defaultHeight: 340,
    category: 'gamification',
  },
  {
    type: 'stream-boss',
    nameAr: 'زعيم البث والقتال',
    nameEn: 'Stream Boss',
    description: 'معركة زعيم تفاعلية بنقاط صحة HP تتضرر بالدعم والتشجيع',
    defaultWidth: 420,
    defaultHeight: 100,
    category: 'gamification',
  },
  {
    type: 'emote-wall',
    nameAr: 'جدار الإيموجي المتفجر',
    nameEn: 'Emote Wall',
    description: 'شلال جزيئات متفجر للإيموجي يملأ الشاشة بحركات متعددة',
    defaultWidth: 800,
    defaultHeight: 600,
    category: 'engagement',
  },
  {
    type: 'sponsor-banner',
    nameAr: 'بنر الرعاة وQR كود',
    nameEn: 'Sponsor Banner',
    description: 'بنر رعاة دوار بتأثير 3D مع رمز استجابة سريعة QR ديناميكي',
    defaultWidth: 440,
    defaultHeight: 90,
    category: 'monetization',
  },
  {
    type: 'countdown-timer',
    nameAr: 'عداد تنازلي وسوباثون',
    nameEn: 'Countdown & Subathon',
    description: 'عداد رقمي لبدء البث أو الاستراحة مع وضع السوباثون',
    defaultWidth: 320,
    defaultHeight: 110,
    category: 'utility',
  },
  {
    type: 'stream-labels',
    nameAr: 'مؤشرات وإحصاءات البث',
    nameEn: 'Stream Labels',
    description: 'شريط مؤشر لآخر متابع، أعلى تبرع، أو مدة البث',
    defaultWidth: 260,
    defaultHeight: 50,
    category: 'utility',
  },
  {
    type: 'viewer-counter',
    nameAr: 'عداد المشاهدين المتزامن',
    nameEn: 'Viewer Counter',
    description: 'إحصائية عدد المشاهدين المتزامنين عبر تويتش ويوتيوب وكيك',
    defaultWidth: 280,
    defaultHeight: 50,
    category: 'utility',
  },
  {
    type: 'custom-html',
    nameAr: 'عنصر HTML/CSS مخصص',
    nameEn: 'Custom HTML Widget',
    description: 'حاوية آمنة ومعزولة لتشغيل كود وتصاميم مخصصة لصانع المحتوى',
    defaultWidth: 350,
    defaultHeight: 200,
    category: 'custom',
  },
];

export default {
  WIDGET_REGISTRY,
  WIDGET_CATALOG,
  getWidgetComponent,
};
