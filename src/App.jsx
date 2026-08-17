import React, { useState, useMemo, useEffect } from "react";
import {
  Circle, Square, Diamond, Mountain, Snowflake, Trees, Compass, Layers, Wind,
  Wallet, Ruler, Shirt, Eye, HardHat, Hand, Palette, ListChecks, Sparkles,
  User, Users, ChevronRight, ChevronLeft, ShoppingBag, RotateCcw, Lock, Check,
  X, Search, Crown, ChevronDown, Globe,
} from "lucide-react";
import { supabase } from "./supabaseClient";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;900&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
`;

/* ---------------------------------------------------------
   SIGN-IN COOLDOWN — a client-side UX throttle only. This does
   NOT stop abuse on its own: it's plain localStorage, so clearing
   storage, using a private window, or calling Supabase directly
   bypasses it entirely. The actual enforced protection against
   OTP abuse lives server-side in Supabase (Dashboard → Authentication
   → Rate Limits) - that's what to configure for real security.
   This just keeps the UI from hammering signInWithOtp with repeat
   clicks and gives the user a clear "try again in N minutes" cue.
--------------------------------------------------------- */
const AUTH_ATTEMPT_LIMIT = 5;
const AUTH_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_ATTEMPTS_KEY = "slopefit_auth_attempts";

function getRecentAuthAttempts() {
  let stored = [];
  try {
    stored = JSON.parse(localStorage.getItem(AUTH_ATTEMPTS_KEY) || "[]");
  } catch {
    stored = [];
  }
  const cutoff = Date.now() - AUTH_ATTEMPT_WINDOW_MS;
  const recent = stored.filter((t) => typeof t === "number" && t > cutoff);
  if (recent.length !== stored.length) {
    localStorage.setItem(AUTH_ATTEMPTS_KEY, JSON.stringify(recent));
  }
  return recent;
}

function recordAuthAttempt() {
  const recent = getRecentAuthAttempts();
  recent.push(Date.now());
  localStorage.setItem(AUTH_ATTEMPTS_KEY, JSON.stringify(recent));
  return recent;
}

/* ---------------------------------------------------------
   20-COLOR PALETTE — light + dark. Users pick up to 3.
--------------------------------------------------------- */
const PALETTE = [
  { id: "black", label: "Black", hex: "#0B0B0C", tone: "dark" },
  { id: "charcoal", label: "Charcoal", hex: "#3A3D42", tone: "dark" },
  { id: "slate", label: "Slate", hex: "#64707D", tone: "dark" },
  { id: "navy", label: "Navy", hex: "#16294D", tone: "dark" },
  { id: "forest", label: "Forest", hex: "#1E4632", tone: "dark" },
  { id: "olive", label: "Olive", hex: "#6B7343", tone: "dark" },
  { id: "burgundy", label: "Burgundy", hex: "#5C1A2B", tone: "dark" },
  { id: "purple", label: "Purple", hex: "#6B3FA0", tone: "dark" },
  { id: "white", label: "White", hex: "#F7F8FA", tone: "light" },
  { id: "cream", label: "Cream", hex: "#EFE7D8", tone: "light" },
  { id: "sand", label: "Sand", hex: "#C9B18C", tone: "light" },
  { id: "sky", label: "Sky", hex: "#8ECBE8", tone: "light" },
  { id: "blush", label: "Blush", hex: "#F2C4C9", tone: "light" },
  { id: "mint", label: "Mint", hex: "#B6E3C6", tone: "light" },
  { id: "cobalt", label: "Cobalt", hex: "#2258D8", tone: "bright" },
  { id: "teal", label: "Teal", hex: "#17A0A6", tone: "bright" },
  { id: "lime", label: "Lime", hex: "#C2F03C", tone: "bright" },
  { id: "yellow", label: "Yellow", hex: "#F5C518", tone: "bright" },
  { id: "orange", label: "Orange", hex: "#F26722", tone: "bright" },
  { id: "red", label: "Red", hex: "#C8202E", tone: "bright" },
  { id: "silver", label: "Silver", hex: "#B7BCC2", tone: "light" },
  { id: "magenta", label: "Magenta", hex: "#D6247A", tone: "bright" },
  { id: "turquoise", label: "Turquoise", hex: "#2FBFAE", tone: "bright" },
  { id: "coral", label: "Coral", hex: "#F0765A", tone: "bright" },
  { id: "lavender", label: "Lavender", hex: "#C9B6E4", tone: "light" },
];
const MAX_COLORS = 3;
const colorById = Object.fromEntries(PALETTE.map((c) => [c.id, c]));

const GENDERS = [
  { id: "m", label: "Men's", desc: "Men's cuts and sizing across outerwear and skis.", icon: User },
  { id: "w", label: "Women's", desc: "Women's cuts and women's-specific gear constructions.", icon: User },
  { id: "u", label: "No preference", desc: "Show me whatever fits best, unisex included.", icon: Users },
];

const ABILITY = [
  { id: "beginner", label: "Beginner", desc: "First turns, still finding balance on easy, wide-open runs.", icon: Circle, filled: false },
  { id: "intermediate", label: "Intermediate", desc: "Comfortable linking turns on most groomed runs.", icon: Square, filled: true, fillOpacity: 0.35 },
  { id: "advanced", label: "Advanced", desc: "Confident on steeps, bumps, and ungroomed snow at speed.", icon: Diamond, filled: true, fillOpacity: 1 },
  { id: "expert", label: "Expert", desc: "Chasing the lines most people avoid, in any condition.", icon: Diamond, filled: true, fillOpacity: 1, double: true },
];

const TERRAIN = [
  { id: "groomed", label: "Groomed Runs", desc: "Corduroy, carving, cruising wide-open pistes.", icon: Mountain },
  { id: "powder", label: "Powder & Off-Piste", desc: "Fresh snow, floaty turns, untouched sidecountry.", icon: Snowflake },
  { id: "park", label: "Terrain Park", desc: "Rails, jumps, jibs, switch laps.", icon: Compass },
  { id: "backcountry", label: "Backcountry", desc: "Earning turns on skins, far from the lifts.", icon: Trees },
  { id: "moguls", label: "Moguls & Bumps", desc: "Tight, rhythmic turns through bump fields.", icon: Layers },
  { id: "ice", label: "Icy & Hardpack", desc: "Firm, fast conditions that reward precise edging.", icon: Wind },
];

const STYLE = [
  { id: "street", label: "Park & Street", desc: "Baggy fits, streetwear cuts, park-lap energy." },
  { id: "freeride", label: "Freeride", desc: "Technical, rugged pieces built for big terrain." },
  { id: "classic", label: "Classic Alpine", desc: "Clean lines, timeless resort look." },
  { id: "race", label: "Race / Performance", desc: "Trim, fast, built to cut wind." },
  { id: "retro", label: "Retro / Vintage", desc: "Throwback colors and shapes from 80s/90s snow culture." },
];

/* ---------------------------------------------------------
   CURRENCY — all prices in the catalog are stored in USD.
   Everything on screen gets converted at display time via
   formatPrice(). Rates are approximate and should be swapped
   for a live FX feed before this goes anywhere near checkout.
--------------------------------------------------------- */
/* ---------------------------------------------------------
   AFFILIATE LINKS
   Fill in AFFILIATE_IDS once approved by each network. Every
   catalog item can optionally carry a `productUrl` (the real
   retailer page) and a `retailer` key matching one of these
   networks. buildShopLink() wraps that URL with your tracking
   ID automatically. Items with no productUrl fall back to a
   plain Google Shopping search (current default behaviour) -
   so this is safe to ship before any IDs are filled in, and
   nothing breaks as you add real product links one at a time.

   Each network has its own link format - these are the common
   patterns, but always confirm the exact format in your
   network's own dashboard after approval, since some retailers
   use custom deep-link tools instead of a simple query param.
--------------------------------------------------------- */
const AFFILIATE_IDS = {
  avantlink: null,   // e.g. "123456" - covers evo, REI, Berg's
  impact: null,      // e.g. "ir_1234x56789" - covers Backcountry
  cj: null,           // e.g. "1234567" - covers Mountain Hardwear, etc.
};

/* Affiliate networks all check that a real person is reachable, and an
   unreachable publisher is a standard rejection reason. The contact
   block on the About page renders only while this is set. */
const CONTACT_EMAIL = "cairnsbryson@gmail.com";

function buildShopLink(item, displayColorLabels) {
  const query = `${item.brand} ${item.name} ${displayColorLabels.join(" ")}`.trim();

  if (item.productUrl && item.retailer === "avantlink" && AFFILIATE_IDS.avantlink) {
    return `https://www.avantlink.com/click.php?tt=cl&merchant_id=&url=${encodeURIComponent(item.productUrl)}&affiliate_id=${AFFILIATE_IDS.avantlink}`;
  }
  if (item.productUrl && item.retailer === "impact" && AFFILIATE_IDS.impact) {
    return `https://imp.i${AFFILIATE_IDS.impact}.net/c/click?url=${encodeURIComponent(item.productUrl)}`;
  }
  if (item.productUrl && item.retailer === "cj" && AFFILIATE_IDS.cj) {
    return `https://www.anrdoezrs.net/click-${AFFILIATE_IDS.cj}?url=${encodeURIComponent(item.productUrl)}`;
  }
  // No affiliate ID configured yet, or no real product URL on this
  // item - fall back to a plain search so the button always works.
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
}

const CURRENCIES = {
  CAD: { code: "CAD", symbol: "CA$", rate: 1.37, label: "CAD — Canadian Dollar" },
  USD: { code: "USD", symbol: "US$", rate: 1, label: "USD — US Dollar" },
  EUR: { code: "EUR", symbol: "€", rate: 0.92, label: "EUR — Euro" },
  GBP: { code: "GBP", symbol: "£", rate: 0.79, label: "GBP — British Pound" },
};

function formatPrice(usdAmount, currencyCode) {
  const c = CURRENCIES[currencyCode] || CURRENCIES.CAD;
  const converted = Math.round(usdAmount * c.rate);
  return `${c.symbol}${converted.toLocaleString()}`;
}

const BUDGETS = [
  { id: "value", label: "Budget-Friendly", desc: "Solid, reliable gear without the premium tag.", maxUSD: 1350 },
  { id: "mid", label: "Mid-Range", desc: "Balance of performance, durability, and price.", minUSD: 1350, maxUSD: 2100 },
  { id: "premium", label: "Premium", desc: "Top-tier performance and finish, no compromises.", minUSD: 2100 },
];

const NAV_TABS = [
  { id: "home", label: "Home" },
  { id: "how-it-works", label: "How It Works" },
  { id: "features", label: "What You Get" },
  { id: "why", label: "Why SlopeFit" },
];

const HOW_IT_WORKS = [
  { title: "Answer seven questions", desc: "Gender, ability, terrain, style, build, colors, budget — under a minute.", icon: ListChecks },
  { title: "Get matched instantly", desc: "Every piece is scored against your answers to find the best fit per category.", icon: Sparkles },
  { title: "Search again and shop", desc: "Don't love a pick? Search again for the next-best match, then buy.", icon: ShoppingBag },
];

const PREMIUM_PLANS = [
  { id: "monthly", label: "Monthly", usd: 6.99, period: "/mo", note: "Cancel anytime" },
  { id: "yearly", label: "Yearly", usd: 49.99, period: "/yr", note: "Save 40% vs. paying monthly", badge: "Best value" },
];

const PREMIUM_FEATURES = [
  {
    title: "Unlimited Search Again",
    desc: "Free gives you one re-search per item. Premium lifts that entirely — cycle through every match in your size, colour and budget until something clicks, on all six pieces, as many times as you want.",
  },
  {
    title: "Compare mode",
    desc: "Instead of one recommendation per category, see your top three side-by-side with match scores, prices and colourways lined up. Useful when two jackets are close and you'd rather decide yourself than take our first pick.",
  },
  {
    title: "Save & share your setups",
    desc: "Keep your setups on your account instead of losing everything on refresh, and send any setup as a link so your crew can see exactly what you're running.",
  },
];

const GEAR_PREVIEW = [
  { label: "Skis", icon: Mountain },
  { label: "Jacket", icon: Shirt },
  { label: "Snowpants", icon: Layers },
  { label: "Goggles", icon: Eye },
  { label: "Helmet", icon: HardHat },
  { label: "Gloves", icon: Hand },
];

const WHY_ITEMS = [
  { title: "Brands people actually ride", desc: "Faction, Armada, Salomon, Völkl, Arc'teryx, Yuki Threads, Ninety Roll, Beyond Medals.", icon: Sparkles },
  { title: "Your colors, your call", desc: "Pick up to three from twenty-five shades and every piece gets matched to them.", icon: Palette },
  { title: "Sized to you", desc: "Ski or board length and cut tuned to your gender, height, weight, and ability.", icon: Ruler },
];

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------------------------------------------------------
   CATALOG — established ski brands for hardgoods; outerwear
   spans Yuki Threads, Beyond Medals, Ninety Roll, Polar
   Pursuit, and GSOU SNOW. Goggles: Oakley,
   Salomon, Giro, Smith, Anon. Helmets: Giro, Smith, Scott.

   colors[] map to the 20-swatch palette above.
   NOTE: prices are approximate and should be replaced with
   live values once an affiliate feed is connected.
--------------------------------------------------------- */
/* ---------------------------------------------------------
   SNOWBOARD-SPECIFIC HARDGOODS — swapped in for "skis" when
   sport === "snowboard". Jacket/pants/goggles/helmet/gloves
   are shared across both sports (verified via TikTok research
   that the same steezy baggy brands — GSOU, Arc'teryx, TNF,
   Oakley, Giro — show up in snowboard content too, not just
   ski content).
--------------------------------------------------------- */
const SNOWBOARD_BOARDS = {
  board: [
    // unisex — explicitly marketed unisex per current-season reviews
    { id: "bd1", name: "Howler", brand: "Jones", price: 650, gender: ["m", "w"], ability: ["advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["black"], tier: "premium" },
    { id: "bd2", name: "Mountain Twin", brand: "Jones", price: 600, gender: ["m", "w"], ability: ["intermediate", "advanced"], terrain: ["groomed", "park"], style: ["classic", "street"], colors: ["white"], tier: "mid" },
    { id: "bd3", name: "Dancehaul", brand: "Salomon", price: 550, gender: ["m", "w"], ability: ["intermediate", "advanced"], terrain: ["groomed", "powder"], style: ["freeride", "classic"], colors: ["charcoal", "black"], tier: "mid" },
    { id: "bd4", name: "Huck Knife", brand: "Salomon", price: 500, gender: ["m", "w"], ability: ["intermediate", "advanced", "expert"], terrain: ["park"], style: ["street"], colors: ["black", "white"], tier: "mid" },
    { id: "bd5", name: "Aeronaut", brand: "Capita", price: 630, gender: ["m", "w"], ability: ["advanced", "expert"], terrain: ["groomed", "powder"], style: ["freeride"], colors: ["black"], tier: "premium" },
    { id: "bd6", name: "Dark Horse", brand: "Capita", price: 450, gender: ["m", "w"], ability: ["beginner", "intermediate"], terrain: ["groomed", "park"], style: ["classic", "street"], colors: ["forest"], tier: "value" },
    { id: "bd7", name: "Nokhu", brand: "Never Summer", price: 600, gender: ["m", "w"], ability: ["intermediate", "advanced"], terrain: ["powder", "groomed"], style: ["freeride"], colors: ["white"], tier: "mid" },
    { id: "bd8", name: "dPr", brand: "Lib Tech", price: 450, gender: ["m", "w"], ability: ["beginner", "intermediate"], terrain: ["groomed", "powder"], style: ["classic"], colors: ["forest", "black"], tier: "value" },
    { id: "bd9", name: "Orca", brand: "Lib Tech", price: 630, gender: ["m", "w"], ability: ["advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["white"], tier: "premium" },
    { id: "bd10", name: "Agent", brand: "Rome", price: 550, gender: ["m", "w"], ability: ["intermediate", "advanced"], terrain: ["groomed", "moguls"], style: ["classic", "freeride"], colors: ["black"], tier: "mid" },
    { id: "bd11", name: "Banked Country", brand: "GNU", price: 600, gender: ["m", "w"], ability: ["advanced", "expert"], terrain: ["backcountry", "powder"], style: ["freeride"], colors: ["black", "white"], tier: "premium" },
    // men's
    { id: "bdm1", name: "Custom Camber", brand: "Burton", price: 680, gender: ["m"], ability: ["intermediate", "advanced"], terrain: ["groomed", "park"], style: ["classic"], colors: ["black"], tier: "premium" },
    { id: "bdm2", name: "Custom Flying V", brand: "Burton", price: 550, gender: ["m"], ability: ["beginner", "intermediate"], terrain: ["groomed", "powder"], style: ["classic", "freeride"], colors: ["white"], tier: "mid" },
    { id: "bdm3", name: "Mercury", brand: "Capita", price: 680, gender: ["m"], ability: ["advanced", "expert"], terrain: ["powder", "groomed"], style: ["freeride"], colors: ["black"], tier: "premium" },
    { id: "bdm4", name: "DOA", brand: "Capita", price: 550, gender: ["m"], ability: ["intermediate", "advanced", "expert"], terrain: ["park"], style: ["street"], colors: ["white"], tier: "mid" },
    { id: "bdm5", name: "Proto Type Two", brand: "Never Summer", price: 700, gender: ["m"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["freeride", "race"], colors: ["black"], tier: "premium" },
    { id: "bdm6", name: "Sky Pilot", brand: "K2", price: 650, gender: ["m"], ability: ["advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["charcoal", "black"], tier: "premium" },
    // women's
    { id: "bdw1", name: "Feelgood Flying V", brand: "Burton", price: 550, gender: ["w"], ability: ["beginner", "intermediate"], terrain: ["groomed", "powder"], style: ["classic", "freeride"], colors: ["white"], tier: "mid" },
    { id: "bdw2", name: "Blossom", brand: "Burton", price: 450, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "classic"], colors: ["black", "white"], tier: "value" },
  ],
};

/* Landing-page stats. These were hardcoded and had already drifted from
   the catalog they describe, so they are derived instead - the numbers on
   the page cannot disagree with what the quiz actually matches against. */
function catalogStats() {
  const groups = [...Object.values(CATALOG), ...Object.values(SNOWBOARD_BOARDS)];
  const items = groups.flat();
  return {
    products: items.length,
    brands: new Set(items.map((i) => i.brand)).size,
    categories: Object.keys(CATALOG).length,
  };
}




const CATALOG = {
  skis: [
    { id: "sm1", name: "Experience 86 Basalt (26/27)", brand: "Rossignol", price: 650, gender: ["m"], ability: ["beginner", "intermediate"], terrain: ["groomed"], style: ["classic"], colors: ["black", "forest"], tier: "value", image: "https://www.rossignol.com/dw/image/v2/BJJZ_PRD/on/demandware.static/-/Sites-rossignol-catalog/default/dwde0c9732/images/large/RAMFQ04_EXPERIENCE_86_BASALT_OPEN_72DPI_01.jpg?sw=800" },
    { id: "sm2", name: "QST 100 (26/27)", brand: "Salomon", price: 700, gender: ["m"], ability: ["intermediate", "advanced"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["sky", "black"], tier: "mid", image: "https://cdn.dam.salomon.com/e44113dc-9301-4bf9-af74-b2f301454ca1/L47421000+/PNG-2000px-max-72dpi.png" },
    { id: "sm21", name: "Tom Wallisch Pro (26/27)", brand: "Line", price: 720, gender: ["m"], ability: ["advanced", "expert"], terrain: ["park"], style: ["street"], colors: ["white", "red"], tier: "premium", image: "https://cdn.media.amplience.net/s/lineskis/line_2627_tom-wallisch-pro_LN261776?w=1200&qlt=90&fmt=auto" },
    { id: "sm22", name: "Chronic 94 (26/27)", brand: "Line", price: 630, gender: ["m"], ability: ["intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "classic"], colors: ["white", "orange"], tier: "value", image: "https://cdn.media.amplience.net/s/lineskis/line_2627_chronic-94_LN261773?w=1200&qlt=90&fmt=auto" },
    { id: "sm3", name: "ARV 94 (26/27)", brand: "Armada", price: 600, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "moguls"], style: ["street"], colors: ["black"], tier: "value", image: "/gear/sm3.jpg" },
    { id: "sm4", name: "Prodigy 2 Capsule (26/27)", brand: "Faction", price: 649, gender: ["m"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["cream", "red"], tier: "value", image: "https://cdn.shopify.com/s/files/1/2258/9075/files/Faction-Skis-2526-Prodigy-2-Capsule-Topsheet-1x1.jpg?v=1750406708" },
    { id: "sm23", name: "Prodigy 2 (26/27) — Black", brand: "Faction", price: 649, gender: ["m"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["black", "orange"], tier: "value", image: "https://cdn.shopify.com/s/files/1/2258/9075/files/Faction-Skis-2526-Prodigy-2-Topsheet-1x1.jpg?v=1750405561" },
    { id: "sm5", name: "Bent 100 (26/27)", brand: "Atomic", price: 700, gender: ["m"], ability: ["intermediate", "advanced"], terrain: ["powder", "park"], style: ["street", "freeride"], colors: ["black", "orange"], tier: "mid", image: "/gear/sm5.jpg" },
    { id: "sm6", name: "Optic 96 (26/27)", brand: "Line", price: 750, gender: ["m"], ability: ["advanced", "expert"], terrain: ["groomed", "moguls"], style: ["freeride", "street"], colors: ["forest"], tier: "premium", image: "https://cdn.media.amplience.net/s/lineskis/line_2627_optic-96_LN261759?w=1200&qlt=90&fmt=auto" },
    { id: "sm7", name: "M7 Mantra (26/27)", brand: "Völkl", price: 900, gender: ["m"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["burgundy"], tier: "premium", image: "https://cdn.media.amplience.net/s/k2skis/volkl_2627_m7-mantra_V2610112?w=1200&qlt=90&fmt=auto" },
    { id: "sm10", name: "Antimatter 100 (26/27)", brand: "Armada", price: 820, gender: ["m"], ability: ["advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["charcoal", "sky"], tier: "premium", image: "/gear/sm10.jpg" },
    { id: "sm11", name: "Bent Decode (26/27)", brand: "Atomic", price: 650, gender: ["m"], ability: ["intermediate", "advanced"], terrain: ["park", "moguls"], style: ["street"], colors: ["olive"], tier: "value", image: "/gear/sm11.jpg" },
    { id: "sm14", name: "Bent 90 (26/27)", brand: "Atomic", price: 620, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sky"], tier: "value", image: "/gear/sm14.jpg" },
    { id: "sm17", name: "ARV 88 - Black (26/27)", brand: "Armada", price: 420, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value", image: "/gear/sm17.jpg" },
    { id: "sm18", name: "ARV 106 Ti (26/27)", brand: "Armada", price: 560, gender: ["m"], ability: ["advanced", "expert"], terrain: ["powder", "groomed"], style: ["freeride", "street"], colors: ["sand"], tier: "value", image: "/gear/sm18.jpg" },
    { id: "sm19", name: "Prodigy 1 (26/27)", brand: "Faction", price: 629, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black", "magenta"], tier: "value", image: "https://cdn.shopify.com/s/files/1/2258/9075/files/Faction-Skis-2526-Prodigy-1-Topsheet-1x1.jpg?v=1750405167" },
    { id: "sm24", name: "Prodigy 1 Capsule (26/27)", brand: "Faction", price: 649, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["cream"], tier: "value", image: "https://cdn.shopify.com/s/files/1/2258/9075/files/Faction-Skis-2526-Prodigy-1-Capsule-Topsheet-1x1.jpg?v=1750406448" },
    { id: "sm20", name: "Prodigy 3 (26/27)", brand: "Faction", price: 679, gender: ["m"], ability: ["intermediate", "advanced", "expert"], terrain: ["groomed", "powder"], style: ["freeride", "street"], colors: ["black", "purple"], tier: "mid", image: "https://cdn.shopify.com/s/files/1/2258/9075/files/Faction-Skis-2526-Prodigy-3-Topsheet-1x1.jpg?v=1750405805" },
    { id: "sm12", name: "Dancer 79 (26/27)", brand: "Faction", price: 750, gender: ["m"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["white"], tier: "premium", image: "https://cdn.shopify.com/s/files/1/2258/9075/files/Faction-Skis-2526-Dancer-79-White-Topsheet-1x1.jpg?v=1750775787" },
    { id: "sm13", name: "Mindbender 90 (26/27)", brand: "K2", price: 700, gender: ["m"], ability: ["intermediate", "advanced"], terrain: ["powder", "groomed"], style: ["freeride", "classic"], colors: ["olive", "navy"], tier: "mid", image: "https://cdn.media.amplience.net/s/k2/k2_2627_mindbender-90_KS261793-KS261794?w=1200&qlt=90&fmt=auto" },
    { id: "sm15", name: "Redster S9 (26/27)", brand: "Atomic", price: 950, gender: ["m"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race"], colors: ["red"], tier: "premium", image: "/gear/sm15.jpg" },
    { id: "sm16", name: "Redster G9 (26/27)", brand: "Atomic", price: 900, gender: ["m"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["red"], tier: "premium", image: "/gear/sm16.jpg" },
    { id: "sm25", name: "RC4 Worldcup SL (26/27)", brand: "Fischer", price: 1150, gender: ["m"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race"], colors: ["lime", "black"], tier: "premium", image: "https://www.fischersports.com/media/1280x1706/ff/ae/a9/1783392732/a04026_rc4_noize_sl_01.png" },
    { id: "sm26", name: "RC4 Worldcup GS (26/27)", brand: "Fischer", price: 1200, gender: ["m"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race"], colors: ["lime"], tier: "premium", image: "https://www.fischersports.com/media/1620x2160/79/46/db/1726236335/a02023_rc4_wc_gs_men_01.png" },
    { id: "sm27", name: "The Curv GT (26/27)", brand: "Fischer", price: 780, gender: ["m"], ability: ["intermediate", "advanced"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["navy"], tier: "mid", image: "https://www.fischersports.com/media/1620x2160/90/68/be/1776869205/p09326_the_curv_gt_80_01.png" },
    { id: "sw1", name: "Experience W 82 (26/27)", brand: "Rossignol", price: 600, gender: ["w"], ability: ["beginner", "intermediate"], terrain: ["groomed"], style: ["classic"], colors: ["cream", "blush"], tier: "value", image: "https://www.rossignol.com/dw/image/v2/BJJZ_PRD/on/demandware.static/-/Sites-rossignol-catalog/default/dwca042f63/images/large/RAKFS01_EXPERIENCE_W_82_BASALT_XPRESS_rgb72dpi_00.jpg?sw=800" },
    { id: "sw2", name: "Santa Ana 97 (26/27)", brand: "Nordica", price: 780, gender: ["w"], ability: ["intermediate", "advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["coral", "navy"], tier: "premium", image: "https://www.nordica.com/storage/Product/0A548600001_SANTA_ANA_97_FLAT.png" },
    { id: "sw3", name: "ARW 94 (26/27)", brand: "Armada", price: 600, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "moguls"], style: ["street"], colors: ["black", "cream"], tier: "value", image: "/gear/sw3.jpg" },
    { id: "sw4", name: "Dancer 2X (26/27)", brand: "Faction", price: 649, gender: ["w"], ability: ["intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["lavender", "purple"], tier: "value", image: "https://cdn.shopify.com/s/files/1/2258/9075/files/Faction-Skis-2526-Dancer-2-Purple-Topsheet-1x1.jpg?v=1756474724" },
    { id: "sw5", name: "Maven 93 C (26/27)", brand: "Atomic", price: 700, gender: ["w"], ability: ["intermediate", "advanced"], terrain: ["powder", "groomed"], style: ["freeride", "classic"], colors: ["white", "slate"], tier: "mid", image: "/gear/sw5.jpg" },
    { id: "sw6", name: "Pandora 92 (26/27)", brand: "Line", price: 720, gender: ["w"], ability: ["intermediate", "advanced"], terrain: ["powder", "park"], style: ["street", "freeride"], colors: ["black"], tier: "mid", image: "https://cdn.media.amplience.net/s/lineskis/line_2627_pandora-92_LN261765?w=1200&qlt=90&fmt=auto" },
    { id: "sw7", name: "Sheeva 10 (26/27)", brand: "Blizzard", price: 800, gender: ["w"], ability: ["advanced", "expert"], terrain: ["powder", "moguls"], style: ["freeride"], colors: ["magenta", "purple"], tier: "premium", image: "https://www.blizzard-tecnica.com/storage/Product/8A536600-001_SHEEVA_10_flat_01.png" },
    { id: "sw8", name: "M7 Mantra W (26/27)", brand: "Völkl", price: 875, gender: ["w"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["mint", "magenta"], tier: "premium", image: "https://cdn.media.amplience.net/s/k2skis/volkl_2627_m7-mantra-w_V2610116?w=1200&qlt=90&fmt=auto" },
    { id: "sw10", name: "Antimatter 88 (26/27)", brand: "Armada", price: 780, gender: ["w"], ability: ["advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["teal"], tier: "premium", image: "/gear/sw10.jpg" },
    { id: "sw11", name: "Dancer 79 (26/27)", brand: "Faction", price: 720, gender: ["w"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["white"], tier: "premium", image: "https://cdn.shopify.com/s/files/1/2258/9075/files/Faction-Skis-2526-Dancer-79-White-Topsheet-1x1.jpg?v=1750775787" },
    { id: "sw12", name: "Bent 90 (26/27)", brand: "Atomic", price: 620, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sky"], tier: "value", image: "/gear/sm14.jpg" },
    { id: "sw13", name: "Prodigy 2 Capsule (26/27)", brand: "Faction", price: 649, gender: ["w"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["cream", "red"], tier: "value", image: "https://cdn.shopify.com/s/files/1/2258/9075/files/Faction-Skis-2526-Prodigy-2-Capsule-Topsheet-1x1.jpg?v=1750406708" },
    { id: "sw14", name: "Redster S9 (26/27)", brand: "Atomic", price: 950, gender: ["w"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race"], colors: ["red"], tier: "premium", image: "/gear/sm15.jpg" },
    { id: "sw15", name: "Redster G9 (26/27)", brand: "Atomic", price: 900, gender: ["w"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["red"], tier: "premium", image: "/gear/sm16.jpg" },
    { id: "sw16", name: "ARW 88 - Black (26/27)", brand: "Armada", price: 420, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black", "purple"], tier: "value", image: "/gear/sw16.jpg" },
    { id: "sw17", name: "ARW 100 (26/27)", brand: "Armada", price: 550, gender: ["w"], ability: ["advanced", "expert"], terrain: ["powder", "groomed"], style: ["freeride", "street"], colors: ["black", "coral"], tier: "value", image: "/gear/sw17.jpg" },
    { id: "sw18", name: "Prodigy 1 (26/27)", brand: "Faction", price: 629, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black", "magenta"], tier: "value", image: "https://cdn.shopify.com/s/files/1/2258/9075/files/Faction-Skis-2526-Prodigy-1-Topsheet-1x1.jpg?v=1750405167" },
    { id: "sw19", name: "Prodigy 3 (26/27)", brand: "Faction", price: 679, gender: ["w"], ability: ["intermediate", "advanced", "expert"], terrain: ["groomed", "powder"], style: ["freeride", "street"], colors: ["black", "purple"], tier: "mid", image: "https://cdn.shopify.com/s/files/1/2258/9075/files/Faction-Skis-2526-Prodigy-3-Topsheet-1x1.jpg?v=1750405805" },
    { id: "sw20", name: "RC4 Worldcup SL Women (26/27)", brand: "Fischer", price: 1100, gender: ["w"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race"], colors: ["lime", "black"], tier: "premium", image: "https://www.fischersports.com/media/1280x1706/7a/ce/d4/1783392734/a04626_rc4_noize_sl_01.png" },
    { id: "sw21", name: "RC4 Worldcup GS Women (26/27)", brand: "Fischer", price: 1150, gender: ["w"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race"], colors: ["lime"], tier: "premium", image: "https://www.fischersports.com/media/1620x2160/1d/e9/30/1726236336/a03023_rc4_wc_gs_women_01.png" },
    { id: "sw22", name: "The Curv GT (26/27)", brand: "Fischer", price: 750, gender: ["w"], ability: ["intermediate", "advanced"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["navy"], tier: "mid", image: "https://www.fischersports.com/media/1620x2160/90/68/be/1776869205/p09326_the_curv_gt_80_01.png" },
  ],
  jacket: [
    { id: "jm3", name: "Twin Line 30K Snow Jacket — Olive Beige", brand: "Ninety Roll", price: 180, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["olive", "sand"], tier: "value", fit: "baggy", shell: true, image: "https://ninetyroll.co/wp-content/uploads/2025/08/B05A0168-819x1024.jpg" },
    { id: "jm4", name: "Fullzip 2L Snow Jacket", brand: "Beyond Medals", price: 290, gender: ["m"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "powder"], style: ["street", "retro"], colors: ["black"], tier: "mid", fit: "baggy", shell: true, image: "https://beyondmedals.centracdn.net/client/dynamic/images/593_bd93c29c21-bmaw25-flat-fullzip-jacket-black-web.jpg" },
    { id: "jm20", name: "Baggy Waterproof Snow Jacket", brand: "GSOU SNOW", price: 170, gender: ["m"], ability: ["beginner", "intermediate", "advanced", "expert"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2727-BLK_M_01.jpg?width=800" },
    { id: "jm23", name: "Purple Waterproof Snow Jacket", brand: "GSOU SNOW", price: 170, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["purple"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2727-PRP_M_01.jpg?width=800" },
    { id: "jm24", name: "Twin Line 30K Snow Jacket — Frost Purple", brand: "Ninety Roll", price: 180, gender: ["m"], ability: ["intermediate", "advanced"], terrain: ["park", "powder"], style: ["street"], colors: ["lavender"], tier: "value", fit: "baggy", shell: true, image: "https://ninetyroll.co/wp-content/uploads/2025/12/B05A0130-819x1024.jpg" },
    { id: "jm21", name: "Off White Minimal Multi-Pocket Snow Jacket", brand: "GSOU SNOW", price: 148, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "powder"], style: ["street", "retro"], colors: ["white"], tier: "mid", fit: "baggy", shell: false, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2664-BCE_M_01.jpg?width=800" },
    { id: "jm22", name: "Army Green Insulated Snow Jacket", brand: "GSOU SNOW", price: 190, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["forest"], tier: "value", fit: "baggy", shell: false, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2689-ARG_M_01.jpg?width=800" },
    { id: "jm11", name: "Sabre Insulated Jacket (26/27)", brand: "Arc'teryx", price: 650, gender: ["m"], ability: ["advanced", "expert"], terrain: ["backcountry", "powder"], style: ["freeride"], colors: ["black"], tier: "premium", fit: "regular", shell: true, image: "https://images-dynamic-arcteryx.imgix.net/details/1350x1710/F25-X000009913-Sabre-Insulated-Jacket-Black-Front-View.jpg" },
    { id: "jw3", name: "Twin Line 30K Snow Jacket — Stone White", brand: "Ninety Roll", price: 180, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["cream"], tier: "value", fit: "baggy", shell: true, image: "https://ninetyroll.co/wp-content/uploads/2026/07/B05A0088-819x1024.jpg" },
    { id: "jw4", name: "Fullzip 2L Snow Jacket", brand: "Beyond Medals", price: 290, gender: ["w"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "powder"], style: ["street", "retro"], colors: ["black"], tier: "mid", fit: "baggy", shell: true, image: "https://beyondmedals.centracdn.net/client/dynamic/images/593_bd93c29c21-bmaw25-flat-fullzip-jacket-black-web.jpg" },
    { id: "jw20", name: "Baggy Snowboard Jacket", brand: "GSOU SNOW", price: 170, gender: ["w"], ability: ["beginner", "intermediate", "advanced", "expert"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2727-BLK_F_01.jpg?width=800" },
    { id: "jw23", name: "Purple Waterproof Snow Jacket", brand: "GSOU SNOW", price: 170, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["purple"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2727-PRP_F_01.jpg?width=800" },
    { id: "jw24", name: "Twin Line 30K Snow Jacket — Pink Black", brand: "Ninety Roll", price: 180, gender: ["w"], ability: ["intermediate", "advanced"], terrain: ["park", "powder"], style: ["street"], colors: ["blush", "black"], tier: "value", fit: "baggy", shell: true, image: "https://ninetyroll.co/wp-content/uploads/2026/07/1-819x1024.jpg" },
    { id: "jw21", name: "Off White Minimal Multi-Pocket Snow Jacket", brand: "GSOU SNOW", price: 148, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "powder"], style: ["street", "retro"], colors: ["white"], tier: "mid", fit: "baggy", shell: false, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2664-BCE_F_01.jpg?width=800" },
    { id: "jw22", name: "Army Green Insulated Snow Jacket", brand: "GSOU SNOW", price: 190, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["forest"], tier: "value", fit: "baggy", shell: false, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2608-ARG_F_01.jpg?width=800" },
    { id: "jw11", name: "Reserve 3L Jacket", brand: "Burton", price: 370, gender: ["w"], ability: ["advanced", "expert"], terrain: ["backcountry", "powder"], style: ["freeride"], colors: ["sky"], tier: "premium", fit: "regular", shell: true, image: "https://cdn.shopify.com/s/files/1/0804/4062/3361/files/3065210ASH_4.webp?width=800" },
    { id: "jw10", name: "Sentinel Insulated Jacket (26/27)", brand: "Arc'teryx", price: 650, gender: ["w"], ability: ["advanced", "expert"], terrain: ["backcountry", "powder"], style: ["freeride"], colors: ["black"], tier: "premium", fit: "regular", shell: true, image: "https://images-dynamic-arcteryx.imgix.net/details/1350x1710/F25-X000010538-Sentinel-Insulated-Jacket-Black-Women-s-Front-View.jpg" },
    { id: "jtb1", name: "Mach 2 Shell", brand: "Trashbags", price: 205, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced", "expert"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "mid", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/0561/9282/7494/files/IMG_3400.png?v=1743442493" },
    { id: "jbr1", name: "Briqed Jacket", brand: "Briqed", price: 110, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/0979/7835/1748/files/1brqied_-_Edited.png?width=800" },
    { id: "jf1", name: "Dark Grey & Black Monochrome Colorblock Insulated Snow Jacket", brand: "GSOU SNOW", price: 158, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["charcoal"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2688-BLK_GRY_M_01.jpg?width=800" },
    { id: "jf2", name: "Dark Grey & Black Monochrome Colorblock Insulated Snow Jacket", brand: "GSOU SNOW", price: 158, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["charcoal"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2688-BLK_GRY_F_01.jpg?width=800" },
    { id: "jf3", name: "Light Gray Reflective Side-Piping Insulated Snow Jacket", brand: "GSOU SNOW", price: 158, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["slate"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2692-GREY_M_01.jpg?width=800" },
    { id: "jf4", name: "Light Gray Retro Track Stripe Reflective Snow Jacket", brand: "GSOU SNOW", price: 158, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["slate"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-WJK2720-GREY_F_01.jpg?width=800" },
    { id: "jf5", name: "Navy Retro Track Chevron Stripe Snow Jacket", brand: "GSOU SNOW", price: 154, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["navy"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2619-191_M_01.jpg?width=800" },
    { id: "jf6", name: "Navy Retro Track Chevron Stripe Snow Jacket", brand: "GSOU SNOW", price: 154, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["navy"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2619-191_F_K_1.jpg?width=800" },
    { id: "jf7", name: "Color-Block Dark Olive & Black Corduroy Snow Jacket", brand: "GSOU SNOW", price: 156, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["olive"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2658-582_M_01.jpg?width=800" },
    { id: "jf8", name: "Color-Block Dark Olive & Black Corduroy Snow Jacket", brand: "GSOU SNOW", price: 156, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["olive"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2658-582_F_01.jpg?width=800" },
    { id: "jf11", name: "Twin Line 30K Snow Jacket — Brown Beige", brand: "Ninety Roll", price: 180, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sand"], tier: "value", fit: "baggy", shell: true, image: "https://ninetyroll.co/wp-content/uploads/2026/01/Image_20260102155217_1625_73.jpg" },
    { id: "jf12", name: "Twin Line 30K Snow Jacket — Grey Black", brand: "Ninety Roll", price: 180, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["slate", "black"], tier: "value", fit: "baggy", shell: true, image: "https://ninetyroll.co/wp-content/uploads/2025/08/B05A0130-819x1024.jpg" },
    { id: "jf13", name: "Sky Blue Snow Jacket", brand: "Solo Apparel", price: 150, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sky"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/0614/8276/2288/files/FullSizeRender_dcbac7db-af64-4d11-9842-3f1c030c230b.jpg?width=800" },
    { id: "jf14", name: "Sky Blue Snow Jacket", brand: "Solo Apparel", price: 150, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sky"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/0614/8276/2288/files/FullSizeRender_dcbac7db-af64-4d11-9842-3f1c030c230b.jpg?width=800" },
    { id: "jf15", name: "Pink Alpine Shield 3L Utility Insulated Ski Jacket", brand: "GSOU SNOW", price: 259, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["blush"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2726-PNK_M_01.jpg?width=800" },
    { id: "jf16", name: "Pink Recycled Minimalist Insulated Snow Jacket", brand: "GSOU SNOW", price: 158, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["blush"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-WJK2690-PNK_F_K_1.jpg?width=800" },
    { id: "jf27", name: "Twin Line 30K Snow Jacket — Red Grey", brand: "Ninety Roll", price: 180, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["red", "slate"], tier: "value", fit: "baggy", shell: true, image: "https://ninetyroll.co/wp-content/uploads/2025/12/B05A0168-819x1024.jpg" },
    { id: "jf28", name: "Twin Line 30K Snow Jacket — Arctic Blue", brand: "Ninety Roll", price: 180, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sky"], tier: "value", fit: "baggy", shell: true, image: "https://ninetyroll.co/wp-content/uploads/2026/07/B05A8051-819x1024.jpg" },
    { id: "jf29", name: "Oat Milk Eco Utility Insulated Snow Jacket", brand: "GSOU SNOW", price: 158, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["cream"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2699-BCE_M_01.jpg?width=800" },
    { id: "jf30", name: "Oat Milk Eco Utility Insulated Snow Jacket", brand: "GSOU SNOW", price: 158, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["cream"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2699-BCE_F_01.jpg?width=800" },
    { id: "jf31", name: "Light Gray Alpine Shield 3L Essential Insulated Ski Jacket", brand: "GSOU SNOW", price: 259, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["silver"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2728-GREY_M_01.jpg?width=800" },
    { id: "jf32", name: "Light Gray Side-Panel Reflective Insulated Snow Jacket", brand: "GSOU SNOW", price: 158, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["silver"], tier: "value", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UJK2718-GREY_F_01.jpg?width=800" },
    { id: "jf39", name: "Twin Line 30K Snow Jacket — White Blue", brand: "Ninety Roll", price: 180, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["white", "cobalt"], tier: "value", fit: "baggy", shell: true, image: "https://ninetyroll.co/wp-content/uploads/2025/08/B05A0088-819x1024.jpg" },
    { id: "jf210", name: "Twin Line 30K Snow Jacket — Black Green", brand: "Ninety Roll", price: 180, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black", "forest"], tier: "value", fit: "baggy", shell: true, image: "https://ninetyroll.co/wp-content/uploads/2026/01/B05A0168-1-819x1024.jpg" },
    { id: "jn1", name: "Mobbin Jacket — Merlot", brand: "Yuki Threads", price: 400, gender: ["m", "w"], ability: ["intermediate","advanced","expert"], terrain: ["park","groomed"], style: ["street","freeride"], colors: ["burgundy"], tier: "premium", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/0388/9917/files/W26MJMRL_3210.jpg?v=1778553214" },
    { id: "jn2", name: "SP Overhead Anorak — Mint", brand: "OOSC", price: 200, gender: ["m", "w"], ability: ["beginner","intermediate","advanced"], terrain: ["park","groomed"], style: ["street","retro"], colors: ["mint"], tier: "mid", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/0659/5228/4895/files/oosc-sp-overhead-mint-734825.jpg?v=1775634509" },
    { id: "jn3", name: "Dune Snowboard Jacket — Cobalt", brand: "Montec", price: 125, gender: ["m"], ability: ["beginner","intermediate","advanced"], terrain: ["park","groomed","powder"], style: ["street","freeride"], colors: ["cobalt"], tier: "value", fit: "baggy", shell: false, image: "https://www.montecwear.com/images/H2047_01_JNJDFuD.jpg" },
    { id: "jn4", name: "Genki Jacket — Deep Teal", brand: "Yuki Threads", price: 430, gender: ["m", "w"], ability: ["intermediate","advanced","expert"], terrain: ["park","groomed"], style: ["street","freeride"], colors: ["teal"], tier: "premium", fit: "baggy", shell: true, image: "https://cdn.shopify.com/s/files/1/0388/9917/files/G25GJDTL_1033.jpg?v=1763772758" },
    { id: "jn5", name: "GORE-TEX Fragment Shell Anorak — Dusty Lime", brand: "686", price: 210, gender: ["m"], ability: ["advanced","expert"], terrain: ["backcountry","groomed"], style: ["freeride","classic"], colors: ["lime"], tier: "mid", fit: "regular", shell: true, image: "https://cdn.shopify.com/s/files/1/1343/2655/files/M5WN163_DUSTY-LIME_1.jpg?v=1757353864" },
    { id: "jn6", name: "Sublime Shell Anorak — Yellow Tie Dye", brand: "686", price: 180, gender: ["w"], ability: ["beginner","intermediate","advanced"], terrain: ["park","groomed"], style: ["street","retro"], colors: ["yellow"], tier: "mid", fit: "regular", shell: true, image: "https://cdn.shopify.com/s/files/1/1343/2655/files/M5WN338_SUBLIME-YELLOW-TIE-DYE_1.jpg?v=1757353776" },
    { id: "jn7", name: "Hydra Thermagraph Jacket — Yellow Gold", brand: "686", price: 300, gender: ["m"], ability: ["intermediate","advanced"], terrain: ["groomed","powder"], style: ["freeride","classic"], colors: ["yellow"], tier: "mid", fit: "regular", shell: false, image: "https://cdn.shopify.com/s/files/1/1343/2655/files/M5WN149_YELLOW-GOLD_2.jpg?v=1757353694" },
    { id: "jn8", name: "Hot Pink Two-Tone Insulated Snow Jacket", brand: "GSOU SNOW", price: 156, gender: ["w"], ability: ["beginner","intermediate","advanced"], terrain: ["park","groomed"], style: ["street"], colors: ["magenta"], tier: "value", fit: "baggy", shell: false, image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-WJK2632-ROS_F_01.jpg?v=1777441493" },
    { id: "jn9", name: "Cypress Jacket — Nai Aqua", brand: "Airblaster", price: 182, gender: ["w"], ability: ["beginner","intermediate","advanced"], terrain: ["park","groomed"], style: ["street","retro"], colors: ["turquoise"], tier: "value", fit: "regular", shell: true, image: "https://cdn.shopify.com/s/files/1/0236/7291/files/CYPRESS_JACKET_NAI_AQUA_2526.jpg?v=1759961239" },
    { id: "jn10", name: "Yeh Man Jacket — Aqua", brand: "OOSC", price: 300, gender: ["m"], ability: ["intermediate","advanced"], terrain: ["park","groomed"], style: ["street","retro"], colors: ["turquoise"], tier: "mid", fit: "regular", shell: true, image: "https://cdn.shopify.com/s/files/1/0659/5228/4895/files/yeh-man-jacket-aqua-7592939.jpg?v=1775657233" },
    { id: "jt1", name: "Domino GORE-TEX 3L Jacket", brand: "Flylow", price: 650, gender: ["w"], ability: ["advanced","expert"], terrain: ["backcountry", "powder"], style: ["classic", "freeride"], colors: ["lavender"], tier: "premium", fit: "regular", shell: true, image: "https://cdn.shopify.com/s/files/1/1001/9644/files/F25_Domino-Gore-Tex-3L-Jacket_Aurora_A.jpg?v=1756961974" },
    { id: "jt2", name: "Kane Jacket", brand: "Flylow", price: 336, gender: ["m"], ability: ["advanced","expert"], terrain: ["backcountry", "powder"], style: ["race", "classic"], colors: ["red", "burgundy"], tier: "premium", fit: "slim", shell: true, image: "https://cdn.shopify.com/s/files/1/1001/9644/files/F25_Kane-Jacket_Amaro-Magma_A.jpg?v=1756962565" },
    { id: "jt3", name: "Quantum Pro Jacket", brand: "Flylow", price: 308, gender: ["m"], ability: ["advanced","expert"], terrain: ["backcountry", "powder"], style: ["classic", "freeride"], colors: ["olive", "black"], tier: "premium", fit: "regular", shell: true, image: "https://cdn.shopify.com/s/files/1/1001/9644/files/F25_Quantum-Pro-Jacket_Black-Rye_A.jpg?v=1757166049" },
    { id: "jt4", name: "Stella Jacket PRIMO", brand: "Trew Gear", price: 279, gender: ["w"], ability: ["intermediate","advanced","expert"], terrain: ["powder", "backcountry"], style: ["classic", "freeride"], colors: ["navy", "lavender"], tier: "mid", fit: "regular", shell: true, image: "https://cdn.shopify.com/s/files/1/1909/3137/files/251023_W26_TREW_PRIMO_W_STELLA_JKT_EXPEDITION_INDIGO_0544_7ff823d3-92ff-43ff-aa0a-8a379a17f30c.jpg?v=1761761099" },
    { id: "jt5", name: "Cosmic Jacket PRIMO", brand: "Trew Gear", price: 279, gender: ["m"], ability: ["intermediate","advanced","expert"], terrain: ["powder", "groomed"], style: ["retro", "classic"], colors: ["yellow"], tier: "mid", fit: "regular", shell: true, image: "https://cdn.shopify.com/s/files/1/1909/3137/files/251023_W26_TREW_PRIMO_M_COSMIC_JKT_MTN_MAIZE_3553.jpg?v=1761761752" },
    { id: "jt6", name: "Capow Jacket", brand: "Trew Gear", price: 259, gender: ["m", "w"], ability: ["intermediate","advanced","expert"], terrain: ["backcountry", "powder"], style: ["retro", "freeride"], colors: ["yellow", "navy"], tier: "mid", fit: "regular", shell: true, image: "https://cdn.shopify.com/s/files/1/1909/3137/files/240102_W24_TREW_W_CAPOW_JKT_WILLOW_BLK_1601.jpg?v=1746460174" },
    { id: "jt7", name: "Recon Stretch Shell", brand: "Black Diamond", price: 499, gender: ["m"], ability: ["advanced","expert"], terrain: ["backcountry", "ice"], style: ["classic", "freeride"], colors: ["slate"], tier: "premium", fit: "regular", shell: true, image: "https://cdn.shopify.com/s/files/1/0880/2195/8973/files/745046_4034_M_Recon_Stretch_Shell_Midnight_Blue_03.jpg?v=1785190010" },
    { id: "jt8", name: "Mission Alpine Shell", brand: "Black Diamond", price: 749, gender: ["w"], ability: ["advanced","expert"], terrain: ["backcountry", "ice"], style: ["classic", "race"], colors: ["forest", "charcoal"], tier: "premium", fit: "regular", shell: true, image: "https://cdn.shopify.com/s/files/1/0880/2195/8973/files/745056_9777_W_Mission_Alpine_Shell_Black-Laurel_Green_03.jpg?v=1785270689" },
    { id: "jt9", name: "Mission Alpine Shell", brand: "Black Diamond", price: 749, gender: ["m"], ability: ["advanced","expert"], terrain: ["backcountry", "ice"], style: ["classic", "race"], colors: ["black", "charcoal"], tier: "premium", fit: "regular", shell: true, image: "https://cdn.shopify.com/s/files/1/0880/2195/8973/files/745055_0002_M_Mission_Alpine_Shell_Black_03.jpg?v=1781732403" },
    { id: "jt10", name: "Reserve GORE-TEX 2L Jacket", brand: "Burton", price: 420, gender: ["w"], ability: ["advanced","expert"], terrain: ["groomed", "powder"], style: ["classic"], colors: ["black"], tier: "premium", fit: "regular", shell: true, image: "https://cdn.shopify.com/s/files/1/0804/4062/3361/files/3024210A04_4.webp?v=1785176473" },
    { id: "jt11", name: "Reserve 2.5L Jacket", brand: "Burton", price: 210, gender: ["m"], ability: ["intermediate","advanced","expert"], terrain: ["groomed", "powder"], style: ["classic", "race"], colors: ["teal"], tier: "mid", fit: "regular", shell: true, image: "https://cdn.shopify.com/s/files/1/0804/4062/3361/files/3098210E9K_4.webp?v=1779759546" },
    { id: "jt12", name: "Reserve 2L Insulated Jacket", brand: "Burton", price: 290, gender: ["m"], ability: ["intermediate","advanced","expert"], terrain: ["groomed", "powder"], style: ["classic", "retro"], colors: ["sand"], tier: "mid", fit: "regular", shell: false, image: "https://cdn.shopify.com/s/files/1/0804/4062/3361/files/3025310AH2_4.webp?v=1785176433" },
    { id: "jt13", name: "Objective Pro Jacket", brand: "Stio", price: 799, gender: ["m"], ability: ["advanced","expert"], terrain: ["backcountry", "ice"], style: ["race", "classic"], colors: ["forest"], tier: "premium", fit: "slim", shell: true, image: "https://cdn.shopify.com/s/files/1/0023/9901/0881/files/200785-301_6347e150-a214-42d2-ab11-b46137057a69.jpg?v=1759432104" },
    { id: "jt14", name: "Fernos Insulated Hooded Jacket", brand: "Stio", price: 299, gender: ["w"], ability: ["intermediate","advanced","expert"], terrain: ["backcountry", "groomed"], style: ["classic", "retro"], colors: ["lime"], tier: "mid", fit: "slim", shell: false, image: "https://cdn.shopify.com/s/files/1/0023/9901/0881/files/100330-310_2c610c07-0b7b-4596-ad75-ad7b5e14e7ca.jpg?v=1786652017" },
    { id: "jp1", name: "Kiroro NetPlus 2L Jacket", brand: "Oyuki", price: 400, gender: ["w"], ability: ["intermediate","advanced","expert"], terrain: ["powder", "backcountry"], style: ["freeride", "street"], colors: ["sky", "sand"], tier: "premium", fit: "baggy", shell: true, image: "https://oyuki.com/wp-content/uploads/2025/09/Kiroro-NetPlus%C2%AE-2L-Jacket_0000s_0009_EB-261437-1013_Oyuki_Winter-2026_Kiroro-Netplus-2L-Jacket_Womens_Glacier-Tottori_PS.png" },
    { id: "jp2", name: "Moiwa NetPlus 2L Jacket", brand: "Oyuki", price: 400, gender: ["m"], ability: ["intermediate","advanced","expert"], terrain: ["powder", "backcountry"], style: ["freeride", "street"], colors: ["forest", "black"], tier: "premium", fit: "baggy", shell: true, image: "https://oyuki.com/wp-content/uploads/2025/09/Moiwa-NetPlus%C2%AE-2L-Jacket_0029_EB-261433-1008_Oyuki_Winter-2026_Moiwa-Netplus-2L-Jacket_Mens_Deep-Forest-Bamboo-Black_PS-.png" },
    { id: "jp3", name: "Toya Down NetPlus Insulator Jacket", brand: "Oyuki", price: 290, gender: ["m", "w"], ability: ["beginner","intermediate","advanced"], terrain: ["powder", "groomed"], style: ["freeride", "classic"], colors: ["sand", "black"], tier: "mid", fit: "regular", shell: false, image: "https://oyuki.com/wp-content/uploads/2025/09/INSULATORS_MIDLAYERS_0059_EB-261471-1008_Oyuki_Winter-2026_Toya-Down-Netplus-Insulator-Jacket_Unisex_Tottori-Black_PS-20.png" },
    { id: "jp4", name: "Burnout Anorak", brand: "686", price: 90, gender: ["m"], ability: ["beginner","intermediate","advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black", "forest"], tier: "value", fit: "regular", shell: true, image: "https://cdn.shopify.com/s/files/1/1343/2655/files/EEZU260700_BLACK_1_2db6d034-89ca-4f7b-aac8-cf952bb306f2.jpg?v=1784244056" },
    { id: "jp5", name: "GORE-TEX Willow Insulated Jacket", brand: "686", price: 380, gender: ["w"], ability: ["intermediate","advanced","expert"], terrain: ["groomed", "powder"], style: ["classic", "freeride"], colors: ["black", "sand"], tier: "premium", fit: "regular", shell: false, image: "https://cdn.shopify.com/s/files/1/1343/2655/files/M5WN335_BLACK_1.jpg?v=1757353781" },
    { id: "jp6", name: "Outpost Sherpa Jacket", brand: "686", price: 160, gender: ["w"], ability: ["beginner","intermediate","advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["black", "white"], tier: "value", fit: "regular", shell: false, image: "https://cdn.shopify.com/s/files/1/1343/2655/files/M4WNFLC306_BLACK-VAPORS_1_8f0aef74-5d5b-4403-821f-7877a53ed038.jpg?v=1757353954" },
    { id: "jp7", name: "Street Jacket", brand: "Yuki Threads", price: 440, gender: ["m", "w"], ability: ["intermediate","advanced","expert"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "premium", fit: "regular", shell: false, image: "https://cdn.shopify.com/s/files/1/0388/9917/files/W26SJBLK_1657_1833621a-9182-42f5-a2a2-2c328b2723d3.jpg?v=1778559745" },
    { id: "jp8", name: "Slack Country Jacket", brand: "Yuki Threads", price: 600, gender: ["m", "w"], ability: ["intermediate","advanced","expert"], terrain: ["backcountry", "powder"], style: ["freeride"], colors: ["olive", "lime"], tier: "premium", fit: "regular", shell: true, image: "https://cdn.shopify.com/s/files/1/0388/9917/files/G25SCJRFG_1418.jpg?v=1764043628" },
    { id: "jp9", name: "Brush Quilted Jacket — Moss", brand: "Bloom Outerwear", price: 275, gender: ["m"], ability: ["beginner","intermediate","advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["olive", "sand"], tier: "mid", fit: "regular", shell: false, image: "https://cdn.shopify.com/s/files/1/0286/4014/files/insulated-mens-green-ski-jacket.jpg?v=1763696414" },
    { id: "jp10", name: "Brush Quilted Jacket — Tan", brand: "Bloom Outerwear", price: 275, gender: ["m"], ability: ["beginner","intermediate","advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sand"], tier: "mid", fit: "regular", shell: false, image: "https://cdn.shopify.com/s/files/1/0286/4014/files/cool-quilted-ski-jacket-tan.webp?v=1763702841" },
    { id: "jp11", name: "Brush Quilted Jacket — Charcoal", brand: "Bloom Outerwear", price: 275, gender: ["m"], ability: ["beginner","intermediate","advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["charcoal"], tier: "mid", fit: "regular", shell: false, image: "https://cdn.shopify.com/s/files/1/0286/4014/files/quilted-ski-jacket-gray.jpg?v=1766465565" },
  ],
  pants: [
    { id: "pm3", name: "Downtown Pro 30K Snow Pants — Cobalt Blue", brand: "Ninety Roll", price: 170, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["cobalt"], tier: "value", fit: "baggy", image: "https://ninetyroll.co/wp-content/uploads/2024/05/4W2A2753-819x1024.jpg" },
    { id: "pm4", name: "Downtown Pro 30K Snow Pants — Stone White", brand: "Ninety Roll", price: 200, gender: ["m"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "moguls"], style: ["street", "retro"], colors: ["cream"], tier: "mid", fit: "baggy", image: "https://ninetyroll.co/wp-content/uploads/2024/05/4W2A2783-3-819x1024.jpg" },
    { id: "pm5", name: "Frostline Baggy Snow Pants", brand: "Polar Pursuit", price: 192, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "powder"], style: ["street"], colors: ["black"], tier: "mid", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0588/4084/2339/files/DSC04835-Edit_2_109a5ef1-ba57-4bcb-8f3c-3fb1ad820ddd.jpg?v=1769814690" },
    { id: "pm6", name: "Baggy Wear-Resistant Snow Pants", brand: "GSOU SNOW", price: 130, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["forest"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UPT2511-ARG_M_01.jpg?width=800" },
    { id: "pm22", name: "Army Green Insulated Baggy Snow Pants", brand: "GSOU SNOW", price: 150, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["forest", "black"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UPT2684-ARG_M_01.jpg?width=800" },
    { id: "pm7", name: "Nostalgia Pants 2L", brand: "Beyond Medals", price: 260, gender: ["m"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "powder"], style: ["street", "retro"], colors: ["forest", "black"], tier: "mid", fit: "baggy", image: "https://beyondmedals.centracdn.net/client/dynamic/images/586_6106875a1a-bmaw25-flat-nostalgia-pants-green-web.jpg" },
    { id: "pw3", name: "Pinnacle Cargo 30K Snow Pants — Arctic Blue", brand: "Ninety Roll", price: 170, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sky"], tier: "value", fit: "baggy", image: "https://ninetyroll.co/wp-content/uploads/2025/03/%E8%93%9D-2-819x1024.jpg" },
    { id: "pw4", name: "Downtown Embroidery 30K Snow Pants — True White", brand: "Ninety Roll", price: 200, gender: ["w"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "moguls"], style: ["street", "retro"], colors: ["white"], tier: "mid", fit: "baggy", image: "https://ninetyroll.co/wp-content/uploads/2026/01/WX7_6303-819x1024.jpg" },
    { id: "pw5", name: "Frostline Baggy Snow Pants", brand: "Polar Pursuit", price: 192, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "powder"], style: ["street"], colors: ["black"], tier: "mid", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0588/4084/2339/files/DSC05162_8ca5739e-44e2-42b0-b452-c78a0889dc7a.jpg?v=1769802781" },
    { id: "pw6", name: "Insulated Baggy Snow Pants", brand: "GSOU SNOW", price: 160, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "moguls"], style: ["street"], colors: ["forest"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UPT2511-ARG_F_01.jpg?width=800" },
    { id: "pw22", name: "Army Green Baggy Snow Pants", brand: "GSOU SNOW", price: 150, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "moguls"], style: ["street"], colors: ["forest", "black"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UPT2648-DGRN_F_01.jpg?width=800" },
    { id: "pw7", name: "Nostalgia Pants 2L", brand: "Beyond Medals", price: 260, gender: ["w"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "powder"], style: ["street", "retro"], colors: ["forest", "black"], tier: "mid", fit: "baggy", image: "https://beyondmedals.centracdn.net/client/dynamic/images/586_6106875a1a-bmaw25-flat-nostalgia-pants-green-web.jpg" },
    { id: "ptb1", name: "Trashbags Snow Pants — Black", brand: "Trashbags", price: 195, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "mid", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0561/9282/7494/files/IMG_3813_8825c081-f633-4664-ac9b-9bdbf72c3dc7.jpg?v=1770838985" },
    { id: "ptb2", name: "Trashbags Snow Pants — Light Purple", brand: "Trashbags", price: 195, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["lavender"], tier: "mid", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0561/9282/7494/files/IMG_3790_624d6d68-977f-4902-942f-c586625d38ae.jpg?v=1770838985" },
    { id: "ptb3", name: "Trashbags Snow Pants — Olive Green", brand: "Trashbags", price: 195, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["olive"], tier: "mid", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0561/9282/7494/files/IMG_3679_10800abe-23f9-44aa-83f5-b278801e16a3.jpg?v=1770838985" },
    { id: "ptb4", name: "Trashbags Snow Pants — Maroon", brand: "Trashbags", price: 195, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["burgundy"], tier: "mid", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0561/9282/7494/files/IMG_3664_2eb04747-aa5a-4885-8055-c5066c9cc2ad.jpg?v=1770838985" },
    { id: "pbv1", name: "Black No Cargo Baggy Snowpants", brand: "Big Vigs Apparel", price: 120, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0740/6108/6777/files/6518A418-70F2-49EE-8E03-6626C8301B2B.jpg?v=1759104130" },
    { id: "pbv2", name: "Navy No Cargo Baggy Snowpants", brand: "Big Vigs Apparel", price: 120, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["navy"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0740/6108/6777/files/A67D4DFE-4BF0-46AB-87D4-23AC9263F4B4.jpg?v=1759104190" },
    { id: "pbv3", name: "Brown No Cargo Baggy Snowpants", brand: "Big Vigs Apparel", price: 120, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["burgundy"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0740/6108/6777/files/F154E4ED-0758-4F07-9277-D38043C7E57C.jpg?v=1759104284" },
    { id: "pbv4", name: "Olive No Cargo Baggy Snowpants", brand: "Big Vigs Apparel", price: 160, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["olive"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0740/6108/6777/files/26EF2A99-7BBA-4B46-881F-35D5168DDB7F.jpg?v=1759103910" },
    { id: "pbv5", name: "Slate Gray No Cargo Baggy Pants", brand: "Big Vigs Apparel", price: 120, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["slate"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0740/6108/6777/files/5DD734E0-3124-4CAC-B826-146D53877D08.jpg?v=1759104381" },
    { id: "pb1", name: "Black Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0794/7544/1941/files/DSC00486.jpg?width=800" },
    { id: "pb2", name: "White Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["white"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0794/7544/1941/files/DSC00497.jpg?width=800" },
    { id: "pb3", name: "Olive Green Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["olive"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0794/7544/1941/files/DSC00183.jpg?width=800" },
    { id: "pb4", name: "Purple Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["purple"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0794/7544/1941/files/DSC00159.jpg?width=800" },
    { id: "pb5", name: "Black/Red Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black", "red"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0794/7544/1941/files/DSC00647.jpg?width=800" },
    { id: "pb6", name: "Black/Blue Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black", "navy"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0794/7544/1941/files/DSC00650.jpg?width=800" },
    { id: "pb7", name: "Dark Brown Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["burgundy"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0794/7544/1941/files/DSC00489_45458c47-85b6-4a41-afa4-e403e8d26b37.jpg?width=800" },
    { id: "pb8", name: "Grey Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["slate"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0794/7544/1941/files/DSC00674.jpg?width=800" },
    { id: "pb9", name: "Red Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["red"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0794/7544/1941/files/DSC00493.jpg?width=800" },
    { id: "pb10", name: "Light Pink Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["blush"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0794/7544/1941/files/DSC00496.jpg?width=800" },
    { id: "pb11", name: "Navy Blue Snowpants 10k", brand: "Bandits Apparels", price: 110, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["navy"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0794/7544/1941/files/DSC00679.jpg?width=800" },
    { id: "pb12", name: "Beige Snowpants 10k", brand: "Bandits Apparels", price: 110, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sand"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0794/7544/1941/files/C97F2B34-63E4-4CE6-8B32-E47A922C74B1.jpg?width=800" },
    { id: "pbr1", name: "Cargo Snowpants Black", brand: "Briqed", price: 140, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0979/7835/1748/files/BDCE6D6C-FC6F-4D16-A724-3F5148638220.png?width=800" },
    { id: "pbr2", name: "Cargo Snowpants Blue", brand: "Briqed", price: 140, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["cobalt"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0979/7835/1748/files/C32A1099-DFEF-42F1-80CA-407E123CABC4.png?width=800" },
    { id: "pbr3", name: "Cargo Snowpants White", brand: "Briqed", price: 140, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["white"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0979/7835/1748/files/31590169-29FF-40AE-B951-2923294BD021.png?width=800" },
    { id: "pbr4", name: "Cargo Snowpants Purple", brand: "Briqed", price: 140, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["purple"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0979/7835/1748/files/IMG-0348.png?width=800" },
    { id: "pbr5", name: "Cargo Snowpants Pink", brand: "Briqed", price: 140, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["blush"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0979/7835/1748/files/55AFBD9E-3788-41AE-8AD4-5FA8D9A38D79.png?width=800" },
    { id: "pbr6", name: "Cargo Snowpants Brown", brand: "Briqed", price: 140, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["burgundy"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0979/7835/1748/files/1C608895-D802-4268-BDA2-A7B3C391391E.png?width=800" },
    { id: "pso1", name: "Black Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0614/8276/2288/files/temp_image_9BCC0866-4EEA-4989-89D4-13524A45E4B4_2.jpg?width=800" },
    { id: "pso2", name: "Twilight Snow Pants", brand: "Solo Apparel", price: 145, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black", "navy"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0614/8276/2288/files/temp_image_0521A47F-BFD4-4EC3-8032-EE47D0F9D69B.jpg?width=800" },
    { id: "pso3", name: "White Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["white"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0614/8276/2288/files/temp_image_CAC45C60-A1C2-4C40-ADB7-4EFAC00BAC3C.jpg?width=800" },
    { id: "pso4", name: "Purple Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["purple"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0614/8276/2288/files/temp_image_01638AF3-1D62-4927-8F58-B27AE6A17CEB.jpg?width=800" },
    { id: "pso5", name: "Light Blue Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sky"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0614/8276/2288/files/temp_image_3D9D12EC-8927-4EB8-A8D5-F75011F842F0.jpg?width=800" },
    { id: "pso6", name: "Pink Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["blush"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0614/8276/2288/files/temp_image_43ED5D43-68B7-4019-9A3F-C39BB5945FC3.jpg?width=800" },
    { id: "pso7", name: "Brown Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["burgundy"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0614/8276/2288/files/temp_image_4AB1C889-1AD1-4EF9-83C6-8E21572F33AE.jpg?width=800" },
    { id: "pso8", name: "Grey Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["slate"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0614/8276/2288/files/temp_image_0CEF7676-BC0D-434E-99AF-7A044D707618.jpg?width=800" },
    { id: "pso9", name: "Green Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["forest"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0614/8276/2288/files/temp_image_202DD8D4-07BE-43F4-9EBC-1528A45DBB63.jpg?width=800" },
    { id: "pf1", name: "Dark Gray Contrast Zipper Detail Baggy Snow Pants", brand: "GSOU SNOW", price: 134, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["charcoal"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UPT2648-DGRY_M_01.jpg?width=800" },
    { id: "pf2", name: "Dark Gray Contrast Zipper Detail Baggy Snow Pants", brand: "GSOU SNOW", price: 134, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["charcoal"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UPT2648-DGRY_F_01.jpg?width=800" },
    { id: "pf3", name: "Downtown Pro 30K Snow Pants — Tan Beige", brand: "Ninety Roll", price: 170, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sand"], tier: "value", fit: "baggy", image: "https://ninetyroll.co/wp-content/uploads/2024/05/4W2A2783-pic-819x1024.jpg" },
    { id: "pf4", name: "Downtown Cargo Baggy Snow Pants — Pink", brand: "Ninety Roll", price: 170, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["blush"], tier: "value", fit: "baggy", image: "https://ninetyroll.co/wp-content/uploads/2024/05/4W2A2717-819x1024.jpg" },
    { id: "pf15", name: "Olive Green Brushed Barrel Snow Pants", brand: "GSOU SNOW", price: 134, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["olive"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UPT2628-DGRN_M_01.jpg?width=800" },
    { id: "pf16", name: "Olive Green Brushed Barrel Snow Pants", brand: "GSOU SNOW", price: 134, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["olive"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UPT2628-DGRN_F_01.jpg?width=800" },
    { id: "pf17", name: "Downtown Pro 30K Snow Pants — Dark Green", brand: "Ninety Roll", price: 170, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["forest"], tier: "value", fit: "baggy", image: "https://ninetyroll.co/wp-content/uploads/2025/12/4W2A2783-pic-%E6%8B%B7%E8%B4%9D-2-819x1024.jpg" },
    { id: "pf18", name: "Downtown Cargo Baggy Snow Pants — Dark Grey", brand: "Ninety Roll", price: 170, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["slate"], tier: "value", fit: "baggy", image: "https://ninetyroll.co/wp-content/uploads/2024/05/4W2A2669-819x1024.jpg" },
    { id: "pf19", name: "Light Blue Snow Pants", brand: "Solo Apparel", price: 110, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sky"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0614/8276/2288/files/temp_image_3D9D12EC-8927-4EB8-A8D5-F75011F842F0.jpg?width=800" },
    { id: "pf20", name: "Light Blue Snow Pants", brand: "Solo Apparel", price: 110, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sky"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0614/8276/2288/files/temp_image_3D9D12EC-8927-4EB8-A8D5-F75011F842F0.jpg?width=800" },
    { id: "pf21", name: "Light Gray Baggy Drawstring Durable Snow Pants", brand: "GSOU SNOW", price: 100, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["silver"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UPT2539-GREY_M_01.jpg?width=800" },
    { id: "pf22", name: "Light Gray Baggy Drawstring Durable Snow Pants", brand: "GSOU SNOW", price: 100, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["silver"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UPT2539-GREY_F_01.jpg?width=800" },
    { id: "pf23", name: "Magenta Contrast Stitch Minimal Snow Pants", brand: "GSOU SNOW", price: 134, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["magenta"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UPT2650-BLK-3_M_01.jpg?width=800" },
    { id: "pf24", name: "Magenta Contrast Stitch Minimal Snow Pants", brand: "GSOU SNOW", price: 134, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["magenta"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UPT2650-BLK-3_F_01.jpg?width=800" },
    { id: "pf28", name: "Neon Coral Reinforced Knee Scuff Guard Ski Pants", brand: "GSOU SNOW", price: 130, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["coral"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-2344-ORG_01.jpg?width=800" },
    { id: "pf29", name: "Downtown Pro 30K Snow Pants — Frost Purple", brand: "Ninety Roll", price: 170, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["lavender"], tier: "value", fit: "baggy", image: "https://ninetyroll.co/wp-content/uploads/2025/11/4W2A2783-pic-819x1024.jpg" },
    { id: "pf210", name: "Pinnacle Cargo 30K Snow Pants — Olive Green", brand: "Ninety Roll", price: 170, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["olive"], tier: "value", fit: "baggy", image: "https://ninetyroll.co/wp-content/uploads/2025/03/%E5%86%9B%E7%BB%BF-1-819x1024.jpg" },
    { id: "pn1", name: "Hot Bib — Matcha", brand: "Airblaster", price: 182, gender: ["w"], ability: ["beginner","intermediate","advanced"], terrain: ["park","groomed"], style: ["street","retro"], colors: ["mint"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0236/7291/files/HOT_BIB_MATCHA_HERO1_2526.jpg?v=1755192420&width=800" },
    { id: "pn2", name: "HUF Double H Shell Pant", brand: "686", price: 162, gender: ["m"], ability: ["intermediate","advanced"], terrain: ["park","groomed"], style: ["street"], colors: ["mint"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/1343/2655/files/M5WN243_HUF-GREEN-COLORBLOCK_1.jpg?v=1757353826&width=800" },
    { id: "pn3", name: "Genki Pant — Deep Teal", brand: "Yuki Threads", price: 231, gender: ["m", "w"], ability: ["intermediate","advanced","expert"], terrain: ["park","groomed"], style: ["street","freeride"], colors: ["teal"], tier: "mid", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0388/9917/files/G25GPDTL_0891.jpg?v=1763772389&width=800" },
    { id: "pn4", name: "Sublime Shell Pant — Yellow Tie Dye", brand: "686", price: 150, gender: ["w"], ability: ["beginner","intermediate","advanced"], terrain: ["park","groomed"], style: ["street","retro"], colors: ["yellow"], tier: "value", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/1343/2655/files/M5WN437_SUBLIME-YELLOW-TIE-DYE_1.jpg?v=1757353745&width=800" },
    { id: "pn5", name: "Blaze Woodland Camo High-Back Cargo Pants", brand: "GSOU SNOW", price: 99, gender: ["m", "w"], ability: ["beginner","intermediate","advanced"], terrain: ["park","groomed"], style: ["street"], colors: ["orange"], tier: "value", fit: "regular", image: "https://cdn.shopify.com/s/files/1/2030/8605/files/GS-UPT2681-811_M_01.jpg?v=1781758920&width=800" },
    { id: "pn6", name: "Hot Lap Pant — Bluey", brand: "Yuki Threads", price: 350, gender: ["m", "w"], ability: ["intermediate","advanced","expert"], terrain: ["park","groomed"], style: ["street","freeride"], colors: ["turquoise"], tier: "mid", fit: "baggy", image: "https://cdn.shopify.com/s/files/1/0388/9917/files/W26HLPBLY_2527.jpg?v=1778550625&width=800" },
  ],
  goggles: [
    { id: "g1", name: "Helix 2.0 Goggles", brand: "Anon", price: 120, gender: ["m", "w"], ability: ["beginner", "intermediate"], terrain: ["groomed"], style: ["classic"], colors: ["white"], tier: "value", image: "https://cdn.shopify.com/s/files/1/0648/9266/5939/files/hwtmxvu4ezsqrngyquqi.webp?width=800" },
    { id: "g9", name: "Squad ChromaPop Goggles", brand: "Smith", price: 135, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["groomed", "park"], style: ["street", "classic"], colors: ["black"], tier: "value", image: "https://cdn.shopify.com/s/files/1/0751/8073/6750/files/squad-goggles_black-cpEverydayGreenMirror_FRONT.png?width=800" },
    { id: "g10", name: "Squad ChromaPop Goggles — White", brand: "Smith", price: 135, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["groomed", "park"], style: ["street", "classic"], colors: ["white"], tier: "value", image: "https://cdn.shopify.com/s/files/1/0751/8073/6750/files/M007880OZ9941_Squad_White_Vapor_ChromaPopEverydayVioletMirror_3Q.png?width=800" },
    { id: "g11", name: "I/O MAG Goggles", brand: "Smith", price: 295, gender: ["m", "w"], ability: ["intermediate", "advanced"], terrain: ["groomed", "park"], style: ["street", "retro"], colors: ["black"], tier: "mid", image: "https://cdn.shopify.com/s/files/1/0751/8073/6750/files/io-mag-goggles_black-cpSunGreenMirror_3Q.png?width=800" },
    { id: "g12", name: "Comp Goggles", brand: "Giro", price: 150, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["groomed", "powder"], style: ["classic", "freeride"], colors: ["black"], tier: "value", image: "https://vault.widen.net/content/opwpnq3cdi?w=1500&h=1500" },
    { id: "g13", name: "Revolt Goggles", brand: "Giro", price: 130, gender: ["m", "w"], ability: ["beginner", "intermediate"], terrain: ["groomed", "park"], style: ["street", "classic"], colors: ["white"], tier: "value", image: "https://vault.widen.net/content/wzwhyirwzv?w=1500&h=1500" },
    { id: "g14", name: "M5 Goggles", brand: "Anon", price: 220, gender: ["m", "w"], ability: ["advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["black"], tier: "premium", image: "https://cdn.shopify.com/s/files/1/0648/9266/5939/files/cd1999e2bf94cfba28d39226a55e5d9d4b0d3fde.webp?width=800" },
    { id: "g15", name: "PRO OTG Goggles", brand: "OutdoorMaster", price: 40, gender: ["m", "w"], ability: ["beginner", "intermediate"], terrain: ["groomed"], style: ["classic"], colors: ["black"], tier: "value", image: "https://cdn.shopify.com/s/files/1/0330/6389/5085/files/outdoormaster-otg_snow_goggles-ski-goggles-black_frame_vlt_10_00001.webp?width=800" },
    { id: "g16", name: "PRO OTG Goggles — White", brand: "OutdoorMaster", price: 40, gender: ["m", "w"], ability: ["beginner", "intermediate"], terrain: ["groomed"], style: ["classic"], colors: ["white"], tier: "value", image: "https://cdn.shopify.com/s/files/1/0330/6389/5085/files/outdoormaster-otg_snow_goggles-ski-goggles-white_frame_vlt_13_00001.webp?width=800" },
    { id: "ge1", name: "Cam Goggles — Matte White Neuron", brand: "Electric", price: 48, gender: ["m", "w"], ability: ["beginner", "intermediate"], terrain: ["groomed", "park"], style: ["street", "classic"], colors: ["cobalt", "white"], tier: "value", image: "https://cdn.shopify.com/s/files/1/0026/4529/5169/files/2035_EG3523711BLUC_P_1_1.jpg?v=1692811655" },
    { id: "ge2", name: "Pike Goggles — Auxin Purple", brand: "Electric", price: 64, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["turquoise", "lavender"], tier: "value", image: "https://cdn.shopify.com/s/files/1/0026/4529/5169/files/2034_EG3423701ATMT_P_1_1.jpg?v=1692813001" },
    { id: "ge3", name: "EK1 Goggles — Flood Blue", brand: "Electric", price: 120, gender: ["m", "w"], ability: ["intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "freeride"], colors: ["sky", "cobalt"], tier: "value", image: "https://cdn.shopify.com/s/files/1/0026/4529/5169/files/2025_EG2524508-YBLC_P_1.jpg?v=1727470866" },
    { id: "g17", name: "Squad Goggles — Future Grey Warm Steel", brand: "Smith", price: 165, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["groomed", "park"], style: ["street", "classic"], colors: ["silver"], tier: "mid", image: "https://cdn.shopify.com/s/files/1/0751/8073/6750/files/squad-goggles_futureGreyWarmSteel-cpSunPlatinumMirror_3Q.png?v=1783634736" },
    { id: "g2", name: "Squad Mag Goggles", brand: "Smith", price: 265, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["black"], tier: "mid", image: "https://cdn.shopify.com/s/files/1/0751/8073/6750/files/squad-mag-goggles_black-cpSunBlackGoldMirror_3Q.png?width=800" },
    { id: "g3", name: "Line Miner Prizm Goggles", brand: "Oakley", price: 180, gender: ["m", "w"], ability: ["intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["white"], tier: "mid", image: "https://assets2.oakley.com/prod-onecp-record-files/pieyewear/0172b1ec-840a-4426-8b5c-b35e00f32d63/0OO7070__707013__OOE__shad__030A.png?impolicy=OO_ratio&width=800" },
    { id: "g4", name: "Tracker 2.0 Goggles", brand: "Anon", price: 95, gender: ["m", "w"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "moguls"], style: ["street", "freeride"], colors: ["black"], tier: "premium", image: "https://cdn.shopify.com/s/files/1/0648/9266/5939/files/mv9iqxn9qpftztenzgqm.webp?width=800" },
    { id: "g5", name: "Sentry Pro Goggles", brand: "Salomon", price: 200, gender: ["m", "w"], ability: ["intermediate", "advanced"], terrain: ["powder", "groomed"], style: ["freeride", "classic"], colors: ["black"], tier: "mid", image: "https://cdn.dam.salomon.com/aa328169-00cf-432d-8f67-b2f3013c711c/L47895200/PNG-2000px-max-72dpi.png?pad=0.12,0.12,0.12,0.12" },
    { id: "g6", name: "Contour Goggles", brand: "Giro", price: 260, gender: ["m", "w"], ability: ["advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["black"], tier: "premium", image: "https://vault.widen.net/content/onp0hmuh8u?w=1500&h=1500" },
    { id: "g7", name: "4D Mag Goggles", brand: "Smith", price: 355, gender: ["m", "w"], ability: ["intermediate", "advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["black"], tier: "premium", image: "https://cdn.shopify.com/s/files/1/0751/8073/6750/files/4d-mag-goggles_black-cpSunGreenMirror_3Q.png?width=800" },
    { id: "g8", name: "Blazer Goggles", brand: "Smith", price: 105, gender: ["m", "w"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["white"], tier: "premium", image: "https://cdn.shopify.com/s/files/1/0751/8073/6750/files/Blazer_White_M007781DG99C5_3Q.png?width=800" },
  ],
  helmet: [
    { id: "h1", name: "Ledge MIPS Helmet", brand: "Giro", price: 90, gender: ["m", "w"], ability: ["beginner", "intermediate"], terrain: ["groomed"], style: ["classic"], colors: ["black"], tier: "value", image: "https://vault.widen.net/content/huocdzxcii?w=1500&h=1500" },
    { id: "h2", name: "Method MIPS Helmet", brand: "Smith", price: 160, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park"], style: ["street", "retro"], colors: ["black"], tier: "value", image: "https://cdn.shopify.com/s/files/1/0751/8073/6750/files/method-helmet_matteBlack_3Q_5da8a4a1-4fab-4048-9b7d-3c8ac8ede83b.png?width=800" },
    { id: "h3", name: "Chase 2 Plus Helmet", brand: "Scott", price: 160, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "classic"], colors: ["black"], tier: "mid", image: "https://static.scott-sports.com/image/upload/v1778020329/1494473.png" },
    { id: "h4", name: "Level MIPS Helmet", brand: "Smith", price: 250, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["moguls", "groomed"], style: ["classic", "freeride"], colors: ["black"], tier: "mid", image: "https://cdn.shopify.com/s/files/1/0751/8073/6750/files/E006299KS5155_01_ac2b6f34-fe56-4da9-846b-f6b77b4c3b17.png?width=800" },
    { id: "h5", name: "Neo MIPS Helmet", brand: "Giro", price: 180, gender: ["m", "w"], ability: ["intermediate", "advanced", "expert"], terrain: ["powder", "park"], style: ["freeride", "street"], colors: ["white"], tier: "mid", image: "https://vault.widen.net/content/rgiwr9aauz?w=1500&h=1500" },
    { id: "h8", name: "Trig MIPS Helmet", brand: "Giro", price: 150, gender: ["m", "w"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "moguls"], style: ["street", "retro"], colors: ["black"], tier: "mid", image: "https://vault.widen.net/content/c4p2fi338y?w=1500&h=1500" },
    { id: "h6", name: "Vantage 2 MIPS Helmet", brand: "Smith", price: 295, gender: ["m", "w"], ability: ["intermediate", "advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["sand"], tier: "premium", image: "https://cdn.shopify.com/s/files/1/0751/8073/6750/files/E005632NV5559_Vantage_2_Mips_Matte_Chalk_3Q.png?width=800" },
    { id: "h7", name: "Flow Pro MIPS Helmet", brand: "Scott", price: 220, gender: ["m", "w"], ability: ["advanced", "expert"], terrain: ["groomed", "ice", "backcountry"], style: ["race", "classic"], colors: ["black"], tier: "premium", image: "https://static.scott-sports.com/image/upload/v1778088828/2082990.png" },
  ],
  gloves: [
    { id: "gl1", name: "PowderBound Gloves", brand: "Columbia", price: 75, gender: ["m", "w"], ability: ["beginner", "intermediate"], terrain: ["groomed"], style: ["classic"], colors: ["black"], tier: "value", image: "https://media.columbia.com/i/columbia/2097011_010_f_pu" },
    { id: "gl2", name: "Gondy GORE-TEX Glove", brand: "Burton", price: 120, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park"], style: ["street", "retro"], colors: ["sand"], tier: "mid", image: "https://cdn.shopify.com/s/files/1/0804/4062/3361/files/1032618R82_1.webp?width=800" },
    { id: "gl3", name: "Titan GORE-TEX Mitt", brand: "Dakine", price: 94, gender: ["m", "w"], ability: ["intermediate", "advanced"], terrain: ["park", "powder"], style: ["street", "freeride"], colors: ["forest"], tier: "mid", image: "https://cdn.shopify.com/s/files/1/0242/3141/1792/files/TITANGORETEXMITTS-MULLEDBASIL-194626590424_10004299_MULLEDBASL-62M_MAIN.jpg?width=800" },
    { id: "gl4", name: "Spark Mitts", brand: "Black Diamond", price: 140, gender: ["m", "w"], ability: ["intermediate", "advanced", "expert"], terrain: ["backcountry", "powder"], style: ["freeride"], colors: ["black"], tier: "mid", image: "https://cdn.shopify.com/s/files/1/0880/2195/8973/files/801173_9805_Spark_Mitts_Rye-Midnight_Blue_01.jpg?width=800" },
    { id: "gl5", name: "Army Leather Heli Glove", brand: "Hestra", price: 200, gender: ["m", "w"], ability: ["advanced", "expert"], terrain: ["backcountry", "moguls"], style: ["freeride", "classic"], colors: ["navy"], tier: "premium", image: "https://cdn.shopify.com/s/files/1/0979/8058/0187/files/1776176566637-30570-280_1_Meta.png?v=1776179516" },
    { id: "gl6", name: "Fall Line Glove", brand: "Hestra", price: 190, gender: ["m", "w"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["black"], tier: "mid", image: "https://cdn.shopify.com/s/files/1/0979/8058/0187/files/1776024134785-3000780-100100_1_Meta.png?v=1776184531" },
    { id: "gl7", name: "Leather Fall Line Mitt", brand: "Hestra", price: 210, gender: ["m", "w"], ability: ["intermediate", "advanced", "expert"], terrain: ["powder", "groomed"], style: ["retro", "freeride"], colors: ["cream"], tier: "premium", image: "https://cdn.shopify.com/s/files/1/0979/8058/0187/files/1776024184266-3000781-060060_1_Meta.png?v=1776184615" },
    { id: "gl9", name: "901T Lined Heavy-Duty Pigskin Ski Mitt", brand: "Kinco", price: 55, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced", "expert"], terrain: ["park", "backcountry", "groomed", "powder"], style: ["street", "freeride", "classic"], colors: ["sand"], tier: "value", customizable: true, note: "Natural tan leather — the classic. Most people dye, paint or Sharpie them to match their kit.", image: "https://res.cloudinary.com/hdtsjhzsw/image/upload/s--I0aypAvn--/w_902,h_1024,c_lpad,b_white,f_jpg/d6d8ba7fb14701d0fed1eb320956bf77bdc831ac.png" },
    { id: "glbv1", name: "Insulated Leather Gloves", brand: "Big Vigs Apparel", price: 40, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value", image: "https://cdn.shopify.com/s/files/1/0740/6108/6777/files/1E8B0C17-3315-4D47-8BEE-05C8442D2379.png?width=800" },
    { id: "glbv2", name: "Black & White Insulated Leather Gloves", brand: "Big Vigs Apparel", price: 40, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black", "white"], tier: "value", image: "https://cdn.shopify.com/s/files/1/0740/6108/6777/files/BCE8BC29-F9E8-44B5-931B-C5883B77291E.png?width=800" },
    { id: "gl11", name: "Black Mittens", brand: "Bandits Apparels", price: 40, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value", image: "https://cdn.shopify.com/s/files/1/0794/7544/1941/files/DSC00193.jpg?width=800" },
    { id: "gl12", name: "White Mittens", brand: "Bandits Apparels", price: 40, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["white"], tier: "value", image: "https://cdn.shopify.com/s/files/1/0794/7544/1941/files/DSC00196.jpg?width=800" },
    { id: "gl13", name: "Pink Mittens", brand: "Bandits Apparels", price: 40, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["blush"], tier: "value", image: "https://cdn.shopify.com/s/files/1/0794/7544/1941/files/DSC00708.jpg?width=800" },
  ],
};

const CATEGORY_LABELS = { skis: "Skis", jacket: "Jacket", pants: "Snowpants", goggles: "Goggles", helmet: "Helmet", gloves: "Gloves" };
function categoryLabel(key, sport) {
  if (key === "skis" && sport === "snowboard") return "Snowboard";
  return CATEGORY_LABELS[key];
}
const FIT_LABELS = { slim: "Slim Fit", regular: "Regular Fit", baggy: "Relaxed / Baggy Fit" };
const CATEGORY_ICON_FALLBACK = { jacket: Shirt, pants: Layers, goggles: Eye, helmet: HardHat, gloves: Hand };
const GENDER_LABELS = { m: "Men's", w: "Women's", u: "Unisex" };
const TIER_ORDER = ["value", "mid", "premium"];

function tierProximity(itemTier, budgetTier) {
  if (!budgetTier) return 0;
  const diff = Math.abs(TIER_ORDER.indexOf(itemTier) - TIER_ORDER.indexOf(budgetTier));
  if (diff === 0) return 3;
  if (diff === 1) return 1;
  return 0;
}

function genderMatches(item, gender) {
  if (!gender || gender === "u") return true;
  return item.gender.includes(gender);
}

/* Color score is used only to rank WITHIN an already-filtered pool
   (see buildRankings) — it rewards more overlap with the chosen
   palette, but the hard subset guarantee happens before this runs.
   BUGFIX: this used to divide by min(sel.length, item.colors.length),
   which let a solo-black item score identically to an item that
   actually covered every chosen color — e.g. picking black + forest,
   a solo-black item scored the same "1.0 coverage" as a real
   black+forest piece, so black always won ties and forest never
   visibly showed up. Dividing by sel.length alone means covering
   more of what was actually picked is what gets rewarded. */
function colorScore(item, chosen) {
  const sel = chosen || [];
  if (!sel.length) return 0;
  // Customisable pieces (e.g. natural-leather Kinco mitts, which people
  // routinely dye or paint) are a blank canvas — they work with any
  // palette, so they score as a full match rather than being pushed
  // down for shipping in one fixed colour.
  if (item.customizable) return 2;
  const hits = item.colors.filter((c) => sel.includes(c)).length;
  if (!hits) return 0;
  return 1 + (hits / sel.length) * 3;
}

/* Skis and boards get judged on how they RIDE first and how they look
   second. A black park ski is the wrong answer for someone who asked to
   carve, however perfectly the topsheet matches their palette - you can
   wear a jacket that clashes, but you can't ride the wrong ski. Colour
   still counts underfoot, it just breaks ties between boards that
   already suit the riding rather than deciding the pick.

   Apparel is the opposite: coordinating the outfit IS the product, so
   colour carries as much weight there as terrain does. */
const RIDE_FIRST_WEIGHTS = { ability: 6, terrain: 9, style: 9, color: 0.5 };
const OUTFIT_WEIGHTS = { ability: 4, terrain: 4, style: 4, color: 1 };
const weightsFor = (category) => (category === "skis" ? RIDE_FIRST_WEIGHTS : OUTFIT_WEIGHTS);

function scoreItem(item, answers, category) {
  const w = weightsFor(category);
  let score = 0;
  if (item.ability.includes(answers.ability)) score += w.ability;

  const terrainSel = answers.terrain || [];
  if (terrainSel.length) {
    const matched = item.terrain.filter((t) => terrainSel.includes(t)).length;
    score += (matched / terrainSel.length) * w.terrain;
  }

  const styleSel = answers.style || [];
  if (styleSel.length) {
    const matched = item.style.filter((s) => styleSel.includes(s)).length;
    score += (matched / styleSel.length) * w.style;
  }

  score += colorScore(item, answers.colors) * w.color;
  score += tierProximity(item.tier, answers.budget);
  if (item.fit && item.fit === answers.fit) score += 3;
  return score;
}

/* Raw score → a friendly percentage for the "match" badge on each card.
   The ceiling differs by category because the weights do: skis top out
   at 29 (6 ability + 9 terrain + 9 style + 2 colour + 3 tier, and no fit
   field on a ski), apparel at 22 (4+4+4+4 + 3 tier + 3 fit). Using one
   shared ceiling would make every ski read as a worse match than it is.
   Bounded so it never claims a hollow 100% or an alarming near-zero. */
const MAX_MATCH_SCORE = { skis: 29, default: 22 };
function matchPercent(item, category, answers, fit, pantFit) {
  const target = category === "pants" ? { ...answers, fit: pantFit } : { ...answers, fit };
  const raw = scoreItem(item, target, category);
  const ceiling = MAX_MATCH_SCORE[category] ?? MAX_MATCH_SCORE.default;
  return Math.max(80, Math.min(98, Math.round((raw / ceiling) * 100) + 20));
}

const TERRAIN_LENGTH_OFFSET = { groomed: -18, ice: -16, moguls: -20, park: -24, powder: -8, backcountry: -6 };
const ABILITY_LENGTH_ADJ = { beginner: -6, intermediate: -2, advanced: 2, expert: 6 };

function recommendSkiLength(heightCm, weightKg, ability, terrainArr) {
  if (!heightCm) return null;
  const terrain = terrainArr && terrainArr.length ? terrainArr : ["groomed"];
  const avgOffset = terrain.reduce((sum, t) => sum + (TERRAIN_LENGTH_OFFSET[t] ?? -16), 0) / terrain.length;
  let length = heightCm + avgOffset + (ABILITY_LENGTH_ADJ[ability] || 0);
  if (weightKg) length += (weightKg - (heightCm - 100)) / 5;
  length = Math.round(length / 5) * 5;
  return Math.max(120, Math.min(195, length));
}

/* Snowboard length charts are primarily weight-driven (unlike skis,
   which lean on height) — most brand size charts key off a rider
   weight range first. Anchored to two real reference points: ~70kg
   riders land around 156cm, ~90kg riders around 164cm. Terrain and
   ability nudge it from there — park riders size down for playfulness,
   powder/freeride riders size up for float. */
const BOARD_TERRAIN_ADJ = { park: -4, groomed: 0, moguls: -2, powder: 5, backcountry: 6, ice: -2 };
const BOARD_ABILITY_ADJ = { beginner: -2, intermediate: 0, advanced: 2, expert: 3 };

function recommendBoardLength(heightCm, weightKg, ability, terrainArr) {
  if (!weightKg) return null;
  let length = 128 + weightKg * 0.4;
  const terrain = terrainArr && terrainArr.length ? terrainArr : ["groomed"];
  const avgTerrainAdj = terrain.reduce((sum, t) => sum + (BOARD_TERRAIN_ADJ[t] ?? 0), 0) / terrain.length;
  length += avgTerrainAdj + (BOARD_ABILITY_ADJ[ability] || 0);
  length = Math.round(length / 2) * 2;
  return Math.max(90, Math.min(170, length));
}

function frameLean(heightCm, weightKg) {
  if (!heightCm || !weightKg) return 0;
  const bmi = weightKg / (heightCm / 100) ** 2;
  return Math.max(-1, Math.min(1, (bmi - 22) / 8));
}

const STYLE_FIT_LEAN = { street: 1, retro: 0.4, freeride: 0.3, classic: -0.3, race: -1 };

function styleLean(styleArr) {
  const sel = styleArr || [];
  if (!sel.length) return 0;
  return Math.max(-1, Math.min(1, sel.reduce((a, s) => a + (STYLE_FIT_LEAN[s] || 0), 0) / sel.length));
}

/* Race is the mirror image of street/park: baggy street dressers get
   baggy outright, so race skiers should get slim outright — not just
   a soft lean that could still land on "regular" if height/weight
   pull the other way. */
function recommendFit(heightCm, weightKg, styleArr) {
  const style = styleArr || [];
  if (style.includes("race") && !style.includes("street")) return "slim";
  const lean = frameLean(heightCm, weightKg) * 0.35 + styleLean(styleArr) * 0.65;
  if (lean >= 0.22) return "baggy";
  if (lean <= -0.22) return "slim";
  return "regular";
}

/* Pants run baggier than jackets across the board. Park riders and
   street dressers get baggy outright — a slim pant there is wrong.
   Race skiers get the opposite hard guarantee: slim, not a maybe. */
function recommendPantFit(heightCm, weightKg, styleArr, terrainArr, sport) {
  // Snowboarding: baggy, full stop. It's not a style lean here, it's
  // the default — even race/carve-leaning riders overwhelmingly wear
  // relaxed-fit pants for boot and stance mobility.
  if (sport === "snowboard") return "baggy";
  const style = styleArr || [];
  const terrain = terrainArr || [];
  if (style.includes("street") || style.includes("retro") || terrain.includes("park")) return "baggy";
  if (style.includes("race")) return "slim";
  const lean = frameLean(heightCm, weightKg) * 0.3 + styleLean(styleArr) * 0.7 + 0.3;
  if (lean >= 0.2) return "baggy";
  if (lean <= -0.45) return "slim";
  return "regular";
}

function recommendSize(heightCm, weightKg, gender) {
  if (!heightCm || !weightKg) return null;
  const bmi = weightKg / (heightCm / 100) ** 2;
  const cutoffs = gender === "w" ? [155, 162, 169, 176, 183] : [163, 170, 177, 184, 191];
  let band = cutoffs.findIndex((c) => heightCm < c);
  if (band === -1) band = 5;
  if (bmi > 27) band += 1;
  if (bmi < 19) band -= 1;
  band = Math.max(0, Math.min(6, band));
  return ["XXS", "XS", "S", "M", "L", "XL", "XXL"][band];
}

/* Returns a ranked list per category so the UI can offer swaps. */
function buildRankings(answers, sport) {
  const fit = recommendFit(answers.heightCm, answers.weightKg, answers.style);
  const pantFit = recommendPantFit(answers.heightCm, answers.weightKg, answers.style, answers.terrain, sport);
  const skiLength = sport === "snowboard" ? null : recommendSkiLength(answers.heightCm, answers.weightKg, answers.ability, answers.terrain);
  const boardLength = sport === "snowboard" ? recommendBoardLength(answers.heightCm, answers.weightKg, answers.ability, answers.terrain) : null;
  const size = recommendSize(answers.heightCm, answers.weightKg, answers.gender);
  const scored = { ...answers, fit };
  const wantsParkSkis = (answers.style || []).includes("street") || (answers.terrain || []).includes("park");
  const wantsRaceSkis = (answers.style || []).includes("race") && !wantsParkSkis;

  // Snowboard mode swaps in real snowboard decks for the "skis" slot —
  // everything else (jacket, pants,
  // goggles, helmet, gloves) is shared across both sports.
  const effectiveCatalog =
    sport === "snowboard" ? { ...CATALOG, skis: SNOWBOARD_BOARDS.board } : CATALOG;

  const rankings = {};
  let widePantsPool = [];
  let wideJacketPool = [];
  const chosenColors = answers.colors || [];
  Object.entries(effectiveCatalog).forEach(([category, items]) => {
    const eligible = items.filter((i) => genderMatches(i, answers.gender));
    let pool = eligible.length ? eligible : items;

    // For skis specifically, the TYPE of ski matters more than color or
    // budget — a black Völkl race ski or K2 all-mountain ski isn't a good
    // answer to "I ride park," even if the color happens to line up
    // perfectly. Narrow to the right ski type FIRST, before the budget
    // filter below, so a lower budget tier can't wipe out every race/park
    // option before the type filter ever runs (every race-tagged ski in
    // the catalog happens to be "premium" tier, so filtering budget first
    // silently emptied the race pool and fell back to the wrong ski type).
    if (category === "skis" && wantsParkSkis) {
      const parkSkis = pool.filter((i) => i.terrain.includes("park"));
      if (parkSkis.length) pool = parkSkis;
    } else if (category === "skis" && wantsRaceSkis) {
      const raceSkis = pool.filter((i) => i.style.includes("race"));
      if (raceSkis.length) pool = raceSkis;
    }

    // Hard budget ceiling. Tier match used to be only a scoring bonus,
    // which meant a "Budget-Friendly" pick could still land on a premium
    // item if it scored well on ability/terrain/style - and testing showed
    // that happening in 100% of simulated Budget-Friendly runs, blowing
    // past the promised total by up to 3x. Budget is now a real filter:
    // never show anything above the selected tier, with a fallback to the
    // unrestricted pool only if a category has nothing at or under it.
    // For skis this fallback also protects the type narrowing above — if
    // every race/park ski happens to sit above budget, keep the correct
    // ski type rather than dropping to an in-budget ski of the wrong type.
    if (answers.budget) {
      const budgetRank = TIER_ORDER.indexOf(answers.budget);
      const withinBudget = pool.filter((i) => TIER_ORDER.indexOf(i.tier) <= budgetRank);
      if (withinBudget.length) pool = withinBudget;
    }

    let workingPool = pool;

    // Hard guarantee: if any item in the (possibly already ski-type-
    // narrowed) pool comes ENTIRELY in colors the user picked (no stray
    // zipper-pull-in-a-different-color problem), restrict to that group.
    // Only fall back to partial overlap — or no color info at all —
    // when nothing fully matches within the correct ski type.
    if (chosenColors.length) {
      const exactMatches = workingPool.filter(
        (i) =>
          i.customizable ||
          (i.colors.length > 0 && i.colors.every((c) => chosenColors.includes(c)))
      );
      if (exactMatches.length) {
        if (category === "skis") {
          // Skis are looser on colour than clothing on purpose. A ski
          // topsheet that isn't a perfect palette match still looks fine
          // underfoot, and the strict filter was collapsing the pool to
          // 3-4 options - meaning Search Again kept returning the same
          // couple of skis. Exact matches still rank first; everything
          // else just follows behind instead of being thrown away.
          const rest = workingPool.filter((i) => !exactMatches.includes(i));
          workingPool = [...exactMatches, ...rest];
        } else {
          workingPool = exactMatches;
        }
      }
    }

    // When more than one color is picked, don't let a solo-black item
    // quietly win just because it's common — if something in the pool
    // actually covers MORE of the chosen palette (e.g. a real
    // black+forest piece beats a solo-black one when forest was also
    // picked), restrict to whichever coverage level is best available.
    // Keep a copy of the pool BEFORE coverage-narrowing, so the
    // outfit colour-variety step below can reach a different shade
    // even when every best-coverage item is the same two-tone combo.
    const preCoveragePool = [...workingPool];
    if (chosenColors.length > 1 && workingPool.length && category !== "skis") {
      const coverage = (i) =>
        i.customizable ? chosenColors.length : i.colors.filter((c) => chosenColors.includes(c)).length;
      const bestCoverage = Math.max(...workingPool.map(coverage));
      const bestCovered = workingPool.filter((i) => coverage(i) === bestCoverage);
      if (bestCovered.length) workingPool = bestCovered;
    }
    if (category === "pants") widePantsPool = preCoveragePool;
    if (category === "jacket") wideJacketPool = preCoveragePool;

    const target = category === "pants" ? { ...scored, fit: pantFit } : scored;
    const sorted = [...workingPool].sort((a, b) => {
      const diff = scoreItem(b, target, category) - scoreItem(a, target, category);
      return diff !== 0 ? diff : a.price - b.price;
    });
    // Skis deliberately opt out of the colour gate: riding type outranks
    // topsheet colour there, so letting colour narrow the shuffle would
    // fight the ride-first weighting.
    const colorRank =
      category === "skis" || !chosenColors.length
        ? null
        : (item) => colorScore(item, chosenColors);
    rankings[category] = shuffleWithinTopTier(sorted, (item) => scoreItem(item, target, category), colorRank);
  });

  /* Colour variety across the outfit.
     Each category is scored independently, which means a two-colour
     palette like black + purple could legitimately return black for
     BOTH jacket and pants — every piece matches, but the result looks
     like a single-colour pick and wastes half the palette.
     So: once the jacket is settled, push pants that share its exact
     colour down the ranking, preferring a different shade from what
     the user chose. Only reorders — never drops anything — so if the
     only good pants happen to match the jacket, they still show up. */
  if (rankings.jacket?.length && rankings.pants?.length && chosenColors.length > 1) {
    const clashesWith = (jacketItem) => {
      const jc = new Set(jacketItem.colors);
      return (p) => p.colors.some((c) => jc.has(c));
    };

    let clashes = clashesWith(rankings.jacket[0]);
    let differs = rankings.pants.filter((p) => !clashes(p));

    // Nothing in the narrowed pool differs — reach into the wider
    // (pre-coverage-filter) pool for a genuinely different shade.
    if (!differs.length) {
      differs = widePantsPool.filter((p) => !clashes(p));
    }

    // Still nothing? That means the jacket is using every colour the
    // user picked (e.g. a black+forest jacket on a black+forest
    // palette), so ANY on-palette pant must overlap. Prefer a
    // single-colour jacket instead, freeing the other shade for the
    // pants and splitting the palette across the outfit.
    if (!differs.length) {
      const soloJacket =
        rankings.jacket.find((j) => j.colors.length === 1) ||
        wideJacketPool.find((j) => j.colors.length === 1);
      if (soloJacket) {
        rankings.jacket = [soloJacket, ...rankings.jacket.filter((j) => j.id !== soloJacket.id)];
        clashes = clashesWith(soloJacket);
        differs = rankings.pants.filter((p) => !clashes(p));
        if (!differs.length) differs = widePantsPool.filter((p) => !clashes(p));
      }
    }

    if (differs.length) {
      const seen = new Set(differs.map((p) => p.id));
      rankings.pants = [...differs, ...rankings.pants.filter((p) => !seen.has(p.id))];
    }
  }

  return { rankings, fit, pantFit, skiLength, boardLength, size };
}

/* Same answers shouldn't always hand back the identical piece — but it
   should never trade down to a worse match to do it. This groups the
   items that are effectively tied for best (within ~18% of the top
   score, capped at the top 4) and shuffles just that group, so the
   featured pick varies run to run while everything shown still sits
   in the same quality tier the answers earned. */
function shuffleWithinTopTier(sortedList, scoreFn, colorRank) {
  if (sortedList.length <= 1) return sortedList;
  const topScore = scoreFn(sortedList[0]);
  const threshold = topScore * 0.82;

  // Variety must never cost the user the colour they actually asked for.
  // tierProximity() hands an exact budget-tier match a flat +3, which was
  // enough to lift a goggle in none of the chosen colours into the "tied"
  // band beside the one goggle that did match - and the shuffle then had
  // a real chance of featuring it. Measured over 400 runs, picking
  // Turquoise at Mid-Range featured a goggle in none of the chosen colours
  // 73% of the time (Sky, 71%) despite a matching goggle sitting in the
  // pool, in budget. So an item may only join the
  // shuffle group if it matches the palette at least as well as the
  // current best; below that it stays ranked where it is, still reachable
  // via Search Again.
  const topColor = colorRank ? colorRank(sortedList[0]) : 0;
  let cut = 1;
  while (
    cut < sortedList.length &&
    cut < 4 &&
    scoreFn(sortedList[cut]) >= threshold &&
    (!colorRank || colorRank(sortedList[cut]) >= topColor)
  )
    cut++;
  const tier = sortedList.slice(0, cut);
  const rest = sortedList.slice(cut);
  for (let i = tier.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tier[i], tier[j]] = [tier[j], tier[i]];
  }
  return [...tier, ...rest];
}

const SKI_STEPS = ["gender", "ability", "terrain", "style", "fit", "colors", "budget"];
const SNOWBOARD_STEPS = ["gender", "ability", "stance", "terrain", "style", "fit", "colors", "budget"];

const STANCE = [
  { id: "regular", label: "Regular", desc: "Left foot forward — the more common stance." },
  { id: "goofy", label: "Goofy", desc: "Right foot forward." },
  { id: "unsure", label: "Not sure yet", desc: "Totally fine — we'll match your gear either way." },
];

/* --------------------------- VISUALS --------------------------- */

function SnowFall() {
  const flakes = Array.from({ length: 34 });
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      <style>{`
        @keyframes snowDrift { from { transform: translateY(-6vh) translateX(0); } to { transform: translateY(106vh) translateX(var(--drift)); } }
      `}</style>
      {flakes.map((_, i) => {
        const left = (i * 29.3) % 100;
        const size = 1.5 + (i % 4) * 0.9;
        const duration = 14 + (i % 7) * 3;
        const delay = -(i * 1.7) % duration;
        const drift = (i % 2 === 0 ? 1 : -1) * (10 + (i % 5) * 6);
        return (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              opacity: 0.18 + (i % 5) * 0.07,
              animation: `snowDrift ${duration}s linear infinite`,
              animationDelay: `${delay}s`,
              ["--drift"]: `${drift}px`,
            }}
          />
        );
      })}
    </div>
  );
}

function RidgeDivider({ opacity = 0.3, height = 12 }) {
  return (
    <svg viewBox="0 0 400 12" preserveAspectRatio="none" className="w-full block" style={{ height }}>
      <polyline points="0,3 30,9 60,2 95,8 130,3 165,10 200,3 235,9 270,2 305,8 340,3 375,9 400,4" fill="none" stroke="white" strokeWidth="1.5" opacity={opacity} />
    </svg>
  );
}

/* Purpose-drawn sport icons for the opening screen — a real pair of
   skis (two tip-curved planks with poles) and an actual snowboard
   (single wider deck with binding straps). Both use currentColor so
   they invert cleanly against the hover state. */
function SkiIcon({ size = 34, color = "currentColor" }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      {/* left ski — shaft with an upturned tip */}
      <path d="M11 28 L11 9 Q11 5.5 8.4 4.2" strokeWidth="2.1" />
      {/* right ski */}
      <path d="M19 28 L19 9 Q19 5.5 16.4 4.2" strokeWidth="2.1" />
      {/* bindings */}
      <line x1="8.4" y1="17.5" x2="13.6" y2="17.5" strokeWidth="1.7" />
      <line x1="16.4" y1="17.5" x2="21.6" y2="17.5" strokeWidth="1.7" />
      {/* poles with baskets */}
      <line x1="4.5" y1="7" x2="4.5" y2="26" strokeWidth="1.4" opacity="0.75" />
      <line x1="2.9" y1="23" x2="6.1" y2="23" strokeWidth="1.4" opacity="0.75" />
      <line x1="25.5" y1="7" x2="25.5" y2="26" strokeWidth="1.4" opacity="0.75" />
      <line x1="23.9" y1="23" x2="27.1" y2="23" strokeWidth="1.4" opacity="0.75" />
    </svg>
  );
}

function SnowboardIcon({ size = 34, color = "currentColor" }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      {/* single deck — wider body, both tips curved (twin tip) */}
      <path
        d="M16 3.5 Q11 6 11 11 L11 21 Q11 26 16 28.5 Q21 26 21 21 L21 11 Q21 6 16 3.5 Z"
        strokeWidth="2.1"
      />
      {/* two binding straps, angled like a real stance */}
      <line x1="12" y1="11.8" x2="20" y2="10.2" strokeWidth="1.7" />
      <line x1="12" y1="21.8" x2="20" y2="20.2" strokeWidth="1.7" />
    </svg>
  );
}

/* The rider wearing the full matched setup, drawn as flat line art:
   every shape is a solid fill with a dark outline, no gradients or
   shading. That style holds up at small sizes and, more importantly,
   stays legible whatever colours the match throws at it - a photoreal
   render would fight the palette rather than show it.

   Each region is filled with that category's actual matched colour, and
   the trouser silhouette follows the recommended FIT, so a baggy park
   pant and a slim race pant read as different garments rather than the
   same shape in a different colour. */
const INK = "#15171B";

/* Trouser silhouettes by fit. Each entry gives the half-width of the leg
   at the hip and at the ankle; baggy stays wide all the way down and
   breaks over the boot, slim tapers hard. */
const PANT_SHAPE = {
  slim:    { hip: 10, ankle: 6.5, folds: 0 },
  regular: { hip: 12, ankle: 9,   folds: 1 },
  baggy:   { hip: 14, ankle: 14,  folds: 2 },
};

function luminance(hex) {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6) return 0.5;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return 0.5;
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/* Seam lines - zips, hems, vents, pockets - are drawn in ink at low
   opacity, which disappears entirely on a black jacket. Flip them to
   white there, so an all-black kit still shows its construction instead
   of rendering as one solid blob. The outlines stay ink either way,
   since those have to read against the pale plate behind the rider. */
function detailInk(fill) {
  return luminance(fill) < 0.42 ? "#FFFFFF" : INK;
}

function legPath(cxTop, cxBot, shape, yTop, yBot) {
  const { hip, ankle } = shape;
  // slight outward bow at the knee so the leg reads as a limb, not a plank
  const kneeY = yTop + (yBot - yTop) * 0.52;
  const knee = (hip + ankle) / 2 + 1.5;
  const cxKnee = (cxTop + cxBot) / 2;
  return [
    `M ${cxTop - hip} ${yTop}`,
    `L ${cxTop + hip} ${yTop}`,
    `Q ${cxKnee + knee} ${kneeY} ${cxBot + ankle} ${yBot}`,
    `L ${cxBot - ankle} ${yBot}`,
    `Q ${cxKnee - knee} ${kneeY} ${cxTop - hip} ${yTop}`,
    "Z",
  ].join(" ");
}

function GearFigure({ colors, sport, pantFit = "regular" }) {
  const { helmet, goggles, jacket, gloves, pants, skis } = colors;
  const skin = "#C9B49C";
  const neutral = "#6B6B70";
  const shape = PANT_SHAPE[pantFit] || PANT_SHAPE.regular;
  const line = { stroke: INK, strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" };

  const hardInk = detailInk(skis || neutral);
  const jacketInk = detailInk(jacket || neutral);
  const pantsInk = detailInk(pants || neutral);
  const helmetInk = detailInk(helmet || "#2A2A2E");

  return (
    <svg viewBox="16 10 140 246" width="100%" height="252" style={{ maxWidth: 195 }}>
      {/* Paper plate. The ink outlines are near-black, so without a light
          ground an all-black kit renders as a black shape on a black card
          and the whole drawing disappears. Same white tile the product
          thumbnails sit on, so it reads as deliberate rather than stray.
          Bounds track the viewBox, which is cropped to the rider. */}
      <rect x="16" y="10" width="140" height="246" rx="10" fill="#F5F2EC" />

      {/* ---- hardgoods, behind the rider ---- */}
      {sport === "snowboard" ? (
        <g {...line}>
          <rect x="104" y="34" width="32" height="208" rx="15" fill={skis || neutral} />
          <rect x="99" y="96" width="42" height="9" rx="4.5" fill={hardInk} opacity="0.55" transform="rotate(-8 120 100)" />
          <rect x="99" y="176" width="42" height="9" rx="4.5" fill={hardInk} opacity="0.55" transform="rotate(-8 120 180)" />
        </g>
      ) : (
        <g {...line}>
          <path d="M 98 56 Q 98 38 109 34 Q 120 38 120 56 L 119 236 Q 119 242 109 242 Q 99 242 98 236 Z" fill={skis || neutral} />
          <path d="M 122 56 Q 122 38 133 34 Q 144 38 144 56 L 143 236 Q 143 242 133 242 Q 123 242 122 236 Z" fill={skis || neutral} />
          <rect x="96" y="128" width="26" height="9" rx="3" fill={hardInk} opacity="0.55" />
          <rect x="120" y="128" width="26" height="9" rx="3" fill={hardInk} opacity="0.55" />
        </g>
      )}

      {/* ---- trousers: silhouette varies with the recommended fit ---- */}
      <g {...line}>
        <path d={legPath(57, 52, shape, 134, 228)} fill={pants || neutral} />
        <path d={legPath(81, 85, shape, 134, 228)} fill={pants || neutral} />
        {/* seat/waist band ties the two legs together */}
        <path d="M 45 134 Q 69 128 93 134 L 93 142 Q 69 136 45 142 Z" fill={pants || neutral} />
        {/* cargo pocket - only on the roomier cuts, where they actually live */}
        {shape.folds > 0 && (
          <>
            <rect x="40" y="168" width="13" height="16" rx="3" fill={pantsInk} stroke={pantsInk} opacity="0.3" strokeWidth="1.4" />
            <rect x="88" y="168" width="13" height="16" rx="3" fill={pantsInk} stroke={pantsInk} opacity="0.3" strokeWidth="1.4" />
          </>
        )}
        {/* boot break - baggy fabric stacks over the cuff */}
        {shape.folds > 1 && (
          <>
            <path d="M 42 214 Q 52 210 64 214" fill="none" stroke={pantsInk} strokeWidth="1.4" opacity="0.55" />
            <path d="M 74 214 Q 85 210 97 214" fill="none" stroke={pantsInk} strokeWidth="1.4" opacity="0.55" />
          </>
        )}
      </g>

      {/* ---- boots ---- */}
      <g {...line}>
        <path d="M 43 226 Q 39 226 39 231 L 37 240 Q 37 243 40 243 L 64 243 Q 67 243 67 240 L 65 231 Q 65 226 61 226 Z" fill={neutral} />
        <path d="M 75 226 Q 71 226 71 231 L 69 240 Q 69 243 72 243 L 96 243 Q 99 243 99 240 L 97 231 Q 97 226 93 226 Z" fill={neutral} />
        <path d="M 41 234 L 65 234" strokeWidth="1.4" opacity="0.5" />
        <path d="M 73 234 L 97 234" strokeWidth="1.4" opacity="0.5" />
      </g>

      {/* ---- jacket ---- */}
      <g {...line}>
        <path
          d="M 43 66 Q 37 72 39 84 Q 43 104 46 120 Q 46.5 132 47 142 L 91 142 Q 91.5 132 92 120 Q 95 104 99 84 Q 101 72 95 66 Q 82 59 69 59 Q 56 59 43 66 Z"
          fill={jacket || neutral}
        />
        {/* hem band, cuffs and centre zip - the details that say "shell" */}
        <path d="M 47 134 L 91 134" stroke={jacketInk} strokeWidth="1.6" opacity="0.55" />
        <path d="M 69 63 L 69 134" stroke={jacketInk} strokeWidth="1.6" opacity="0.5" />
        <rect x="74" y="88" width="14" height="11" rx="3" fill={jacketInk} stroke={jacketInk} opacity="0.28" strokeWidth="1.4" />
      </g>

      {/* ---- arms ---- */}
      <g {...line}>
        {/* Sleeves are strokes, not fills, so the outline is faked by laying
            a wider ink stroke underneath - stroking a stroke would just put
            a line down the middle of the arm. */}
        <path d="M 45 71 Q 34 86 34 103 Q 34 119 37 131" fill="none" strokeWidth="21" />
        <path d="M 45 71 Q 34 86 34 103 Q 34 119 37 131" fill="none" stroke={jacket || neutral} strokeWidth="17" />
        <path d="M 93 71 Q 103 64 108 56 L 106 40" fill="none" strokeWidth="21" />
        <path d="M 93 71 Q 103 64 108 56 L 106 40" fill="none" stroke={jacket || neutral} strokeWidth="17" />
        <rect x="28" y="127" width="18" height="15" rx="6" fill={gloves || neutral} />
        <rect x="98" y="31" width="18" height="15" rx="6" fill={gloves || neutral} />
      </g>

      {/* ---- collar, neck, head ---- */}
      <g {...line}>
        <path d="M 50 61 Q 69 75 88 61 L 88 69 Q 69 82 50 69 Z" fill={jacket || neutral} />
        <rect x="63" y="49" width="12" height="14" rx="4" fill={skin} />
        <circle cx="69" cy="36" r="16" fill={skin} />
      </g>

      {/* ---- helmet: crown only, stopping above the brow so the goggles
              have somewhere to sit ---- */}
      <g {...line}>
        <path d="M 49 33 A 20 17 0 0 1 89 33 Q 89 38 85 39 L 53 39 Q 49 38 49 33 Z" fill={helmet || "#2A2A2E"} />
        {/* vents */}
        <path d="M 60 23 L 60 29" stroke={helmetInk} strokeWidth="1.6" opacity="0.5" />
        <path d="M 69 21 L 69 28" stroke={helmetInk} strokeWidth="1.6" opacity="0.5" />
        <path d="M 78 23 L 78 29" stroke={helmetInk} strokeWidth="1.6" opacity="0.5" />
        {/* ear pad */}
        <path d="M 50 37 Q 46 43 50 48 Q 54 44 53 39 Z" fill={helmet || "#2A2A2E"} strokeWidth="1.6" />
      </g>

      {/* ---- goggles: drawn last so they sit on top of the helmet rim,
              with the strap running back over the shell ---- */}
      <g {...line}>
        <path d="M 49 41 Q 44 41 43 37" fill="none" strokeWidth="4" stroke={INK} />
        <path d="M 89 41 Q 94 41 95 37" fill="none" strokeWidth="4" stroke={INK} />
        <rect x="48" y="37" width="42" height="15" rx="7.5" fill={INK} />
        <rect x="51.5" y="39.5" width="35" height="10" rx="5" fill={goggles || "#3A6EA5"} strokeWidth="1.4" />
        {/* lens glint */}
        <path d="M 57 42 L 71 46 L 66 48.5 L 55 45 Z" fill="#FFFFFF" opacity="0.3" stroke="none" />
      </g>
    </svg>
  );
}

/* Numbered section for the About page. Long-form prose is the one place
   in this app that needs a comfortable reading measure, so the body is
   capped rather than filling the container. */
function AboutSection({ n, title, children }) {
  return (
    <section className="mb-11">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-xs font-bold tracking-[0.2em] text-white/30 tabular-nums">{n}</span>
        <h2 className="font-['Barlow_Condensed'] font-bold text-2xl uppercase tracking-wide leading-none">{title}</h2>
      </div>
      <div className="pl-0 sm:pl-9 max-w-xl text-sm text-white/60 leading-relaxed space-y-3.5">{children}</div>
    </section>
  );
}

function SkierMarker({ sport }) {
  if (sport === "snowboard") {
    return (
      <svg viewBox="0 0 24 24" width="26" height="26" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.9))" }}>
        {/* board, grabbed and angled mid-air rather than lying flat -
            reads as an actual jump instead of a standing stance */}
        <rect x="9.5" y="12.6" width="13.5" height="2.2" rx="1.1" fill="white" transform="rotate(38 16.25 13.7)" />
        {/* compact knees-up body, tucked for the grab */}
        <path
          d="M13.2 4.8
             C15.2 4.5 16.8 6.2 16.2 8.2
             C15.5 10.6 13.4 12.7 10.7 13.8
             C9.2 14.4 7.9 13.1 8.9 11.7
             C10.5 9.4 11.9 6.9 12.2 5.6
             C12.3 5.2 12.7 4.9 13.2 4.8 Z"
          fill="white"
        />
        {/* reaching arm, down to the grab */}
        <path d="M10.8 10 L8.6 13.2" stroke="white" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        {/* extended arm, out for balance */}
        <path d="M14.6 6 L19.2 4.3" stroke="white" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        {/* head */}
        <circle cx="14" cy="4" r="2.1" fill="white" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.9))" }}>
      {/* skis - steeper angle than before for a real downhill lean,
          plus a couple of short spray flecks at the tips */}
      <rect x="1" y="18.6" width="17.5" height="1.5" rx="0.75" fill="white" transform="rotate(-17 9.75 19.35)" />
      <rect x="1.4" y="16.6" width="17.5" height="1.5" rx="0.75" fill="white" transform="rotate(-17 10.15 17.35)" opacity="0.88" />
      <path d="M1.5 20.2 L0 21.4 M2.6 21.8 L1.3 23.1" stroke="white" strokeWidth="0.9" opacity="0.5" strokeLinecap="round" />
      {/* compact, aggressively tucked body - shorter and more hunched
          than a standing lean, reading as speed rather than a static pose */}
      <path
        d="M15.8 6.2
           C17.6 6.5 18.2 8.5 16.9 10
           C14.8 12.4 11.6 14.6 8.2 16
           C7 16.5 6.1 15.4 7 14.3
           C9.6 11.1 12.6 8.2 14.7 6.5
           C15.1 6.2 15.5 6.1 15.8 6.2 Z"
        fill="white"
      />
      {/* front arm + pole, reaching low and forward like a racing tuck */}
      <path
        d="M12.8 9.2 L18.6 6.9 L20.8 10.2"
        stroke="white"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      {/* head, tucked low and forward of the body mass */}
      <circle cx="17" cy="4.6" r="2.1" fill="white" />
    </svg>
  );
}

function ElevationProgress({ step, total, sport }) {
  const pct = total <= 0 ? 0 : (step / total) * 100;
  return (
    <div className="relative w-full h-14 mb-8 select-none">
      <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full">
        <polyline points="0,55 40,30 80,45 130,10 180,38 230,20 280,42 330,15 400,35" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="3" />
        <polyline points="0,55 40,30 80,45 130,10 180,38 230,20 280,42 330,15 400,35" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="1000" strokeDashoffset={1000 - (pct / 100) * 460} style={{ transition: "stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1)" }} />
      </svg>
      <div className="absolute -top-2 flex flex-col items-center" style={{ left: `calc(${pct}% - 13px)`, transition: "left 0.55s cubic-bezier(0.4,0,0.2,1)" }}>
        <SkierMarker sport={sport} />
      </div>
    </div>
  );
}

function MountainField() {
  const dots = Array.from({ length: 90 });
  return (
    <div className="absolute inset-0 -z-10 bg-black overflow-hidden">
      <svg viewBox="0 0 1200 900" preserveAspectRatio="xMidYMax slice" className="w-full h-full">
        <defs>
          <pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="6" stroke="white" strokeWidth="0.6" /></pattern>
          <pattern id="hatch2" width="5" height="5" patternTransform="rotate(-45)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="5" stroke="white" strokeWidth="0.5" /></pattern>
        </defs>
        <g>{dots.map((_, i) => (<circle key={i} cx={(i * 131) % 1200} cy={(i * 67) % 420} r={i % 7 === 0 ? 1.6 : 0.9} fill="white" opacity={0.15 + ((i % 5) * 0.09)} />))}</g>
        <polygon points="0,900 0,560 130,410 270,540 420,340 570,510 710,360 850,530 1000,380 1140,500 1200,430 1200,900" fill="white" opacity="0.05" />
        <path d="M130,410 L150,450 M420,340 L445,385 M710,360 L735,405 M1000,380 L1025,420" stroke="white" strokeWidth="0.6" opacity="0.2" />
        <polygon points="0,900 0,660 110,500 250,630 390,450 540,620 680,460 820,640 970,490 1110,630 1200,540 1200,900" fill="white" opacity="0.09" />
        <polygon points="0,900 0,660 110,500 250,630 390,450 540,620 680,460 820,640 970,490 1110,630 1200,540 1200,900" fill="none" stroke="white" strokeWidth="1" opacity="0.25" />
        <polygon points="0,900 0,760 90,600 200,720 330,540 470,710 610,550 750,730 880,580 1020,720 1140,620 1200,680 1200,900" fill="url(#hatch)" opacity="0.35" />
        <polygon points="0,900 0,760 90,600 200,720 330,540 470,710 610,550 750,730 880,580 1020,720 1140,620 1200,680 1200,900" fill="none" stroke="white" strokeWidth="1.6" opacity="0.75" />
        <path d="M90,600 L115,640 M330,540 L358,585 M610,550 L638,595 M880,580 L908,622" stroke="white" strokeWidth="0.7" opacity="0.4" />
        <polygon points="0,900 0,820 80,780 180,830 300,770 420,825 560,775 700,830 840,780 980,825 1120,780 1200,810 1200,900" fill="url(#hatch2)" opacity="0.5" />
        <polygon points="0,900 0,820 80,780 180,830 300,770 420,825 560,775 700,830 840,780 980,825 1120,780 1200,810 1200,900" fill="none" stroke="white" strokeWidth="1.4" opacity="0.9" />
      </svg>
    </div>
  );
}

/* Product shots are hotlinked from brand CDNs, which rotate and retire URLs
   between seasons, so a dead image is a matter of when rather than if. The
   previous inline onError tried to reveal a sibling placeholder that React
   only rendered when `image` was absent entirely - so when a URL DID break,
   it hid the <img> and revealed nothing, leaving a blank gap in the card.
   Owning the failure in local state means a broken URL degrades to exactly
   the same colored icon panel that image-less items already use. */
function ProductImage({ item, category, sport, chosenColors }) {
  const [failed, setFailed] = useState(false);

  if (item.image && !failed) {
    return (
      <img
        src={item.image}
        alt={`${item.brand} ${item.name}`}
        className="w-full aspect-square object-contain rounded-lg border border-white/15 bg-white p-1"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  const overlap = item.colors.filter((c) => (chosenColors || []).includes(c));
  const primary = colorById[overlap[0] || item.colors[0]];
  const Icon =
    CATEGORY_ICON_FALLBACK[category] ||
    (category === "skis" ? (sport === "snowboard" ? SnowboardIcon : SkiIcon) : Shirt);
  return (
    <div
      className="w-full aspect-square rounded-lg border border-white/15 flex items-center justify-center"
      style={{ backgroundColor: primary?.hex || "#2A2A2E" }}
    >
      <Icon size={32} color={primary?.tone === "light" ? "#0B0B0C" : "#FFFFFF"} strokeWidth={1.8} />
    </div>
  );
}

function OptionCard({ selected, onClick, title, desc, icon: Icon, iconFilled, fillOpacity, double }) {
  return (
    <button
      onClick={onClick}
      className={`group text-left w-full rounded-xl border p-5 transition-all duration-200 flex items-start gap-4 backdrop-blur-sm active:scale-[0.99] ${
        selected ? "border-white bg-white text-black" : "border-white/18 bg-white/[0.04] text-white hover:border-white/50 hover:bg-white/[0.08] hover:-translate-y-0.5"
      }`}
    >
      {Icon && (
        <span className="mt-0.5 flex-shrink-0 flex items-center gap-0.5">
          <Icon size={22} color={selected ? "#000000" : "#FFFFFF"} strokeWidth={2.4} fill={iconFilled ? (selected ? "#000000" : "#FFFFFF") : "none"} fillOpacity={iconFilled ? fillOpacity ?? 1 : 0} />
          {double && <Icon size={22} color={selected ? "#000000" : "#FFFFFF"} strokeWidth={2.4} fill={selected ? "#000000" : "#FFFFFF"} />}
        </span>
      )}
      <span className="flex-1">
        <span className={`block font-['Barlow_Condensed'] font-bold text-lg tracking-wide uppercase ${selected ? "text-black" : "text-white"}`}>{title}</span>
        {desc && <span className={`block text-sm mt-0.5 leading-snug ${selected ? "text-black/70" : "text-white/60"}`}>{desc}</span>}
      </span>
      {selected && <span className="flex-shrink-0 mt-1"><Check size={18} color="#000000" strokeWidth={3} /></span>}
    </button>
  );
}

function Swatch({ color, selected, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled && !selected}
      title={color.label}
      className={`relative rounded-xl border p-2 flex flex-col items-center gap-2 transition-all duration-150 ${
        selected
          ? "border-white bg-white/[0.12] -translate-y-0.5"
          : disabled
          ? "border-white/10 opacity-35 cursor-not-allowed"
          : "border-white/15 hover:border-white/50 hover:-translate-y-0.5 active:scale-95"
      }`}
    >
      <span className="w-full aspect-square rounded-lg border border-white/20 flex items-center justify-center" style={{ backgroundColor: color.hex }}>
        {selected && <Check size={18} strokeWidth={3.5} color={color.tone === "dark" ? "#FFFFFF" : "#0B0B0C"} />}
      </span>
      <span className={`text-[10px] uppercase tracking-wide font-semibold leading-none ${selected ? "text-white" : "text-white/50"}`}>{color.label}</span>
    </button>
  );
}

function MountainHero({ sport }) {
  return <div className="relative w-full h-[400px] overflow-hidden" />;
}

function Chip({ children }) {
  return <span className="text-xs uppercase tracking-wide font-semibold border border-white/25 bg-white/[0.04] rounded-full px-3 py-1.5 text-white/80">{children}</span>;
}

export default function SlopeFit() {
  const [phase, setPhase] = useState("sport-select");
  const stats = useMemo(() => catalogStats(), []);
  const [sport, setSport] = useState(null); // "ski" | "snowboard"
  const [previousPhase, setPreviousPhase] = useState("intro");
  const [currency, setCurrency] = useState("CAD");
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [clickedPlan, setClickedPlan] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [units, setUnits] = useState("metric");
  const [feet, setFeet] = useState("");
  const [inches, setInches] = useState("");
  const [pounds, setPounds] = useState("");
  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authStatus, setAuthStatus] = useState(null); // null | "sending" | "sent" | "error" | "rate_limited"
  const [authRetryAt, setAuthRetryAt] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({ terrain: [], style: [], colors: [] });
  const [picks, setPicks] = useState({});

  const STEPS = sport === "snowboard" ? SNOWBOARD_STEPS : SKI_STEPS;
  const currentKey = STEPS[stepIndex];

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [stepIndex, phase]);

  // Check for an existing logged-in session on load, and keep `user` in
  // sync any time someone signs in or out - including the moment they
  // click a magic link and land back on the site. If they were on the
  // Premium page when they requested the link, send them back there
  // instead of dumping them at sport-select - clicking a sign-in link
  // shouldn't undo their progress through the app.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user && localStorage.getItem("slopefit_return_to_premium")) {
        const savedSport = localStorage.getItem("slopefit_sport");
        if (savedSport) setSport(savedSport);
        setPhase("premium");
        localStorage.removeItem("slopefit_return_to_premium");
        localStorage.removeItem("slopefit_sport");
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Whenever the logged-in user changes, check their actual premium
  // status from the profiles table - this is the one flag every
  // premium-gated feature in the app checks. Cleared immediately on
  // sign-out so a stale "premium" state can't linger after logging out.
  useEffect(() => {
    if (!user) {
      setIsPremium(false);
      return;
    }
    supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to fetch premium status:", error.message, error);
          setIsPremium(false);
        } else if (data) {
          setIsPremium(!!data.is_premium);
        }
      });
  }, [user]);

  async function sendMagicLink(e) {
    e.preventDefault();
    if (!authEmail) return;
    const recentAttempts = getRecentAuthAttempts();
    if (recentAttempts.length >= AUTH_ATTEMPT_LIMIT) {
      setAuthRetryAt(Math.min(...recentAttempts) + AUTH_ATTEMPT_WINDOW_MS);
      setAuthStatus("rate_limited");
      return;
    }
    recordAuthAttempt();
    setAuthStatus("sending");
    localStorage.setItem("slopefit_return_to_premium", "true");
    if (sport) localStorage.setItem("slopefit_sport", sport);
    const { error } = await supabase.auth.signInWithOtp({ email: authEmail });
    setAuthStatus(error ? "error" : "sent");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAuthEmail("");
    setAuthStatus(null);
  }

  function chooseSport(s) {
    setSport(s);
    setPhase("intro");
  }

  function goToPremium() {
    setPreviousPhase(phase);
    setPhase("premium");
    setClickedPlan(null);
  }

  function goToAbout() {
    setPreviousPhase(phase);
    setPhase("about");
    window.scrollTo({ top: 0 });
  }

  const canAdvance = (() => {
    switch (currentKey) {
      case "gender": return !!answers.gender;
      case "ability": return !!answers.ability;
      case "stance": return !!answers.stance;
      case "terrain": return (answers.terrain || []).length > 0;
      case "style": return (answers.style || []).length > 0;
      case "fit": return !!answers.heightCm && !!answers.weightKg;
      case "colors": return (answers.colors || []).length > 0;
      case "budget": return !!answers.budget;
      default: return false;
    }
  })();

  const { rankings, fit, pantFit, skiLength, boardLength, size } = useMemo(() => {
    if (phase !== "results") return { rankings: {}, fit: "regular", pantFit: "baggy", skiLength: null, boardLength: null, size: null };
    return buildRankings(answers, sport);
  }, [phase, answers, sport]);

  const setup = useMemo(() => {
    const out = {};
    Object.entries(rankings).forEach(([cat, list]) => {
      const idx = picks[cat] ?? 0;
      out[cat] = list[idx % list.length];
    });
    return out;
  }, [rankings, picks]);

  const total = useMemo(() => Object.values(setup).reduce((s, i) => s + (i?.price || 0), 0), [setup]);

  const selectAnswer = (k, v) => setAnswers((p) => ({ ...p, [k]: v }));
  const toggleAnswer = (k, v) =>
    setAnswers((p) => {
      const arr = p[k] || [];
      return { ...p, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
    });
  const toggleColor = (id) =>
    setAnswers((p) => {
      const arr = p.colors || [];
      if (arr.includes(id)) return { ...p, colors: arr.filter((c) => c !== id) };
      if (arr.length >= MAX_COLORS) return p;
      return { ...p, colors: [...arr, id] };
    });
  const updateMeasure = (k, v) => setAnswers((p) => ({ ...p, [k]: v === "" ? undefined : Number(v) }));

  // Imperial entries convert straight into the metric values everything
  // downstream already expects, so no sizing calculation had to change.
  useEffect(() => {
    if (units !== "imperial") return;
    const ft = Number(feet);
    const inch = Number(inches) || 0;
    if (!ft) {
      setAnswers((p) => ({ ...p, heightCm: undefined }));
      return;
    }
    const cm = Math.round((ft * 12 + inch) * 2.54);
    setAnswers((p) => ({ ...p, heightCm: cm }));
  }, [feet, inches, units]);

  useEffect(() => {
    if (units !== "imperial") return;
    const lb = Number(pounds);
    if (!lb) {
      setAnswers((p) => ({ ...p, weightKg: undefined }));
      return;
    }
    setAnswers((p) => ({ ...p, weightKg: Math.round(lb * 0.453592) }));
  }, [pounds, units]);


  function next() {
    if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1);
    else { setPicks({}); setPhase("results"); }
  }
  const back = () => stepIndex > 0 && setStepIndex(stepIndex - 1);
  function restart() {
    setAnswers({ terrain: [], style: [], colors: [] });
    setPicks({});
    setStepIndex(0);
    setPhase("intro");
  }
  const swap = (cat) =>
    setPicks((p) => {
      const used = p[cat] ?? 0;
      if (!isPremium && used >= 1) return p; // one free re-search per item for everyone else - unlimited for Premium
      return { ...p, [cat]: (used + 1) % (rankings[cat]?.length || 1) };
    });

  const chosenColors = (answers.colors || []).map((id) => colorById[id]).filter(Boolean);

  if (phase === "sport-select") {
    return (
      <div className="relative min-h-screen w-full text-white flex flex-col items-center justify-center px-6" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
        <style>{FONT_IMPORT}</style>
        <MountainField />
        <SnowFall />
        <div className="relative flex items-center gap-2 mb-10">
          <Mountain size={26} color="#FFFFFF" strokeWidth={2.6} />
          <span className="font-['Barlow_Condensed'] font-black text-2xl tracking-wide uppercase">SlopeFit</span>
        </div>
        <p className="relative text-xs uppercase tracking-[0.2em] text-white/60 font-bold mb-3">Before we start</p>
        <h1 className="relative font-['Barlow_Condensed'] font-black text-4xl sm:text-5xl uppercase tracking-tight text-center mb-10 leading-[0.95]">
          What are you<br />riding this season?
        </h1>
        <div className="relative grid sm:grid-cols-2 gap-4 w-full max-w-md">
          <button
            onClick={() => chooseSport("ski")}
            className="group rounded-xl border border-white/25 bg-white/[0.04] p-6 flex flex-col items-center gap-3 hover:border-white hover:bg-white transition-colors text-center"
          >
            <span className="text-white group-hover:text-black transition-colors">
              <SkiIcon size={34} />
            </span>
            <span className="font-['Barlow_Condensed'] font-black text-xl uppercase tracking-wide group-hover:text-black">Ski</span>
            <span className="text-xs text-white/45 group-hover:text-black/60">Skis and a full coordinated kit</span>
          </button>
          <button
            onClick={() => chooseSport("snowboard")}
            className="group rounded-xl border border-white/25 bg-white/[0.04] p-6 flex flex-col items-center gap-3 hover:border-white hover:bg-white transition-colors text-center"
          >
            <span className="text-white group-hover:text-black transition-colors">
              <SnowboardIcon size={34} />
            </span>
            <span className="font-['Barlow_Condensed'] font-black text-xl uppercase tracking-wide group-hover:text-black">Snowboard</span>
            <span className="text-xs text-white/45 group-hover:text-black/60">Board and a full coordinated kit</span>
          </button>
        </div>
        <p className="relative text-xs text-white/30 mt-8 max-w-xs text-center leading-relaxed">
          You can switch anytime from the home page.
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full text-white" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <style>{`
        @keyframes slopefitIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        button:focus-visible, a:focus-visible, input:focus-visible {
          outline: 2px solid white;
          outline-offset: 2px;
          border-radius: 4px;
        }
      `}</style>
      <MountainField />
      <SnowFall />

      <div className="w-full bg-black/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <button onClick={restart} className="flex items-center gap-2 flex-shrink-0 group" aria-label="Return to SlopeFit home">
            <Mountain size={22} color="#FFFFFF" strokeWidth={2.6} className="group-hover:scale-110 transition-transform" />
            <span className="font-['Barlow_Condensed'] font-black text-xl tracking-wide uppercase">SlopeFit</span>
          </button>

          <div className="relative flex-shrink-0">
            {currencyMenuOpen && <div className="fixed inset-0 z-20" onClick={() => setCurrencyMenuOpen(false)} />}
            <button
              onClick={() => setCurrencyMenuOpen((o) => !o)}
              className="flex items-center gap-1 text-xs uppercase tracking-widest font-semibold text-white/45 hover:text-white transition-colors border border-white/15 hover:border-white/40 rounded-full px-2.5 py-1.5"
              aria-label="Change currency"
              aria-expanded={currencyMenuOpen}
            >
              <Globe size={12} /> {currency} <ChevronDown size={12} className={currencyMenuOpen ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>
            {currencyMenuOpen && (
              <div className="absolute left-0 top-full mt-2 bg-black border border-white/20 rounded-lg overflow-hidden z-30 min-w-[190px] shadow-xl">
                {Object.values(CURRENCIES).map((c) => (
                  <button
                    key={c.code}
                    onClick={() => { setCurrency(c.code); setCurrencyMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold tracking-wide hover:bg-white/10 transition-colors flex items-center justify-between ${currency === c.code ? "text-white bg-white/5" : "text-white/55"}`}
                  >
                    {c.label}
                    {currency === c.code && <Check size={13} strokeWidth={3} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            {phase !== "premium" && (
              <button
                onClick={goToPremium}
                className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold border border-white text-white px-2.5 sm:px-3.5 py-2 rounded-full hover:bg-white hover:text-black transition-colors"
                aria-label="View Premium plans"
              >
                <Crown size={13} /> <span className="hidden sm:inline">Premium</span>
              </button>
            )}
            {phase === "intro" ? (
              <button onClick={() => setPhase("quiz")} className="text-xs uppercase tracking-widest font-bold bg-white text-black px-4 py-2 rounded-full hover:bg-white/85 transition-colors flex-shrink-0">Start</button>
            ) : phase !== "premium" && phase !== "about" && (
              <span className="text-xs uppercase tracking-widest text-white/50 font-semibold flex-shrink-0">
                {phase === "quiz" ? `Step ${stepIndex + 1} / ${STEPS.length}` : "Your Setup"}
              </span>
            )}
          </div>
        </div>
        {phase === "intro" && (
          <div className="max-w-3xl mx-auto px-6 pb-3 flex items-center gap-5 overflow-x-auto">
            {NAV_TABS.map((t) => (
              <button key={t.id} onClick={() => scrollToSection(t.id)} className="text-xs uppercase tracking-widest font-semibold text-white/55 hover:text-white transition-colors whitespace-nowrap flex-shrink-0">{t.label}</button>
            ))}
          </div>
        )}
        <RidgeDivider />
      </div>

      {phase === "intro" && (
        <div id="home" className="relative">
          <MountainHero sport={sport} />
          <div className="absolute inset-0 flex flex-col justify-end">
            <div className="max-w-3xl mx-auto px-6 pb-9 w-full">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold mb-3">{sport === "snowboard" ? "Eight questions" : "Seven questions"}. One coordinated setup.</p>
              <h1 className="font-['Barlow_Condensed'] font-black text-5xl sm:text-6xl leading-[0.95] uppercase tracking-tight text-white">Find your<br />perfect line.</h1>
            </div>
          </div>
        </div>
      )}

      <div className="relative max-w-3xl mx-auto px-6 py-10">
        {phase === "intro" && (
          <div className="pb-6">
            <div className="pt-2 pb-10">
              <p className="text-base text-white/60 max-w-md mb-8 leading-relaxed">
                A quick style-and-fit quiz that turns your answers into a complete, color-matched{" "}
                {sport === "snowboard" ? "snowboard setup — board to gloves" : "ski setup — skis to gloves"} — ready to shop.
              </p>
              <button onClick={() => setPhase("quiz")} className="bg-white text-black font-['Barlow_Condensed'] font-bold uppercase tracking-wide text-lg px-8 py-3.5 rounded-lg hover:bg-white/85 transition-all hover:-translate-y-0.5 flex items-center gap-2">
                Start the fit check <ChevronRight size={20} />
              </button>

              <p className="text-sm text-white/45 mt-8 pt-6 border-t border-white/10 max-w-md leading-relaxed">
                Matched against <span className="text-white font-semibold">{stats.brands} real brands</span> across{" "}
                <span className="text-white font-semibold">{stats.products} products</span> and{" "}
                <span className="text-white font-semibold">{stats.categories} gear categories</span> — not a generic catalog.
              </p>
            </div>

            <div id="how-it-works" className="py-10 border-t border-white/10 scroll-mt-28">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50 font-bold mb-2">How it works</p>
              <h2 className="font-['Barlow_Condensed'] font-black text-3xl uppercase tracking-tight mb-6">Three steps to your setup.</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {HOW_IT_WORKS.map((step, i) => (
                  <div key={step.title} className="rounded-xl border border-white/16 bg-white/[0.04] p-5 hover:border-white/30 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <step.icon size={20} color="#FFFFFF" strokeWidth={2.2} />
                      <span className="text-xs font-bold text-white/35">0{i + 1}</span>
                    </div>
                    <h3 className="font-['Barlow_Condensed'] font-bold text-lg uppercase tracking-wide mb-1">{step.title.includes("questions") && sport === "snowboard" ? "Answer eight questions" : step.title}</h3>
                    <p className="text-sm text-white/55 leading-relaxed">
                      {i === 0 && sport === "snowboard"
                        ? "Gender, ability, stance, terrain, style, build, colors, budget — under a minute."
                        : step.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div id="features" className="py-10 border-t border-white/10 scroll-mt-28">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50 font-bold mb-2">What you get</p>
              <h2 className="font-['Barlow_Condensed'] font-black text-3xl uppercase tracking-tight mb-6">Six pieces, one look.</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {GEAR_PREVIEW.map((g) => (
                  <div key={g.label} className="rounded-xl border border-white/16 bg-white/[0.04] p-4 flex flex-col items-start gap-2 hover:border-white/30 hover:bg-white/[0.07] transition-colors">
                    <g.icon size={20} color="#FFFFFF" strokeWidth={2.2} />
                    <span className="font-['Barlow_Condensed'] font-bold text-sm uppercase tracking-wide">{g.label === "Skis" ? categoryLabel("skis", sport) : g.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div id="why" className="py-10 border-t border-white/10 scroll-mt-28">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Why SlopeFit</p>
              <h2 className="font-['Barlow_Condensed'] font-black text-3xl uppercase tracking-tight mb-6">Built to actually match.</h2>
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                {WHY_ITEMS.map((w) => (
                  <div key={w.title} className="rounded-xl border border-white/16 bg-white/[0.04] p-5 hover:border-white/30 transition-colors">
                    <w.icon size={22} color="#FFFFFF" strokeWidth={2.2} className="mb-3" />
                    <h3 className="font-['Barlow_Condensed'] font-bold text-lg uppercase tracking-wide mb-1">{w.title}</h3>
                    <p className="text-sm text-white/55 leading-relaxed">{w.desc}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setPhase("quiz")} className="bg-white text-black font-['Barlow_Condensed'] font-bold uppercase tracking-wide text-lg px-8 py-3.5 rounded-lg hover:bg-white/85 transition-all hover:-translate-y-0.5 flex items-center gap-2">
                Start the fit check <ChevronRight size={20} />
              </button>
            </div>

            <footer className="pt-8 mt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Wraps rather than overflowing - the footer container is only
                  768px and now carries three links beside the disclosure.
                  Separators are gaps, not left-borders, because a border
                  reads as a stray mark once an item wraps to its own line. */}
              <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <Mountain size={16} color="#FFFFFF" strokeWidth={2.6} opacity={0.6} />
                  <span className="font-['Barlow_Condensed'] font-bold text-sm tracking-wide uppercase text-white/60">SlopeFit</span>
                </div>
                <button
                  onClick={() => setPhase("sport-select")}
                  className="text-xs uppercase tracking-widest font-semibold text-white/50 hover:text-white transition-colors whitespace-nowrap"
                >
                  Switch to {sport === "snowboard" ? "Skiing" : "Snowboarding"}
                </button>
                <button
                  onClick={goToAbout}
                  className="text-xs uppercase tracking-widest font-semibold text-white/50 hover:text-white transition-colors whitespace-nowrap"
                >
                  How we pick
                </button>
              </div>
              {/* The affiliate disclosure has to be legible to count as one.
                  At white/35 over the crosshatch it was effectively invisible
                  on mobile, which is both an FTC "clear and conspicuous"
                  problem and something networks check for at review. */}
              <p className="text-xs text-white/70 max-w-md sm:text-right leading-relaxed">
                Some links may be affiliate links — we may earn a commission at no extra cost to you, and it
                never influences which gear gets recommended.
                <br />
                Not affiliated with or endorsed by any brand shown. Prices and availability change —
                confirm on the retailer's page before buying.
              </p>
            </footer>
          </div>
        )}

        {phase === "quiz" && (
          <div key={currentKey} style={{ animation: "slopefitIn 0.35s ease" }}>
            <ElevationProgress step={stepIndex} total={STEPS.length - 1} sport={sport} />

            {currentKey === "gender" && (
              <div>
                <h2 className="font-['Barlow_Condensed'] font-black text-3xl uppercase tracking-wide mb-1">Who are we kitting out?</h2>
                <p className="text-sm text-white/50 mb-6">Sets which cuts and sizing we pull from — so you never get sent the wrong fit.</p>
                <div className="grid gap-3">
                  {GENDERS.map((g) => (<OptionCard key={g.id} selected={answers.gender === g.id} onClick={() => selectAnswer("gender", g.id)} title={g.label} desc={g.desc} icon={g.icon} />))}
                </div>
              </div>
            )}

            {currentKey === "ability" && (
              <div>
                <h2 className="font-['Barlow_Condensed'] font-black text-3xl uppercase tracking-wide mb-1">Where's your ability at?</h2>
                <p className="text-sm text-white/50 mb-6">Rated the way runs are, on the mountain. Pick one.</p>
                <div className="grid gap-3">
                  {ABILITY.map((a) => (<OptionCard key={a.id} selected={answers.ability === a.id} onClick={() => selectAnswer("ability", a.id)} title={a.label} desc={a.desc} icon={a.icon} iconFilled={a.filled} fillOpacity={a.fillOpacity} double={a.double} />))}
                </div>
              </div>
            )}

            {currentKey === "stance" && (
              <div>
                <h2 className="font-['Barlow_Condensed'] font-black text-3xl uppercase tracking-wide mb-1">What's your stance?</h2>
                <p className="text-sm text-white/50 mb-6">Which foot leads down the hill.</p>
                <div className="grid gap-3">
                  {STANCE.map((s) => (<OptionCard key={s.id} selected={answers.stance === s.id} onClick={() => selectAnswer("stance", s.id)} title={s.label} desc={s.desc} />))}
                </div>
              </div>
            )}

            {currentKey === "terrain" && (
              <div>
                <h2 className="font-['Barlow_Condensed'] font-black text-3xl uppercase tracking-wide mb-1">What terrain do you chase?</h2>
                <p className="text-sm text-white/50 mb-6">Pick as many as you like — we'll balance your setup across them.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {TERRAIN.map((t) => (<OptionCard key={t.id} selected={(answers.terrain || []).includes(t.id)} onClick={() => toggleAnswer("terrain", t.id)} title={t.label} desc={t.desc} icon={t.icon} />))}
                </div>
              </div>
            )}

            {currentKey === "style" && (
              <div>
                <h2 className="font-['Barlow_Condensed'] font-black text-3xl uppercase tracking-wide mb-1">What's your look?</h2>
                <p className="text-sm text-white/50 mb-6">Choose one or blend a few styles together.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {STYLE.map((s) => (<OptionCard key={s.id} selected={(answers.style || []).includes(s.id)} onClick={() => toggleAnswer("style", s.id)} title={s.label} desc={s.desc} />))}
                </div>
              </div>
            )}

            {currentKey === "fit" && (
              <div>
                <h2 className="font-['Barlow_Condensed'] font-black text-3xl uppercase tracking-wide mb-1">What's your build?</h2>
                <p className="text-sm text-white/50 mb-6">
                  {sport === "snowboard"
                    ? "Height and weight size your board length."
                    : "Height and weight size your ski length and lean the cut slimmer or baggier."}
                </p>

                {/* Unit toggle. Values are always stored in cm/kg internally
                    so every sizing calculation downstream is untouched -
                    imperial entries are converted on the way in. */}
                <div className="inline-flex rounded-lg border border-white/20 overflow-hidden mb-5">
                  {[
                    { id: "metric", label: "cm / kg" },
                    { id: "imperial", label: "ft·in / lb" },
                  ].map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setUnits(u.id)}
                      className={`px-4 py-2 text-xs uppercase tracking-widest font-bold transition-colors ${
                        units === u.id ? "bg-white text-black" : "text-white/50 hover:text-white"
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>

                {units === "metric" ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="rounded-xl border border-white/18 bg-white/[0.04] p-5 flex flex-col gap-2 focus-within:border-white/60 transition-colors">
                      <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/50 font-semibold"><Ruler size={15} /> Height (cm)</span>
                      <input type="number" inputMode="numeric" min={100} max={230} placeholder="e.g. 175" value={answers.heightCm ?? ""} onChange={(e) => updateMeasure("heightCm", e.target.value)} className="bg-transparent text-white text-2xl font-['Barlow_Condensed'] font-bold outline-none placeholder-white/25 border-b border-white/20 focus:border-white pb-1 transition-colors" />
                    </label>
                    <label className="rounded-xl border border-white/18 bg-white/[0.04] p-5 flex flex-col gap-2 focus-within:border-white/60 transition-colors">
                      <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/50 font-semibold"><Shirt size={15} /> Weight (kg)</span>
                      <input type="number" inputMode="numeric" min={30} max={200} placeholder="e.g. 72" value={answers.weightKg ?? ""} onChange={(e) => updateMeasure("weightKg", e.target.value)} className="bg-transparent text-white text-2xl font-['Barlow_Condensed'] font-bold outline-none placeholder-white/25 border-b border-white/20 focus:border-white pb-1 transition-colors" />
                    </label>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-white/18 bg-white/[0.04] p-5 flex flex-col gap-2 focus-within:border-white/60 transition-colors">
                      <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/50 font-semibold"><Ruler size={15} /> Height</span>
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <input type="number" inputMode="numeric" min={3} max={7} placeholder="5" value={feet} onChange={(e) => setFeet(e.target.value)} className="w-full bg-transparent text-white text-2xl font-['Barlow_Condensed'] font-bold outline-none placeholder-white/25 border-b border-white/20 focus:border-white pb-1 transition-colors" />
                          <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">ft</span>
                        </div>
                        <div className="flex-1">
                          <input type="number" inputMode="numeric" min={0} max={11} placeholder="9" value={inches} onChange={(e) => setInches(e.target.value)} className="w-full bg-transparent text-white text-2xl font-['Barlow_Condensed'] font-bold outline-none placeholder-white/25 border-b border-white/20 focus:border-white pb-1 transition-colors" />
                          <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">in</span>
                        </div>
                      </div>
                      {answers.heightCm && <span className="text-[11px] text-white/35">= {answers.heightCm} cm</span>}
                    </div>
                    <label className="rounded-xl border border-white/18 bg-white/[0.04] p-5 flex flex-col gap-2 focus-within:border-white/60 transition-colors">
                      <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/50 font-semibold"><Shirt size={15} /> Weight (lb)</span>
                      <input type="number" inputMode="numeric" min={66} max={440} placeholder="e.g. 160" value={pounds} onChange={(e) => setPounds(e.target.value)} className="bg-transparent text-white text-2xl font-['Barlow_Condensed'] font-bold outline-none placeholder-white/25 border-b border-white/20 focus:border-white pb-1 transition-colors" />
                      {answers.weightKg && <span className="text-[11px] text-white/35">= {answers.weightKg} kg</span>}
                    </label>
                  </div>
                )}
                <p className="text-xs text-white/35 mt-4">Used only to size your gear. Nothing is stored or shared.</p>
              </div>
            )}

            {currentKey === "colors" && (
              <div>
                <h2 className="font-['Barlow_Condensed'] font-black text-3xl uppercase tracking-wide mb-1">Build your colorway.</h2>
                <p className="text-sm text-white/50 mb-5">
                  Pick up to {MAX_COLORS} colors and every piece gets matched to them. Lights, darks, and brights all in play.
                </p>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center flex-wrap gap-2 min-h-[44px]">
                    {chosenColors.length === 0 ? (
                      <span className="text-xs uppercase tracking-widest text-white/35 font-semibold">Nothing picked yet</span>
                    ) : (
                      chosenColors.map((c) => (
                        <button key={c.id} onClick={() => toggleColor(c.id)} title={`Remove ${c.label}`} aria-label={`Remove ${c.label} from your palette`} className="group relative w-11 h-11 rounded-full border-2 border-white/60 hover:border-white transition-colors flex items-center justify-center" style={{ backgroundColor: c.hex }}>
                          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={14} strokeWidth={3} color={c.tone === "dark" ? "#FFFFFF" : "#0B0B0C"} />
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                  <span className={`text-xs uppercase tracking-widest font-bold ${chosenColors.length >= MAX_COLORS ? "text-white" : "text-white/45"}`}>
                    {chosenColors.length} / {MAX_COLORS}
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                  {PALETTE.map((c) => (
                    <Swatch key={c.id} color={c} selected={(answers.colors || []).includes(c.id)} disabled={(answers.colors || []).length >= MAX_COLORS} onClick={() => toggleColor(c.id)} />
                  ))}
                </div>

                {chosenColors.length >= MAX_COLORS && (
                  <p className="text-xs text-white/40 mt-4">That's {MAX_COLORS} — remove one above to swap in a different shade.</p>
                )}
              </div>
            )}

            {currentKey === "budget" && (
              <div>
                <h2 className="font-['Barlow_Condensed'] font-black text-3xl uppercase tracking-wide mb-1">What's your budget?</h2>
                <p className="text-sm text-white/50 mb-6">Total across all six pieces.</p>
                <div className="grid gap-3">
                  {BUDGETS.map((b) => {
                    const range = b.minUSD && b.maxUSD
                      ? `${formatPrice(b.minUSD, currency)}–${formatPrice(b.maxUSD, currency)} total`
                      : b.maxUSD
                      ? `Under ${formatPrice(b.maxUSD, currency)} total`
                      : `${formatPrice(b.minUSD, currency)}+ total`;
                    return <OptionCard key={b.id} selected={answers.budget === b.id} onClick={() => selectAnswer("budget", b.id)} title={b.label} desc={`${b.desc} · ${range}`} icon={Wallet} />;
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-8">
              <button onClick={back} disabled={stepIndex === 0} className={`flex items-center gap-1 text-sm font-semibold uppercase tracking-wide transition-colors ${stepIndex === 0 ? "text-white/20 cursor-not-allowed" : "text-white/60 hover:text-white"}`}>
                <ChevronLeft size={18} /> Back
              </button>
              <button onClick={next} disabled={!canAdvance} className={`flex items-center gap-1 font-['Barlow_Condensed'] font-bold uppercase tracking-wide text-lg px-7 py-3 rounded-lg transition-all ${canAdvance ? "bg-white text-black hover:bg-white/85 hover:-translate-y-0.5" : "bg-white/10 text-white/30 cursor-not-allowed"}`}>
                {stepIndex === STEPS.length - 1 ? "See my setup" : "Next"} <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {phase === "results" && (
          <div style={{ animation: "slopefitIn 0.4s ease" }}>
            <RidgeDivider opacity={0.6} height={10} />
            <p className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold mt-4 mb-3">Your coordinated setup</p>
            <h2 className="font-['Barlow_Condensed'] font-black text-4xl uppercase tracking-tight mb-2">Ready to ride.</h2>
            <p className="text-sm text-white/45 mb-5">
              {[
                answers.gender && GENDER_LABELS[answers.gender],
                answers.ability && ABILITY.find((a) => a.id === answers.ability)?.label,
                (answers.terrain || []).map((t) => TERRAIN.find((x) => x.id === t)?.label).filter(Boolean).join(" + "),
                (answers.style || []).map((s) => STYLE.find((x) => x.id === s)?.label).filter(Boolean).join(" + "),
              ].filter(Boolean).join(" · ")}
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              {answers.gender && <Chip>{GENDER_LABELS[answers.gender]}</Chip>}
              <Chip>Jacket: {FIT_LABELS[fit]}</Chip>
              <Chip>Pants: {FIT_LABELS[pantFit]}</Chip>
              {size && <Chip>Size: {size}</Chip>}
              {skiLength && <Chip>Ski length: {skiLength}cm</Chip>}
              {boardLength && <Chip>Board length: {boardLength}cm</Chip>}
              {sport === "snowboard" && answers.stance && (
                <Chip>Stance: {STANCE.find((s) => s.id === answers.stance)?.label}</Chip>
              )}
              <Chip>Est. total: {formatPrice(total, currency)}</Chip>
            </div>

            <div className="flex items-center gap-2 mb-8">
              <span className="text-xs uppercase tracking-widest text-white/40 font-semibold">Your palette</span>
              <div className="flex gap-1.5">
                {chosenColors.map((c) => (<span key={c.id} title={c.label} className="w-5 h-5 rounded-full border border-white/25" style={{ backgroundColor: c.hex }} />))}
              </div>
            </div>

            {/* Compare mode toggle. Premium unlocks a side-by-side view of
                the top three matches per category instead of just the one
                pick - everything it needs (the full ranked list, match
                scores) already existed, it just wasn't being shown. */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <p className="text-xs uppercase tracking-widest text-white/40 font-semibold">
                {compareMode && isPremium ? "Top 3 per category" : "Your setup"}
              </p>
              {isPremium ? (
                <button
                  onClick={() => setCompareMode((v) => !v)}
                  className={`text-xs uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                    compareMode
                      ? "bg-white text-black border-white"
                      : "text-white/60 border-white/25 hover:border-white/60 hover:text-white"
                  }`}
                >
                  {compareMode ? "Exit compare" : "Compare mode"}
                </button>
              ) : (
                <button
                  onClick={goToPremium}
                  title="Compare your top 3 matches side-by-side with Premium"
                  className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg border border-white/20 text-white/50 hover:border-white/50 hover:text-white transition-colors"
                >
                  <Lock size={12} /> Compare mode
                </button>
              )}
            </div>

            {compareMode && isPremium ? (
              <div className="flex flex-col gap-6 mb-10">
                {Object.entries(rankings).map(([category, list]) => {
                  if (!list?.length) return null;
                  const top3 = list.slice(0, 3);
                  const chosen = answers.colors || [];
                  return (
                    <div key={category}>
                      <p className="text-xs uppercase tracking-widest text-white/45 font-semibold mb-2">
                        {categoryLabel(category, sport)}
                      </p>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {top3.map((opt, i) => {
                          const isCurrent = setup[category]?.id === opt.id;
                          const isExact = chosen.length > 0 && opt.colors.length > 0 && opt.colors.every((c) => chosen.includes(c));
                          const overlap = opt.colors.filter((c) => chosen.includes(c));
                          const swatches = isExact ? opt.colors : overlap;
                          const pct = matchPercent(opt, category, answers, fit, pantFit);
                          return (
                            <div
                              key={opt.id}
                              className={`rounded-xl border p-4 flex flex-col gap-2 transition-colors ${
                                isCurrent ? "border-white bg-white/[0.09]" : "border-white/16 bg-white/[0.04] hover:border-white/35"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                                  {isCurrent ? "Current pick" : `Option ${i + 1}`}
                                </span>
                                <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">{pct}% match</span>
                              </div>
                              <p className="text-xs uppercase tracking-wide text-white/45 font-semibold">{opt.brand}</p>
                              <p className="font-['Barlow_Condensed'] font-bold text-base leading-tight">{opt.name}</p>
                              <div className="flex items-center gap-1.5">
                                {swatches.map((cid) => {
                                  const c = colorById[cid];
                                  return c ? <span key={cid} title={c.label} className="w-4 h-4 rounded-full border border-white/30" style={{ backgroundColor: c.hex }} /> : null;
                                })}
                              </div>
                              <p className="font-['Barlow_Condensed'] font-bold text-lg mt-auto">{formatPrice(opt.price, currency)}</p>
                              {!isCurrent && (
                                <button
                                  onClick={() => setPicks((p) => ({ ...p, [category]: list.indexOf(opt) }))}
                                  className="text-[10px] uppercase tracking-widest font-bold text-white/60 border border-white/25 rounded-lg py-1.5 hover:border-white hover:text-white transition-colors"
                                >
                                  Use this one
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {Object.entries(setup).map(([category, item]) => {
                if (!item) return null;
                const listLen = rankings[category]?.length || 1;
                const chosen = answers.colors || [];
                const isExact = chosen.length > 0 && item.colors.length > 0 && item.colors.every((c) => chosen.includes(c));
                const overlap = item.colors.filter((c) => chosen.includes(c));
                // Never render an off-palette swatch — only show colors this
                // piece actually shares with the chosen palette.
                const displayColors = isExact ? item.colors : overlap;
                const pct = matchPercent(item, category, answers, fit, pantFit);
                return (
                  <div key={category} className="rounded-xl border border-white/16 bg-white/[0.04] backdrop-blur-sm p-5 flex flex-col gap-3 hover:border-white/35 hover:bg-white/[0.07] transition-colors">
                    <ProductImage item={item} category={category} sport={sport} chosenColors={answers.colors} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs uppercase tracking-widest text-white/45 font-semibold block">
                          {categoryLabel(category, sport)}
                          {item.gender.length === 1 ? ` · ${GENDER_LABELS[item.gender[0]]}` : " · Unisex"}
                        </span>
                        <h3 className="font-['Barlow_Condensed'] font-bold text-xl uppercase tracking-wide leading-tight mt-1">{item.name}</h3>
                        <p className="text-sm text-white/50">{item.brand}</p>
                        {(item.fit || item.shell) && (
                          <p className="text-xs text-white/35 mt-1">
                            {[item.shell ? "Shell" : null, item.fit ? FIT_LABELS[item.fit] : null].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {item.note && (
                          <p className="text-xs text-white/45 mt-2 leading-relaxed italic">{item.note}</p>
                        )}
                      </div>
                      <span className="font-bold text-white whitespace-nowrap">{formatPrice(item.price, currency)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-white rounded-full" style={{ width: `${pct}%`, transition: "width 0.4s ease" }} />
                      </div>
                      <span className="text-[10px] uppercase tracking-wide font-bold text-white/50 whitespace-nowrap">{pct}% match</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {displayColors.length > 0 ? (
                        <>
                          {displayColors.map((cid) => {
                            const c = colorById[cid];
                            if (!c) return null;
                            return <span key={cid} title={c.label} className="w-4 h-4 rounded-full border border-white ring-1 ring-white/60" style={{ backgroundColor: c.hex }} />;
                          })}
                          <span className="text-[10px] uppercase tracking-wide text-white/40 font-semibold ml-1">
                            {isExact ? "matches your palette" : "closest available shade"}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wide text-white/35 font-semibold">Not available in your palette — best overall match</span>
                      )}
                    </div>

                    <div className="mt-auto flex gap-2">
                      <a href={buildShopLink(item, displayColors.map((cid) => colorById[cid]?.label).filter(Boolean))} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-white border border-white/40 rounded-lg py-2 hover:bg-white hover:text-black transition-colors">
                        <ShoppingBag size={15} /> Shop
                      </a>
                      {listLen > 1 && (
                        !isPremium && (picks[category] ?? 0) >= 1 ? (
                          <button onClick={goToPremium} title="Unlock unlimited Search Again with Premium" className="px-3 flex items-center justify-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-white/60 border border-white/20 rounded-lg py-2 hover:border-white/60 hover:text-white transition-colors">
                            <Lock size={13} /> Premium
                          </button>
                        ) : (
                          <button onClick={() => swap(category)} title="Search again for a different match" className="px-3 flex items-center justify-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-white/70 border border-white/20 rounded-lg py-2 hover:border-white/60 hover:text-white transition-colors">
                            <Search size={15} /> Search again
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            )}

            <div className="mb-8">
              <p className="text-xs uppercase tracking-widest text-white/40 font-semibold mb-3">Your look, at a glance</p>
              {(() => {
                const resolvedColors = {};
                Object.entries(setup).forEach(([category, item]) => {
                  if (!item) return;
                  const chosen = answers.colors || [];
                  const overlap = item.colors.filter((c) => chosen.includes(c));
                  const primaryId = overlap[0] || item.colors[0];
                  const primary = colorById[primaryId];
                  if (primary) resolvedColors[category] = primary.hex;
                });
                return (
                  <div className="rounded-xl border border-white/18 bg-white/[0.03] py-6 flex flex-col items-center">
                    <GearFigure colors={resolvedColors} sport={sport} pantFit={pantFit} />
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-4 px-4">
                      {Object.entries(setup).map(([category, item]) => {
                        if (!item || !resolvedColors[category]) return null;
                        return (
                          <span key={category} className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/45 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full border border-white/40 flex-shrink-0" style={{ backgroundColor: resolvedColors[category] }} />
                            {categoryLabel(category, sport)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              <p className="text-[11px] text-white/30 mt-3 leading-relaxed">
                Rendered straight from each item's matched color, not a stock photo — so it can't drift from what's listed above.
              </p>
            </div>

            <p className="text-xs text-white/35 mb-6 leading-relaxed">
              <span className="text-white/55 font-semibold">Affiliate disclosure:</span> some "Shop" links may be
              affiliate links, meaning we could earn a commission if you buy through them — at no extra cost to you.
              It never affects which gear we match you with; recommendations are scored purely on your answers.
              <br />
              <br />
              Colors shown reflect what we've matched to your palette, but retailer stock and seasonal
              colorways change — double-check the exact color before buying. Prices are converted to{" "}
              {currency} at an approximate rate and may differ slightly at checkout.
            </p>

            <button onClick={goToPremium} className="w-full text-left rounded-xl border border-dashed border-white/25 bg-white/[0.03] p-5 mb-8 flex items-start gap-3 hover:border-white/45 hover:bg-white/[0.06] transition-colors">
              <Lock size={18} className="mt-0.5 text-white/50 flex-shrink-0" />
              <span className="text-sm text-white/55">
                <span className="font-semibold text-white">See Premium:</span> save this setup to your account, unlimited "search again" re-searches per item, share it as a link, and a personalized stylist review.
              </span>
            </button>

            <div className="flex flex-wrap items-center gap-5">
              <button onClick={restart} className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/50 hover:text-white transition-colors"><RotateCcw size={16} /> Start over</button>
              <button onClick={() => { setStepIndex(0); setPhase("quiz"); }} className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/50 hover:text-white transition-colors"><ChevronLeft size={16} /> Change my answers</button>
              <button onClick={goToAbout} className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/50 hover:text-white transition-colors"><ListChecks size={16} /> How we picked this</button>
            </div>
          </div>
        )}

        {phase === "about" && (
          <div style={{ animation: "slopefitIn 0.4s ease" }} className="pb-6">
            <button onClick={() => setPhase(previousPhase)} className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wide text-white/50 hover:text-white transition-colors mb-6">
              <ChevronLeft size={18} /> Back
            </button>

            <p className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold mb-3">About</p>
            <h1 className="font-['Barlow_Condensed'] font-black text-5xl uppercase tracking-tight mb-4 leading-[0.95]">How SlopeFit<br />picks your gear</h1>
            {/* Long-form prose needs a scrim. The mountain art sits behind
                every phase, and unlike the card-based screens this page puts
                body text straight onto it - the ridge lines cut through
                paragraphs badly, on mobile especially. */}
            <div className="rounded-2xl border border-white/12 bg-black/80 p-6 sm:p-8 mb-8">
            <p className="text-base text-white/65 max-w-xl mb-12 leading-relaxed">
              SlopeFit is a gear-matching tool, not a shop. You answer a short quiz, and a scoring
              model ranks {stats.products} products from {stats.brands} brands against your answers to
              build one coordinated setup. This page explains exactly how that works, how gear earns a
              place in the catalog, and what the tool can't do — so you can judge the recommendations
              for yourself.
            </p>

            <AboutSection n="01" title="The matching model">
              <p>
                Every item carries tags for ability level, terrain, riding style, colour, price tier
                and — for outerwear — cut. Your answers are scored against those tags, and the highest
                scoring item in each category becomes your featured pick. Nothing is hand-picked and
                nothing is sponsored.
              </p>
              <p>
                The weighting is not the same across categories, on purpose. <strong className="text-white/85">For skis
                and boards, how you ride outranks how it looks.</strong> Terrain and style each carry
                roughly eighteen times the weight of colour, because a black race ski is a bad answer
                to "I ride park" no matter how well the colour lines up. Ability sits just behind them.
              </p>
              <p>
                <strong className="text-white/85">For outerwear and accessories the balance flips
                toward colour</strong>, which is the whole point of a coordinated kit. Ability, terrain
                and style still lead, but colour counts for meaningfully more than it does on hardgoods.
              </p>
              <p>
                Two hard rules override the scoring. Your budget is a ceiling, not a suggestion — nothing
                above your selected tier is shown unless a category has nothing at or below it. And if
                anything in the pool matches the colours you picked, something matching them is what you
                get; a better score elsewhere can't take that slot.
              </p>
            </AboutSection>

            <AboutSection n="02" title="Sizing and fit">
              <p>
                Ski and board length is calculated from your height and weight, then adjusted for
                ability and terrain — powder and freeride push longer, park pushes shorter, beginners
                come down a little. Apparel sizing works off height and build, with a nudge from BMI at
                the extremes.
              </p>
              <p>
                Cut is driven by your style rather than your measurements alone. Park and street answers
                return baggy outright, race returns slim outright, and everything between leans on build.
                Snowboarders get relaxed-fit pants regardless of style, because that is what riders
                actually wear for boot and stance mobility.
              </p>
              <p className="text-white/45">
                These are starting points, not fittings. Boot sizing especially should be done in person.
              </p>
            </AboutSection>

            <AboutSection n="03" title="How gear gets into the catalog">
              <p>The catalog is built by hand against a fixed standard. To be listed, a product must:</p>
              <ul className="list-none space-y-2.5 my-4">
                {[
                  "Actually exist. Every item is checked against the brand's own live product feed — not a description, not a lookalike, the exact product.",
                  "Carry the brand's own photography, verified to load and to show the colourway named.",
                  "Have its colour tags measured from that photograph, rather than taken from the marketing name. Colourways called things like \"Atomic Mint\" or \"Flood Blue\" rarely describe what you actually see.",
                  "Come from a brand that makes or commissions its own product.",
                ].map((t) => (
                  <li key={t} className="flex gap-3 items-start">
                    <Check size={16} strokeWidth={3} className="mt-1 flex-shrink-0 opacity-70" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <p>
                That last rule has teeth. Brands have been removed after their "own" product photos turned
                out to be supplier images lifted from AliExpress — same file, same filename, still live on
                the supplier's servers. Relabelled dropship gear doesn't belong next to a Hestra mitt, so
                it goes.
              </p>
            </AboutSection>

            <AboutSection n="04" title="Independence">
              <p>
                No brand pays to appear here, and no brand can pay to rank higher. Ranking comes from your
                answers and the tags above — there is no field in the catalog that a brand could buy.
              </p>
              <p>
                Some "Shop" links may be affiliate links, meaning we could earn a commission if you buy
                through them, at no extra cost to you. That commission never influences what gets
                recommended: the scoring runs before any link is built, and the code has no access to
                commission rates.
              </p>
            </AboutSection>

            <AboutSection n="05" title="What this tool can't do">
              <ul className="list-none space-y-2.5 my-1">
                {[
                  "Prices drift and stock sells out. Figures shown are what the brand listed when the item was added — always confirm on the retailer's page before buying.",
                  "Non-USD prices are converted at approximate fixed rates, not a live feed.",
                  "Colour on a screen is not colour in daylight, and mirrored goggle lenses in particular photograph very differently from how they look on your face.",
                  "It can't replace a boot fitter, a demo day, or asking someone at your local hill.",
                ].map((t) => (
                  <li key={t} className="flex gap-3 items-start">
                    <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-white/40 flex-shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </AboutSection>

            {CONTACT_EMAIL && (
              <AboutSection n="06" title="Get in touch">
                <p>
                  Spotted a product that's wrong, discontinued, or mispriced? Tell us and it gets fixed —
                  corrections are the main way the catalog stays honest.
                </p>
                <p>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-white font-semibold underline underline-offset-4 hover:text-white/70 transition-colors">
                    {CONTACT_EMAIL}
                  </a>
                </p>
              </AboutSection>
            )}
            </div>

            <button onClick={() => setPhase(previousPhase)} className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/50 hover:text-white transition-colors mt-4">
              <ChevronLeft size={16} /> Back to {previousPhase === "results" ? "your setup" : "SlopeFit"}
            </button>
          </div>
        )}

        {phase === "premium" && (
          <div style={{ animation: "slopefitIn 0.4s ease" }}>
            <button onClick={() => setPhase(previousPhase)} className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wide text-white/50 hover:text-white transition-colors mb-6">
              <ChevronLeft size={18} /> Back
            </button>

            <p className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold mb-3">Go further with</p>
            <h1 className="font-['Barlow_Condensed'] font-black text-5xl uppercase tracking-tight mb-4">SlopeFit Premium</h1>
            <p className="text-base text-white/55 max-w-md mb-6 leading-relaxed">
              Everything in the free fit check, plus the tools to actually dial in and save your setup.
            </p>

            <div className="rounded-xl border border-white/18 bg-white/[0.04] p-5 mb-10">
              {user ? (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm text-white/70 flex items-center gap-2">
                    Signed in as <span className="text-white font-semibold">{user.email}</span>
                    {isPremium ? (
                      <span className="text-xs uppercase tracking-widest font-bold text-white bg-white/15 border border-white/30 rounded-full px-2 py-0.5">Premium</span>
                    ) : (
                      <span className="text-xs uppercase tracking-widest font-semibold text-white/40">Free</span>
                    )}
                  </span>
                  <button onClick={signOut} className="text-xs uppercase tracking-widest font-semibold text-white/40 hover:text-white transition-colors">
                    Sign out
                  </button>
                </div>
              ) : authStatus === "sent" ? (
                <p className="text-sm text-white/70">
                  Check <span className="text-white font-semibold">{authEmail}</span> for a sign-in link.
                </p>
              ) : authStatus === "rate_limited" ? (
                <p className="text-sm text-white/70">
                  Too many sign-in attempts. Try again in{" "}
                  <span className="text-white font-semibold">
                    {Math.max(1, Math.ceil((authRetryAt - Date.now()) / 60000))} minute
                    {Math.max(1, Math.ceil((authRetryAt - Date.now()) / 60000)) === 1 ? "" : "s"}
                  </span>
                  .
                </p>
              ) : (
                <form onSubmit={sendMagicLink} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    required
                    placeholder="you@email.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="flex-1 bg-transparent border border-white/25 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={authStatus === "sending"}
                    className="bg-white text-black text-sm font-semibold uppercase tracking-wide px-5 py-2.5 rounded-lg hover:bg-white/85 transition-colors disabled:opacity-60 flex-shrink-0"
                  >
                    {authStatus === "sending" ? "Sending..." : "Sign in to continue"}
                  </button>
                </form>
              )}
              {authStatus === "error" && (
                <p className="text-xs text-red-400 mt-2">Something went wrong sending that link — try again.</p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {PREMIUM_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-xl border p-6 flex flex-col gap-1 ${
                    plan.badge ? "border-white bg-white/[0.08]" : "border-white/18 bg-white/[0.04]"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-6 bg-white text-black text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  )}
                  <span className="text-xs uppercase tracking-widest text-white/50 font-semibold">{plan.label}</span>
                  <span className="flex items-end gap-1 mt-1">
                    <span className="font-['Barlow_Condensed'] font-black text-4xl">{formatPrice(plan.usd, currency)}</span>
                    <span className="text-white/50 text-sm mb-1">{plan.period}</span>
                  </span>
                  <span className="text-xs text-white/40 mt-1">{plan.note}</span>
                  <button
                    onClick={() => setClickedPlan(plan.id)}
                    className="mt-5 bg-white text-black font-['Barlow_Condensed'] font-bold uppercase tracking-wide text-base py-3 rounded-lg hover:bg-white/85 transition-colors disabled:opacity-60"
                    disabled={clickedPlan === plan.id}
                  >
                    {clickedPlan === plan.id ? "Thanks — noted!" : `Get ${plan.label}`}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/30 mb-10 -mt-6">
              {clickedPlan
                ? "Payments aren't live yet, but we've noted your interest — nice."
                : "Payments aren't live yet — this is a preview of the Premium plan."}
            </p>

            <p className="text-xs uppercase tracking-[0.2em] text-white/50 font-bold mb-4">What's included</p>
            <div className="grid gap-3 mb-10">
              {PREMIUM_FEATURES.map((f) => (
                <div key={f.title} className="rounded-xl border border-white/16 bg-white/[0.04] p-5 flex items-start gap-3.5">
                  <Check size={18} strokeWidth={3} color="#FFFFFF" className="mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-['Barlow_Condensed'] font-bold text-lg uppercase tracking-wide leading-tight mb-1">{f.title}</h3>
                    <p className="text-sm text-white/55 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setPhase(previousPhase)} className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/50 hover:text-white transition-colors">
              <ChevronLeft size={16} /> Back to {previousPhase === "results" ? "your setup" : "SlopeFit"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
