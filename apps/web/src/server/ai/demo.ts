import type {
  AiDraftInput,
  AiDraftResult,
  AiReviewResult,
  AiWordingInput,
  AiWordingResult,
  ScannedElement,
} from "@waypoint/shared";
import { ApiError } from "../http/errors";
import type { ReviewInput } from "./tasks";

/*
 * Demo mode: used when no ANTHROPIC_API_KEY is set. Built-in rules turn the real page scan and
 * tour text into answers, with no network call and the same result every time. Arabic uses a
 * hand-written phrase book (the Redington demo tours plus the draft templates below).
 */

/* ---------------- Arabic phrase book (sentence level) ---------------- */

const AR: Record<string, string> = {
  "Find any product fast": "ابحث عن أي منتج بسرعة",
  "Search the whole catalogue by part number, product name or brand.":
    "ابحث في الكتالوج بالكامل برقم القطعة أو اسم المنتج أو العلامة التجارية.",
  "Browse by category": "تصفّح حسب الفئة",
  "Open All Categories to explore laptops, phones, printing, displays and more.":
    "افتح «جميع الفئات» لاستكشاف أجهزة الكمبيوتر المحمولة والهواتف والطباعة والشاشات وغيرها.",
  "Shop by brand": "تسوّق حسب العلامة التجارية",
  "Prefer a specific Brand?": "تفضّل علامة تجارية معيّنة؟",
  "Jump straight to the brands you sell.": "انتقل مباشرةً إلى العلامات التجارية التي تبيعها.",
  "Track your orders": "تتبّع طلباتك",
  "Check the status of any order in one place.": "تحقّق من حالة أي طلب من مكان واحد.",
  "Not a partner yet?": "لست شريكًا بعد؟",
  "Apply here to open a partner account.": "قدّم طلبك هنا لفتح حساب شريك.",
  "Already a partner?": "هل أنت شريك بالفعل؟",
  "Log in to your partner account to start ordering.": "سجّل الدخول إلى حساب الشريك لبدء الطلب.",
  "Search by part number, product name or brand.":
    "ابحث برقم القطعة أو اسم المنتج أو العلامة التجارية.",
  "Results appear as you type.": "تظهر النتائج أثناء الكتابة.",
  "Open All Categories to explore the full catalogue, department by department.":
    "افتح «جميع الفئات» لاستكشاف الكتالوج الكامل قسمًا تلو الآخر.",
  "Your country store": "متجر بلدك",
  "Prices, stock and currency follow the country you pick here.":
    "تتغيّر الأسعار والمخزون والعملة حسب البلد الذي تختاره هنا.",
  "Prices, stock and currency follow the country you choose here.":
    "تتغيّر الأسعار والمخزون والعملة حسب البلد الذي تختاره هنا.",
  "Need help?": "هل تحتاج إلى مساعدة؟",
  "Our team is one click away on Contact Us.": "فريقنا على بُعد نقرة واحدة عبر «اتصل بنا».",
  "Sign up to unlock partner pricing, quotes and order tracking.":
    "سجّل للحصول على أسعار الشركاء وعروض الأسعار وتتبّع الطلبات.",
  "Log in to see your prices, place orders and track deliveries.":
    "سجّل الدخول لعرض أسعارك وتقديم الطلبات وتتبّع الشحنات.",
  "Search by part number, model or brand.": "ابحث برقم القطعة أو الطراز أو العلامة التجارية.",
  "Browse every category": "تصفّح جميع الفئات",
  "Explore the full catalogue, department by department.":
    "استكشف الكتالوج الكامل قسمًا تلو الآخر.",
  "Latest programmes": "أحدث البرامج",
  "New campaigns and partner programmes appear here first.":
    "تظهر الحملات الجديدة وبرامج الشركاء هنا أولًا.",
  "Why partners choose Redington": "لماذا يختار الشركاء Redington",
  "Thousands of categories, millions of products and suppliers worldwide.":
    "آلاف الفئات وملايين المنتجات وموردون حول العالم.",
  "Jump to popular categories": "انتقل إلى الفئات الأكثر رواجًا",
  "One click to notebooks, phones, gaming and more.":
    "نقرة واحدة للوصول إلى أجهزة الكمبيوتر المحمولة والهواتف والألعاب وغيرها.",
  "Featured products": "منتجات مميّزة",
  "Partners see their own prices here once they log in.":
    "يرى الشركاء أسعارهم الخاصة هنا بعد تسجيل الدخول.",
  "What are you looking for?": "عمّ تبحث؟",
  "Shop by product type, from audio and video to cameras.":
    "تسوّق حسب نوع المنتج، من الصوت والفيديو إلى الكاميرات.",
  "Stay in the loop": "ابقَ على اطّلاع",
  "Get launches and offers by email.": "احصل على أحدث الإصدارات والعروض عبر البريد الإلكتروني.",
  "Become a partner": "كن شريكًا",
  // draft templates
  "Why partners choose us": "لماذا يختارنا الشركاء",
  "Key facts about our range and reach, at a glance.": "أهم الحقائق عن تشكيلتنا وانتشارنا في لمحة.",
  "One click to the most popular categories.": "نقرة واحدة للوصول إلى الفئات الأكثر رواجًا.",
  "Shop by product type.": "تسوّق حسب نوع المنتج.",
  "Your cart": "سلة التسوق",
  "Review your items and check out when you're ready.":
    "راجع منتجاتك وأكمل الطلب عندما تكون جاهزًا.",
  "Request a quote": "اطلب عرض سعر",
  "Ask for a quote on any product and follow the replies here.":
    "اطلب عرض سعر لأي منتج وتابع الردود من هنا.",
  "Your account": "حسابك",
  "Manage your company details, users and addresses.": "أدر بيانات شركتك والمستخدمين والعناوين.",
  "Saved for later": "المحفوظات",
  "Keep the products you buy often in one list.":
    "احتفظ بالمنتجات التي تشتريها كثيرًا في قائمة واحدة.",
  "Choose your language": "اختر لغتك",
  "Switch between English and Arabic at any time.": "بدّل بين الإنجليزية والعربية في أي وقت.",
  "Add to cart": "أضف إلى السلة",
  "Add this product to your cart and keep shopping.": "أضف هذا المنتج إلى سلتك وتابع التسوق.",
  "Add to quote": "أضف إلى عرض السعر",
  "Add this product to a quote request.": "أضف هذا المنتج إلى طلب عرض سعر.",
  "Ask for a price quote on this product.": "اطلب عرض سعر لهذا المنتج.",
  "Ask for a price": "اطلب السعر",
};
const EN = Object.fromEntries(Object.entries(AR).map(([en, ar]) => [ar, en]));

const sentences = (s: string) =>
  s
    .match(/[^.!?؟]+[.!?؟]?/g)
    ?.map((x) => x.trim())
    .filter(Boolean) ?? [];

function translate(text: string, book: Record<string, string>): { out: string; hits: number } {
  if (!text) return { out: "", hits: 0 };
  if (book[text.trim()]) return { out: book[text.trim()]!, hits: 1 };
  let hits = 0;
  const out = sentences(text)
    .map((s) => {
      const t = book[s];
      if (t) hits++;
      return t ?? s;
    })
    .join(" ");
  return { out, hits };
}

/* ---------------- Wording rules ---------------- */

const TYPOS: Record<string, string> = {
  botton: "button",
  thid: "this",
  teh: "the",
  recieve: "receive",
};
const PLAIN: [RegExp, string][] = [
  [/\butili[sz]e\b/gi, "use"],
  [/\bin order to\b/gi, "to"],
  [/\bnavigate to\b/gi, "go to"],
  [/\bpurchase\b/gi, "buy"],
  [/\blocate\b/gi, "find"],
  [/\bprior to\b/gi, "before"],
  [/\badditional\b/gi, "more"],
  [/\bassistance\b/gi, "help"],
  [/\bapproximately\b/gi, "about"],
  [/\bclick here\b/gi, "select this"],
  [/\b(simply|just|please|basically|really)\s+/gi, ""],
];

const fixTypos = (s: string) =>
  s.replace(/\b[a-z]+\b/gi, (w) => {
    const fix = TYPOS[w.toLowerCase()];
    return fix ? (w[0] === w[0]!.toUpperCase() ? fix[0]!.toUpperCase() + fix.slice(1) : fix) : w;
  });
const sentenceCase = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);
const endWithStop = (s: string) => (s && !/[.!?؟]$/.test(s) ? `${s}.` : s);

function clearTitle(title: string) {
  let t = fixTypos(title).trim();
  t = t
    .replace(/^click (on )?(the )?/i, "")
    .replace(/^for /i, "")
    .replace(/\s*\bnow\b\s*$/i, "")
    .trim();
  t = t.replace(/^add to cart button$/i, "Add to cart").replace(/^this$/i, "Take a look");
  return sentenceCase(t.trim()) || title;
}

/** A description for a step that has none, from what its title says. */
function describe(title: string) {
  const t = title.toLowerCase();
  if (/cart/.test(t)) return "Add this product to your cart and keep shopping.";
  if (/quote/.test(t)) return "Add this product to a quote request.";
  if (/search|find/.test(t)) return "Search by part number, model or brand.";
  if (/order/.test(t)) return "Check the status of any order in one place.";
  return "";
}

function shorten(input: AiWordingInput): AiWordingResult {
  const words = clearTitle(input.title).split(/\s+/);
  const title = words.length > 5 ? words.slice(0, 5).join(" ") : words.join(" ");
  let d = sentences(input.description)[0] ?? "";
  d = d.replace(/\s*\([^)]*\)/g, "");
  for (const [re, to] of PLAIN) d = d.replace(re, to);
  if (d.length > 90) {
    const cut = d.slice(0, 90).lastIndexOf(",");
    d = cut > 30 ? d.slice(0, cut) : d.slice(0, 90).replace(/\s+\S*$/, "");
  }
  return {
    title: input.title ? title : "",
    description: input.description ? endWithStop(d.trim()) : "",
  };
}

function clearer(input: AiWordingInput): AiWordingResult {
  const title = clearTitle(input.title);
  let d = fixTypos(input.description);
  for (const [re, to] of PLAIN) d = d.replace(re, to);
  d = endWithStop(sentenceCase(d.trim())) || describe(title);
  return { title: input.title ? title : "", description: d };
}

function friendlier(input: AiWordingInput): AiWordingResult {
  const title = clearTitle(input.title);
  const parts = sentences(input.description || describe(title));
  const first = parts[0] ?? "";
  const imperative =
    /^(search|open|browse|explore|check|log|sign|apply|add|get|shop|jump|track|choose|pick|review|ask|keep|switch|find|see)\b/i;
  if (first && imperative.test(first))
    parts[0] = `Here you can ${first[0]!.toLowerCase()}${first.slice(1)}`;
  else if (first && !/^(here|you|we|our)\b/i.test(first)) parts[0] = `Good to know: ${first}`;
  return { title: input.title ? title : "", description: parts.join(" ") };
}

export function demoReword(input: AiWordingInput): AiWordingResult {
  if (input.action === "SHORTEN") return shorten(input);
  if (input.action === "CLEARER") return clearer(input);
  if (input.action === "FRIENDLIER") return friendlier(input);
  const book = input.action === "ARABIC" ? AR : EN;
  const title = translate(input.title.trim(), book);
  const desc = translate(input.description.trim(), book);
  if (title.hits + desc.hits === 0)
    throw new ApiError(
      422,
      "AI_FAILED",
      input.action === "ARABIC"
        ? "Demo mode translates the demo tours' text. Add an AI key to translate any text."
        : "Demo mode translates the demo tours' text back to English only.",
    );
  return { title: title.out, description: desc.out };
}

/* ---------------- Draft a tour from a page scan ---------------- */

interface Kind {
  key: string;
  rank: number;
  match: (e: ScannedElement, words: string) => boolean;
  title: string;
  description: string;
  goal?: RegExp;
}

const KINDS: Kind[] = [
  {
    key: "search",
    rank: 1,
    match: (e, w) => /search/.test(w) || e.role === "searchbox",
    title: "Find any product fast",
    description: "Search by part number, model or brand. Results appear as you type.",
    goal: /search|find|product/,
  },
  {
    key: "categories",
    rank: 2,
    match: (_e, w) => /all categories|"navigation-(list|container)"/.test(w),
    title: "Browse every category",
    description: "Explore the full catalogue, department by department.",
    goal: /categor|browse|catalog/,
  },
  {
    key: "signup",
    rank: 3,
    match: (e) => /sign ?up|register|become a partner|apply/i.test(`${e.text} ${e.label}`),
    title: "Become a partner",
    description: "Sign up to unlock partner pricing, quotes and order tracking.",
    goal: /partner|sign|register/,
  },
  {
    key: "login",
    rank: 4,
    match: (e) => /\blog ?in\b|sign ?in/i.test(`${e.text} ${e.label}`),
    title: "Already a partner?",
    description: "Log in to see your prices, place orders and track deliveries.",
    goal: /log|price/,
  },
  {
    key: "track",
    rank: 5,
    match: (_e, w) => /track/.test(w),
    title: "Track your orders",
    description: "Check the status of any order in one place.",
    goal: /order|track|deliver/,
  },
  {
    key: "quote",
    rank: 5,
    match: (_e, w) => /quote|rfq/.test(w),
    title: "Request a quote",
    description: "Ask for a quote on any product and follow the replies here.",
    goal: /quote|price/,
  },
  {
    key: "featured",
    rank: 6,
    match: (_e, w) => /featured|producttable|product-table/.test(w),
    title: "Featured products",
    description: "Partners see their own prices here once they log in.",
    goal: /product|price/,
  },
  {
    key: "hero",
    rank: 7,
    match: (e, w) => /hero|banner/.test(w) && e.y < 20,
    title: "Latest programmes",
    description: "New campaigns and partner programmes appear here first.",
    goal: /offer|campaign|program/,
  },
  {
    key: "country",
    rank: 8,
    match: (_e, w) => /country/.test(w),
    title: "Your country store",
    description: "Prices, stock and currency follow the country you choose here.",
    goal: /country|currenc/,
  },
  {
    key: "cart",
    rank: 8,
    match: (_e, w) => /\bcart\b|basket/.test(w),
    title: "Your cart",
    description: "Review your items and check out when you're ready.",
    goal: /cart|buy|checkout/,
  },
  {
    key: "shopcat",
    rank: 9,
    match: (_e, w) => /shop by category|categorycarousel|category-carousel/.test(w),
    title: "Jump to popular categories",
    description: "One click to the most popular categories.",
    goal: /categor/,
  },
  {
    key: "help",
    rank: 9,
    match: (e) => /contact us|faq|help/i.test(`${e.text} ${e.label}`),
    title: "Need help?",
    description: "Our team is one click away on Contact Us.",
    goal: /help|support|contact/,
  },
  {
    key: "account",
    rank: 10,
    match: (_e, w) => /my account|profile|account-/.test(w),
    title: "Your account",
    description: "Manage your company details, users and addresses.",
    goal: /account|profile/,
  },
  {
    key: "about",
    rank: 11,
    match: (_e, w) => /aboutus|about-us|why /.test(w),
    title: "Why partners choose us",
    description: "Key facts about our range and reach, at a glance.",
  },
  {
    key: "lookingfor",
    rank: 12,
    match: (_e, w) => /looking for/.test(w),
    title: "What are you looking for?",
    description: "Shop by product type.",
  },
  {
    key: "newsletter",
    rank: 13,
    match: (_e, w) => /newsletter|subscribe|stay in/.test(w),
    title: "Stay in the loop",
    description: "Get launches and offers by email.",
  },
  {
    key: "wishlist",
    rank: 13,
    match: (_e, w) => /wishlist|saved/.test(w),
    title: "Saved for later",
    description: "Keep the products you buy often in one list.",
  },
  {
    key: "language",
    rank: 14,
    match: (e, w) => /language/.test(w) && e.y < 5,
    title: "Choose your language",
    description: "Switch between English and Arabic at any time.",
  },
];

const INTERACTIVE = /^(a|button|input|select|textarea|li|span|img)$/;

export function demoDraft(input: AiDraftInput): AiDraftResult {
  const goal = input.goal.toLowerCase();
  // Each kind takes its most specific match: the element with the least text (the link itself,
  // not the header strip around it), preferring things a visitor can click.
  const found = new Map<string, { kind: Kind; el: ScannedElement }>();
  const size = (e: ScannedElement, kind: Kind) => {
    // The search box itself beats the "Search by:" caption next to it.
    if (kind.key === "search") {
      if (e.tag === "input" || e.role === "searchbox") return -100;
      if (
        /search-input|header-search|search-container|flipsearchanimation-section/i.test(e.selector)
      )
        return -50;
    }
    return (e.text || e.label).length + (INTERACTIVE.test(e.tag) ? 0 : 40);
  };
  const taken = new Set<string>();
  for (const kind of KINDS) {
    const best = input.elements
      .filter((el) => !taken.has(el.selector))
      .filter((el) => kind.match(el, `${el.text} ${el.label} ${el.selector}`.toLowerCase()))
      .sort((a, b) => size(a, kind) - size(b, kind))[0];
    if (best) {
      found.set(kind.key, { kind, el: best });
      taken.add(best.selector);
    }
  }
  const scored = [...found.values()].map((f) => ({
    ...f,
    score: f.kind.rank - (f.kind.goal && goal && f.kind.goal.test(goal) ? 10 : 0),
  }));
  let picks = scored.sort((a, b) => a.score - b.score).slice(0, input.stepCount);

  // Not enough recognisable parts: fill with headings and buttons, top to bottom.
  if (picks.length < input.stepCount) {
    const used = new Set(picks.map((p) => p.el.selector));
    const extra = input.elements
      .filter(
        (e) =>
          !used.has(e.selector) && (e.tag === "h2" || e.tag === "h1" || INTERACTIVE.test(e.tag)),
      )
      .filter((e) => (e.text || e.label).length >= 3 && (e.text || e.label).length <= 60)
      .slice(0, input.stepCount - picks.length)
      .map((el) => {
        const name = sentenceCase((el.text || el.label).toLowerCase());
        return {
          el,
          score: 99,
          kind: {
            key: el.selector,
            rank: 99,
            match: () => true,
            title: name,
            description: /^h[12]$/.test(el.tag)
              ? `Scroll here for ${name.toLowerCase()}.`
              : `Select ${name} to continue.`,
          } as Kind,
        };
      });
    picks = [...picks, ...extra];
  }
  if (picks.length === 0)
    throw new ApiError(502, "AI_FAILED", "Couldn't find enough useful elements on this page.");

  const path = input.pageUrl.replace(/\/+$/, "");
  const last = path.split("/").filter(Boolean).pop() ?? "";
  const pageName =
    !last || /^[a-z]{2}(-[a-z]{2})?$/i.test(last)
      ? "Home page"
      : sentenceCase(last.replace(/[-_]+/g, " "));
  return {
    name: `${pageName}: guided tour`,
    steps: picks
      .sort((a, b) => a.el.y - b.el.y)
      .map((p) => ({
        cssSelector: p.el.selector,
        title: p.kind.title,
        description: p.kind.description,
        placement: "AUTO" as const,
      })),
  };
}

/* ---------------- Explain drop-offs ---------------- */

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

export function demoReview(input: ReviewInput): AiReviewResult {
  const steps = input.steps;
  const target = input.dropOff
    ? steps.find((s) => s.stepOrder === input.dropOff!.fromOrder)
    : [...steps].sort(
        (a, b) =>
          wordCount(`${b.title} ${b.description}`) - wordCount(`${a.title} ${a.description}`) ||
          a.stepOrder - b.stepOrder,
      )[0];
  if (!target)
    return {
      basedOn: input.dropOff ? "dropoff" : "copy",
      summary: "The text reads well.",
      suggestions: [],
    };

  const rewrite = shorten({
    action: "SHORTEN",
    title: clearTitle(target.title),
    description: clearer({
      action: "CLEARER",
      title: target.title,
      description: target.description,
    }).description,
  });
  // Already short and clear: offer the friendlier version instead of the same text.
  if (rewrite.title === target.title && rewrite.description === target.description) {
    const f = friendlier({
      action: "FRIENDLIER",
      title: target.title,
      description: target.description,
    });
    rewrite.description =
      f.description !== target.description
        ? f.description
        : `${target.description.replace(/[.!]$/, "")}, whenever you need it.`;
  }
  const words = wordCount(target.description);
  const summary = input.dropOff
    ? `${input.dropOff.lost} visitors leave on step ${target.stepOrder} (“${target.title}”) and never reach step ${input.dropOff.toOrder}. ${words > 14 ? `Its ${words}-word text asks a lot at once; ` : "It doesn't say clearly what to do next; "}a shorter tip with one clear action keeps people moving.`
    : `Not enough visitors yet to see where people leave. Step ${target.stepOrder} (“${target.title}”) has the most text, so it's the most likely place to lose them.`;
  return {
    basedOn: input.dropOff ? "dropoff" : "copy",
    summary,
    suggestions: [
      {
        stepId: target.id,
        stepOrder: target.stepOrder,
        why: words > 14 ? "Shorter, with one clear action" : "Clearer about what to do",
        title: rewrite.title || target.title,
        description: rewrite.description || describe(target.title),
      },
    ],
  };
}
