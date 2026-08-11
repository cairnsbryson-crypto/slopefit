import React, { useState, useMemo, useEffect } from "react";
import {
  Circle, Square, Diamond, Mountain, Snowflake, Trees, Compass, Layers, Wind,
  Wallet, Ruler, Shirt, Eye, HardHat, Hand, Palette, ListChecks, Sparkles,
  User, Users, ChevronRight, ChevronLeft, ShoppingBag, RotateCcw, Lock, Check,
  X, Search, Crown, ChevronDown, Globe,
} from "lucide-react";
import { supabase } from "./supabaseClient";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;900&family=Inter:wght@400;500;600;700&display=swap');
`;

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
    desc: "Keep unlimited setups on your account instead of losing everything on refresh, build separate profiles for everyone you shop for, and send any setup as a link so your crew can see exactly what you're running.",
  },
  {
    title: "Custom sizing override",
    desc: "Our ski and board lengths come from your height, weight, ability and terrain — but if you already know you ride longer or shorter than the chart says, override it and every recommendation re-sorts around your number.",
  },
  {
    title: "Price-drop & restock alerts",
    desc: "Gear in your saved setups gets watched automatically. We'll tell you the moment something goes on sale or a sold-out size comes back, so you're not checking six retailer pages yourself every week.",
  },
  {
    title: "Early access & stylist review",
    desc: "See new brands and colourways the week we add them, before they hit the free tier — plus request a personal once-over of your setup from someone who actually rides, before you spend a few thousand dollars on it.",
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
  { title: "Brands people actually ride", desc: "Faction, Armada, Salomon, Völkl, Arc'teryx, The North Face, Ninety Roll, Beyond Medals.", icon: Sparkles },
  { title: "Your colors, your call", desc: "Pick up to three from twenty-five shades and every piece gets matched to them.", icon: Palette },
  { title: "Sized to you", desc: "Ski or board length and cut tuned to your gender, height, weight, and ability.", icon: Ruler },
];

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------------------------------------------------------
   CATALOG — established ski brands for hardgoods; outerwear
   spans The North Face, Beyond Medals, Ninety Roll, Polar
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
    { id: "bdm1", name: "Custom Camber", brand: "Burton", price: 680, gender: ["m"], ability: ["intermediate", "advanced"], terrain: ["groomed", "park"], style: ["classic"], colors: ["black"], tier: "premium", image: "https://www.burton.com/static/product/W26/106881A97DRG154_1.png?impolicy=bgwhite&imwidth=800" },
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



const CATALOG = {
  skis: [
    { id: "sm1", name: "Experience 86 Basalt (26/27)", brand: "Rossignol", price: 650, gender: ["m"], ability: ["beginner", "intermediate"], terrain: ["groomed"], style: ["classic"], colors: ["black", "forest"], tier: "value", image: "https://www.rossignol.com/dw/image/v2/BJJZ_PRD/on/demandware.static/-/Sites-rossignol-catalog/default/dwde0c9732/images/large/RAMFQ04_EXPERIENCE_86_BASALT_OPEN_72DPI_01.jpg?sw=800" },
    { id: "sm2", name: "QST 98 (26/27)", brand: "Salomon", price: 700, gender: ["m"], ability: ["intermediate", "advanced"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["olive", "sand"], tier: "mid" },
    { id: "sm21", name: "Tom Wallisch Pro (26/27)", brand: "Line", price: 720, gender: ["m"], ability: ["advanced", "expert"], terrain: ["park"], style: ["street"], colors: ["black"], tier: "premium" },
    { id: "sm22", name: "Chronic 94 (26/27)", brand: "Line", price: 630, gender: ["m"], ability: ["intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "classic"], colors: ["olive", "black"], tier: "value" },
    { id: "sm3", name: "ARV 94 (26/27)", brand: "Armada", price: 600, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "moguls"], style: ["street"], colors: ["black", "white"], tier: "value" },
    { id: "sm4", name: "Prodigy 2 (26/27)", brand: "Faction", price: 649, gender: ["m"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["white"], tier: "value" },
    { id: "sm5", name: "Bent 100 (26/27)", brand: "Atomic", price: 700, gender: ["m"], ability: ["intermediate", "advanced"], terrain: ["powder", "park"], style: ["street", "freeride"], colors: ["olive", "sand"], tier: "mid" },
    { id: "sm6", name: "Blade Optic 96 (26/27)", brand: "Line", price: 750, gender: ["m"], ability: ["advanced", "expert"], terrain: ["groomed", "moguls"], style: ["freeride", "street"], colors: ["red", "charcoal"], tier: "premium" },
    { id: "sm7", name: "M7 Mantra (26/27)", brand: "Völkl", price: 900, gender: ["m"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["black"], tier: "premium" },
    { id: "sm8", name: "Mindbender 99Ti (26/27)", brand: "K2", price: 800, gender: ["m"], ability: ["advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["charcoal", "orange"], tier: "premium" },
    { id: "sm10", name: "Antimatter 100 (26/27)", brand: "Armada", price: 820, gender: ["m"], ability: ["advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["black", "white"], tier: "premium" },
    { id: "sm11", name: "Bent Decode (26/27)", brand: "Atomic", price: 650, gender: ["m"], ability: ["intermediate", "advanced"], terrain: ["park", "moguls"], style: ["street"], colors: ["black"], tier: "value" },
    { id: "sm14", name: "Bent 90 (26/27)", brand: "Atomic", price: 620, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["white"], tier: "value" },
    { id: "sm17", name: "ARV 88 - Black (26/27)", brand: "Armada", price: 420, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value" },
    { id: "sm18", name: "ARV 106 Ti (26/27)", brand: "Armada", price: 560, gender: ["m"], ability: ["advanced", "expert"], terrain: ["powder", "groomed"], style: ["freeride", "street"], colors: ["charcoal", "black"], tier: "value" },
    { id: "sm19", name: "Prodigy 1 (26/27)", brand: "Faction", price: 629, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["orange", "purple"], tier: "value" },
    { id: "sm20", name: "Prodigy 3 (26/27)", brand: "Faction", price: 679, gender: ["m"], ability: ["intermediate", "advanced", "expert"], terrain: ["groomed", "powder"], style: ["freeride", "street"], colors: ["teal", "lime"], tier: "mid" },
    { id: "sm12", name: "Dancer 79 (26/27)", brand: "Faction", price: 750, gender: ["m"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["black", "white"], tier: "premium" },
    { id: "sm13", name: "Mindbender 90 (26/27)", brand: "K2", price: 700, gender: ["m"], ability: ["intermediate", "advanced"], terrain: ["powder", "groomed"], style: ["freeride", "classic"], colors: ["black", "forest"], tier: "mid" },
    { id: "sm15", name: "Redster S9 (26/27)", brand: "Atomic", price: 950, gender: ["m"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race"], colors: ["black"], tier: "premium" },
    { id: "sm16", name: "Redster G9 (26/27)", brand: "Atomic", price: 900, gender: ["m"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["white"], tier: "premium" },
    { id: "sw1", name: "Experience W 82 (26/27)", brand: "Rossignol", price: 600, gender: ["w"], ability: ["beginner", "intermediate"], terrain: ["groomed"], style: ["classic"], colors: ["white"], tier: "value" },
    { id: "sw2", name: "Santa Ana 98 (26/27)", brand: "Nordica", price: 780, gender: ["w"], ability: ["intermediate", "advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["black", "forest"], tier: "premium" },
    { id: "sw3", name: "ARW 94 (26/27)", brand: "Armada", price: 600, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "moguls"], style: ["street"], colors: ["purple", "lime"], tier: "value" },
    { id: "sw4", name: "Dancer 2X (26/27)", brand: "Faction", price: 649, gender: ["w"], ability: ["intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["blush", "purple"], tier: "value" },
    { id: "sw5", name: "Maven 93 C (26/27)", brand: "Atomic", price: 700, gender: ["w"], ability: ["intermediate", "advanced"], terrain: ["powder", "groomed"], style: ["freeride", "classic"], colors: ["sky", "white"], tier: "mid" },
    { id: "sw6", name: "Pandora 94 (26/27)", brand: "Line", price: 720, gender: ["w"], ability: ["intermediate", "advanced"], terrain: ["powder", "park"], style: ["street", "freeride"], colors: ["mint", "lime"], tier: "mid" },
    { id: "sw7", name: "Sheeva 10 (26/27)", brand: "Blizzard", price: 800, gender: ["w"], ability: ["advanced", "expert"], terrain: ["powder", "moguls"], style: ["freeride"], colors: ["black", "forest"], tier: "premium" },
    { id: "sw8", name: "Secret 96 (26/27)", brand: "Völkl", price: 875, gender: ["w"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["black"], tier: "premium" },
    { id: "sw10", name: "Antimatter 88 (26/27)", brand: "Armada", price: 780, gender: ["w"], ability: ["advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["black"], tier: "premium" },
    { id: "sw11", name: "Dancer 79 (26/27)", brand: "Faction", price: 720, gender: ["w"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["white"], tier: "premium" },
    { id: "sw12", name: "Bent 90 (26/27)", brand: "Atomic", price: 620, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value" },
    { id: "sw13", name: "Prodigy 2 (26/27)", brand: "Faction", price: 649, gender: ["w"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["white"], tier: "value" },
    { id: "sw14", name: "Redster S9 (26/27)", brand: "Atomic", price: 950, gender: ["w"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race"], colors: ["black"], tier: "premium" },
    { id: "sw15", name: "Redster G9 (26/27)", brand: "Atomic", price: 900, gender: ["w"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["white"], tier: "premium" },
    { id: "sw16", name: "ARW 88 - Black (26/27)", brand: "Armada", price: 420, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value" },
    { id: "sw17", name: "ARW 100 (26/27)", brand: "Armada", price: 550, gender: ["w"], ability: ["advanced", "expert"], terrain: ["powder", "groomed"], style: ["freeride", "street"], colors: ["charcoal", "black"], tier: "value" },
    { id: "sw18", name: "Prodigy 1 (26/27)", brand: "Faction", price: 629, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["orange", "purple"], tier: "value" },
    { id: "sw19", name: "Prodigy 3 (26/27)", brand: "Faction", price: 679, gender: ["w"], ability: ["intermediate", "advanced", "expert"], terrain: ["groomed", "powder"], style: ["freeride", "street"], colors: ["teal", "lime"], tier: "mid" },
  ],
  jacket: [
    { id: "jm3", name: "Rider Snow Jacket", brand: "Ninety Roll", price: 180, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sand", "olive"], tier: "value", fit: "baggy", shell: true },
    { id: "jm4", name: "Fullzip 2L Snow Jacket", brand: "Beyond Medals", price: 290, gender: ["m"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "powder"], style: ["street", "retro"], colors: ["navy", "black"], tier: "mid", fit: "baggy", shell: true },
    { id: "jm5", name: "Waterproof Snow Jacket", brand: "Polar Pursuit", price: 190, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black", "cream"], tier: "value", fit: "baggy", shell: true },
    { id: "jm20", name: "Baggy Waterproof Snow Jacket", brand: "GSOU SNOW", price: 170, gender: ["m"], ability: ["beginner", "intermediate", "advanced", "expert"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value", fit: "baggy", shell: true },
    { id: "jm23", name: "Purple Waterproof Snow Jacket", brand: "GSOU SNOW", price: 170, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["purple"], tier: "value", fit: "baggy", shell: true },
    { id: "jm24", name: "Rider Snow Jacket Purple", brand: "Ninety Roll", price: 180, gender: ["m"], ability: ["intermediate", "advanced"], terrain: ["park", "powder"], style: ["street"], colors: ["purple"], tier: "value", fit: "baggy", shell: true },
    { id: "jm21", name: "HIDA Ski Jacket", brand: "GSOU SNOW", price: 220, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "powder"], style: ["street", "retro"], colors: ["white"], tier: "mid", fit: "baggy", shell: false },
    { id: "jm22", name: "Army Green Insulated Snow Jacket", brand: "GSOU SNOW", price: 190, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["forest"], tier: "value", fit: "baggy", shell: false },
    { id: "jm7", name: "Ceptor Shell Jacket", brand: "The North Face", price: 475, gender: ["m"], ability: ["intermediate", "advanced"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["white"], tier: "mid", fit: "regular", shell: true },
    { id: "jm8", name: "Hex GORE-TEX Jacket", brand: "The North Face", price: 500, gender: ["m"], ability: ["intermediate", "advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["black"], tier: "premium", fit: "regular", shell: true },
    { id: "jm9", name: "Summit Verbier GORE-TEX Jacket", brand: "The North Face", price: 700, gender: ["m"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "freeride"], colors: ["white"], tier: "premium", fit: "regular", shell: true },
    { id: "jm12", name: "Summit Eastwall GORE-TEX Jacket", brand: "The North Face", price: 600, gender: ["m"], ability: ["advanced", "expert"], terrain: ["backcountry", "ice"], style: ["freeride", "race"], colors: ["forest", "black"], tier: "premium", fit: "regular", shell: true },
    { id: "jm13", name: "Summit Tsirku GORE-TEX Pro Jacket", brand: "The North Face", price: 850, gender: ["m"], ability: ["expert"], terrain: ["backcountry", "powder"], style: ["freeride"], colors: ["red", "black"], tier: "premium", fit: "regular", shell: true },
    { id: "jm14", name: "Jazzi 3L GORE-TEX Jacket", brand: "The North Face", price: 700, gender: ["m"], ability: ["intermediate", "advanced"], terrain: ["groomed", "powder"], style: ["classic", "freeride"], colors: ["black", "forest"], tier: "premium", fit: "regular", shell: true },
    { id: "jm11", name: "Sabre Insulated Jacket (26/27)", brand: "Arc'teryx", price: 650, gender: ["m"], ability: ["advanced", "expert"], terrain: ["backcountry", "powder"], style: ["freeride"], colors: ["black"], tier: "premium", fit: "regular", shell: true },
    { id: "jw3", name: "Rider Snow Jacket", brand: "Ninety Roll", price: 180, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["cream", "blush"], tier: "value", fit: "baggy", shell: true },
    { id: "jw4", name: "Fullzip 2L Snow Jacket", brand: "Beyond Medals", price: 290, gender: ["w"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "powder"], style: ["street", "retro"], colors: ["red", "black"], tier: "mid", fit: "baggy", shell: true },
    { id: "jw5", name: "Waterproof Snow Jacket", brand: "Polar Pursuit", price: 190, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["blush", "black"], tier: "value", fit: "baggy", shell: true },
    { id: "jw20", name: "Baggy Snowboard Jacket", brand: "GSOU SNOW", price: 170, gender: ["w"], ability: ["beginner", "intermediate", "advanced", "expert"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value", fit: "baggy", shell: true },
    { id: "jw23", name: "Purple Waterproof Snow Jacket", brand: "GSOU SNOW", price: 170, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["purple"], tier: "value", fit: "baggy", shell: true },
    { id: "jw24", name: "Rider Snow Jacket Purple", brand: "Ninety Roll", price: 180, gender: ["w"], ability: ["intermediate", "advanced"], terrain: ["park", "powder"], style: ["street"], colors: ["purple"], tier: "value", fit: "baggy", shell: true },
    { id: "jw21", name: "HIDA Ski Jacket", brand: "GSOU SNOW", price: 220, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "powder"], style: ["street", "retro"], colors: ["white"], tier: "mid", fit: "baggy", shell: false },
    { id: "jw22", name: "Army Green Insulated Snow Jacket", brand: "GSOU SNOW", price: 190, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["forest"], tier: "value", fit: "baggy", shell: false },
    { id: "jw11", name: "Luminal 3L Jacket (26/27)", brand: "Armada", price: 550, gender: ["w"], ability: ["advanced", "expert"], terrain: ["backcountry", "powder"], style: ["freeride"], colors: ["black"], tier: "premium", fit: "regular", shell: true },
    { id: "jw7", name: "Superlu GORE-TEX Jacket", brand: "The North Face", price: 480, gender: ["w"], ability: ["intermediate", "advanced"], terrain: ["powder", "park"], style: ["street", "freeride"], colors: ["white"], tier: "premium", fit: "baggy", shell: true },
    { id: "jw12", name: "Ceptor Shell Jacket", brand: "The North Face", price: 475, gender: ["w"], ability: ["intermediate", "advanced"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["forest", "black"], tier: "mid", fit: "regular", shell: true },
    { id: "jw13", name: "Hex GORE-TEX Jacket", brand: "The North Face", price: 500, gender: ["w"], ability: ["intermediate", "advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["forest", "black"], tier: "premium", fit: "regular", shell: true },
    { id: "jw9", name: "Summit Eastwall GORE-TEX Jacket", brand: "The North Face", price: 600, gender: ["w"], ability: ["advanced", "expert"], terrain: ["backcountry", "ice"], style: ["freeride", "race"], colors: ["black"], tier: "premium", fit: "regular", shell: true },
    { id: "jw14", name: "Summit Verbier GORE-TEX Jacket", brand: "The North Face", price: 700, gender: ["w"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "freeride"], colors: ["white"], tier: "premium", fit: "regular", shell: true },
    { id: "jw10", name: "Sentinel Insulated Jacket (26/27)", brand: "Arc'teryx", price: 650, gender: ["w"], ability: ["advanced", "expert"], terrain: ["backcountry", "powder"], style: ["freeride"], colors: ["black"], tier: "premium", fit: "regular", shell: true },
    { id: "jtb1", name: "Mach 2 Shell", brand: "Trashbags", price: 205, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced", "expert"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "mid", fit: "baggy", shell: true },
    { id: "jbr1", name: "Briqed Jacket", brand: "Briqed", price: 110, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value", fit: "baggy", shell: true },
    { id: "jf1", name: "Charcoal Snow Jacket", brand: "GSOU SNOW", price: 170, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["charcoal"], tier: "value", fit: "baggy", shell: true },
    { id: "jf2", name: "Charcoal Snow Jacket", brand: "GSOU SNOW", price: 170, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["charcoal"], tier: "value", fit: "baggy", shell: true },
    { id: "jf3", name: "Slate Snow Jacket", brand: "Briqed", price: 110, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["slate"], tier: "value", fit: "baggy", shell: true },
    { id: "jf4", name: "Slate Snow Jacket", brand: "Briqed", price: 110, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["slate"], tier: "value", fit: "baggy", shell: true },
    { id: "jf5", name: "Navy Snow Jacket", brand: "Solo Apparel", price: 150, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["navy"], tier: "value", fit: "baggy", shell: true },
    { id: "jf6", name: "Navy Snow Jacket", brand: "Solo Apparel", price: 150, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["navy"], tier: "value", fit: "baggy", shell: true },
    { id: "jf7", name: "Olive Snow Jacket", brand: "GSOU SNOW", price: 170, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["olive"], tier: "value", fit: "baggy", shell: true },
    { id: "jf8", name: "Olive Snow Jacket", brand: "GSOU SNOW", price: 170, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["olive"], tier: "value", fit: "baggy", shell: true },
    { id: "jf9", name: "Burgundy Snow Jacket", brand: "Bandits Apparels", price: 146, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["burgundy"], tier: "value", fit: "baggy", shell: true },
    { id: "jf10", name: "Burgundy Snow Jacket", brand: "Bandits Apparels", price: 146, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["burgundy"], tier: "value", fit: "baggy", shell: true },
    { id: "jf11", name: "Sand Snow Jacket", brand: "Ninety Roll", price: 180, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sand"], tier: "value", fit: "baggy", shell: true },
    { id: "jf12", name: "Sand Snow Jacket", brand: "Ninety Roll", price: 180, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sand"], tier: "value", fit: "baggy", shell: true },
    { id: "jf13", name: "Sky Blue Snow Jacket", brand: "Solo Apparel", price: 150, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sky"], tier: "value", fit: "baggy", shell: true },
    { id: "jf14", name: "Sky Blue Snow Jacket", brand: "Solo Apparel", price: 150, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sky"], tier: "value", fit: "baggy", shell: true },
    { id: "jf15", name: "Pink Snow Jacket", brand: "Briqed", price: 110, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["blush"], tier: "value", fit: "baggy", shell: true },
    { id: "jf16", name: "Pink Snow Jacket", brand: "Briqed", price: 110, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["blush"], tier: "value", fit: "baggy", shell: true },
    { id: "jf17", name: "Mint Snow Jacket", brand: "GSOU SNOW", price: 170, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["mint"], tier: "value", fit: "baggy", shell: true },
    { id: "jf18", name: "Mint Snow Jacket", brand: "GSOU SNOW", price: 170, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["mint"], tier: "value", fit: "baggy", shell: true },
    { id: "jf19", name: "Cobalt Snow Jacket", brand: "Briqed", price: 110, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["cobalt"], tier: "value", fit: "baggy", shell: true },
    { id: "jf20", name: "Cobalt Snow Jacket", brand: "Briqed", price: 110, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["cobalt"], tier: "value", fit: "baggy", shell: true },
    { id: "jf21", name: "Teal Snow Jacket", brand: "Solo Apparel", price: 150, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["teal"], tier: "value", fit: "baggy", shell: true },
    { id: "jf22", name: "Teal Snow Jacket", brand: "Solo Apparel", price: 150, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["teal"], tier: "value", fit: "baggy", shell: true },
    { id: "jf23", name: "Lime Snow Jacket", brand: "GSOU SNOW", price: 170, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["lime"], tier: "value", fit: "baggy", shell: true },
    { id: "jf24", name: "Lime Snow Jacket", brand: "GSOU SNOW", price: 170, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["lime"], tier: "value", fit: "baggy", shell: true },
    { id: "jf25", name: "Yellow Snow Jacket", brand: "Bandits Apparels", price: 146, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["yellow"], tier: "value", fit: "baggy", shell: true },
    { id: "jf26", name: "Yellow Snow Jacket", brand: "Bandits Apparels", price: 146, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["yellow"], tier: "value", fit: "baggy", shell: true },
    { id: "jf27", name: "Orange Snow Jacket", brand: "Ninety Roll", price: 180, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["orange"], tier: "value", fit: "baggy", shell: true },
    { id: "jf28", name: "Orange Snow Jacket", brand: "Ninety Roll", price: 180, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["orange"], tier: "value", fit: "baggy", shell: true },
    { id: "jf29", name: "Cream Snow Jacket", brand: "Briqed", price: 110, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["cream"], tier: "value", fit: "baggy", shell: true },
    { id: "jf30", name: "Cream Snow Jacket", brand: "Briqed", price: 110, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["cream"], tier: "value", fit: "baggy", shell: true },
    { id: "jf31", name: "Silver Snow Jacket", brand: "Briqed", price: 140, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["silver"], tier: "value", fit: "baggy", shell: true },
    { id: "jf32", name: "Silver Snow Jacket", brand: "Briqed", price: 140, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["silver"], tier: "value", fit: "baggy", shell: true },
    { id: "jf33", name: "Magenta Snow Jacket", brand: "Bandits Apparels", price: 146, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["magenta"], tier: "value", fit: "baggy", shell: true },
    { id: "jf34", name: "Magenta Snow Jacket", brand: "Bandits Apparels", price: 146, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["magenta"], tier: "value", fit: "baggy", shell: true },
    { id: "jf35", name: "Turquoise Snow Jacket", brand: "GSOU SNOW", price: 170, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["turquoise"], tier: "value", fit: "baggy", shell: true },
    { id: "jf36", name: "Turquoise Snow Jacket", brand: "GSOU SNOW", price: 170, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["turquoise"], tier: "value", fit: "baggy", shell: true },
    { id: "jf37", name: "Coral Snow Jacket", brand: "Solo Apparel", price: 150, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["coral"], tier: "value", fit: "baggy", shell: true },
    { id: "jf38", name: "Coral Snow Jacket", brand: "Solo Apparel", price: 150, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["coral"], tier: "value", fit: "baggy", shell: true },
    { id: "jf39", name: "Lavender Snow Jacket", brand: "Ninety Roll", price: 180, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["lavender"], tier: "value", fit: "baggy", shell: true },
    { id: "jf210", name: "Lavender Snow Jacket", brand: "Ninety Roll", price: 180, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["lavender"], tier: "value", fit: "baggy", shell: true },
  ],
  pants: [
    { id: "pm3", name: "Pinnacle 15K Wide Cut Pants", brand: "Ninety Roll", price: 170, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["navy"], tier: "value", fit: "baggy" },
    { id: "pm4", name: "Downtown Pro 30K Snow Pants", brand: "Ninety Roll", price: 200, gender: ["m"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "moguls"], style: ["street", "retro"], colors: ["white"], tier: "mid", fit: "baggy" },
    { id: "pm5", name: "Frostline Baggy Snow Pants", brand: "Polar Pursuit", price: 192, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "powder"], style: ["street"], colors: ["black"], tier: "mid", fit: "baggy" },
    { id: "pm6", name: "Baggy Wear-Resistant Snow Pants", brand: "GSOU SNOW", price: 130, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["white"], tier: "value", fit: "baggy" },
    { id: "pm22", name: "Army Green Insulated Baggy Snow Pants", brand: "GSOU SNOW", price: 150, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["forest", "black"], tier: "value", fit: "baggy" },
    { id: "pm7", name: "Nostalgia Pants 2L", brand: "Beyond Medals", price: 260, gender: ["m"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "powder"], style: ["street", "retro"], colors: ["forest", "black"], tier: "mid", fit: "baggy" },
    { id: "pm10", name: "Sabre Pant (26/27)", brand: "Arc'teryx", price: 600, gender: ["m"], ability: ["advanced", "expert"], terrain: ["backcountry", "powder"], style: ["freeride"], colors: ["white"], tier: "premium", fit: "regular" },
    { id: "pw3", name: "Pinnacle 15K Wide Cut Pants", brand: "Ninety Roll", price: 170, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["navy"], tier: "value", fit: "baggy" },
    { id: "pw4", name: "Downtown Pro 30K Snow Pants", brand: "Ninety Roll", price: 200, gender: ["w"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "moguls"], style: ["street", "retro"], colors: ["white"], tier: "mid", fit: "baggy" },
    { id: "pw5", name: "Frostline Baggy Snow Pants", brand: "Polar Pursuit", price: 192, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "powder"], style: ["street"], colors: ["black"], tier: "mid", fit: "baggy" },
    { id: "pw6", name: "Insulated Baggy Snow Pants", brand: "GSOU SNOW", price: 160, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "moguls"], style: ["street"], colors: ["white"], tier: "value", fit: "baggy" },
    { id: "pw22", name: "Army Green Baggy Snow Pants", brand: "GSOU SNOW", price: 150, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "moguls"], style: ["street"], colors: ["forest", "black"], tier: "value", fit: "baggy" },
    { id: "pw7", name: "Nostalgia Pants 2L", brand: "Beyond Medals", price: 260, gender: ["w"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "powder"], style: ["street", "retro"], colors: ["forest", "black"], tier: "mid", fit: "baggy" },
    { id: "pw10", name: "Sentinel Pant (26/27)", brand: "Arc'teryx", price: 600, gender: ["w"], ability: ["advanced", "expert"], terrain: ["backcountry", "powder"], style: ["freeride"], colors: ["white"], tier: "premium", fit: "regular" },
    { id: "ptb1", name: "Trashbags Snow Pants — Black", brand: "Trashbags", price: 195, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "mid", fit: "baggy" },
    { id: "ptb2", name: "Trashbags Snow Pants — Light Purple", brand: "Trashbags", price: 195, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["purple"], tier: "mid", fit: "baggy" },
    { id: "ptb3", name: "Trashbags Snow Pants — Olive Green", brand: "Trashbags", price: 195, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["olive"], tier: "mid", fit: "baggy" },
    { id: "ptb4", name: "Trashbags Snow Pants — Maroon", brand: "Trashbags", price: 195, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["burgundy"], tier: "mid", fit: "baggy" },
    { id: "pbv1", name: "Black No Cargo Baggy Snowpants", brand: "Big Vigs Apparel", price: 120, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value", fit: "baggy" },
    { id: "pbv2", name: "Navy No Cargo Baggy Snowpants", brand: "Big Vigs Apparel", price: 120, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["navy"], tier: "value", fit: "baggy" },
    { id: "pbv3", name: "Brown No Cargo Baggy Snowpants", brand: "Big Vigs Apparel", price: 120, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["burgundy"], tier: "value", fit: "baggy" },
    { id: "pbv4", name: "Olive No Cargo Baggy Snowpants", brand: "Big Vigs Apparel", price: 160, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["olive"], tier: "value", fit: "baggy" },
    { id: "pbv5", name: "Slate Gray No Cargo Baggy Pants", brand: "Big Vigs Apparel", price: 120, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["slate"], tier: "value", fit: "baggy" },
    { id: "pb1", name: "Black Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value", fit: "baggy" },
    { id: "pb2", name: "White Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["white"], tier: "value", fit: "baggy" },
    { id: "pb3", name: "Olive Green Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["olive"], tier: "value", fit: "baggy" },
    { id: "pb4", name: "Purple Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["purple"], tier: "value", fit: "baggy" },
    { id: "pb5", name: "Black/Red Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black", "red"], tier: "value", fit: "baggy" },
    { id: "pb6", name: "Black/Blue Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black", "navy"], tier: "value", fit: "baggy" },
    { id: "pb7", name: "Dark Brown Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["burgundy"], tier: "value", fit: "baggy" },
    { id: "pb8", name: "Grey Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["slate"], tier: "value", fit: "baggy" },
    { id: "pb9", name: "Red Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["red"], tier: "value", fit: "baggy" },
    { id: "pb10", name: "Light Pink Snowpants 20k", brand: "Bandits Apparels", price: 146, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["blush"], tier: "value", fit: "baggy" },
    { id: "pb11", name: "Navy Blue Snowpants 10k", brand: "Bandits Apparels", price: 110, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["navy"], tier: "value", fit: "baggy" },
    { id: "pb12", name: "Beige Snowpants 10k", brand: "Bandits Apparels", price: 110, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sand"], tier: "value", fit: "baggy" },
    { id: "pbr1", name: "Cargo Snowpants Black", brand: "Briqed", price: 140, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value", fit: "baggy" },
    { id: "pbr2", name: "Cargo Snowpants Blue", brand: "Briqed", price: 140, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["cobalt"], tier: "value", fit: "baggy" },
    { id: "pbr3", name: "Cargo Snowpants White", brand: "Briqed", price: 140, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["white"], tier: "value", fit: "baggy" },
    { id: "pbr4", name: "Cargo Snowpants Purple", brand: "Briqed", price: 140, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["purple"], tier: "value", fit: "baggy" },
    { id: "pbr5", name: "Cargo Snowpants Pink", brand: "Briqed", price: 140, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["blush"], tier: "value", fit: "baggy" },
    { id: "pbr6", name: "Cargo Snowpants Brown", brand: "Briqed", price: 140, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["burgundy"], tier: "value", fit: "baggy" },
    { id: "pbr7", name: "Cargo Snowpants Grey", brand: "Briqed", price: 140, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["slate"], tier: "value", fit: "baggy" },
    { id: "pso1", name: "Black Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value", fit: "baggy" },
    { id: "pso2", name: "Twilight Snow Pants", brand: "Solo Apparel", price: 145, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black", "navy"], tier: "value", fit: "baggy" },
    { id: "pso3", name: "White Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["white"], tier: "value", fit: "baggy" },
    { id: "pso4", name: "Purple Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["purple"], tier: "value", fit: "baggy" },
    { id: "pso5", name: "Light Blue Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sky"], tier: "value", fit: "baggy" },
    { id: "pso6", name: "Pink Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["blush"], tier: "value", fit: "baggy" },
    { id: "pso7", name: "Brown Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["burgundy"], tier: "value", fit: "baggy" },
    { id: "pso8", name: "Grey Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["slate"], tier: "value", fit: "baggy" },
    { id: "pso9", name: "Green Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["forest"], tier: "value", fit: "baggy" },
    { id: "pf1", name: "Charcoal Snow Pants", brand: "GSOU SNOW", price: 140, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["charcoal"], tier: "value", fit: "baggy" },
    { id: "pf2", name: "Charcoal Snow Pants", brand: "GSOU SNOW", price: 140, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["charcoal"], tier: "value", fit: "baggy" },
    { id: "pf3", name: "Cream Snow Pants", brand: "Ninety Roll", price: 170, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["cream"], tier: "value", fit: "baggy" },
    { id: "pf4", name: "Cream Snow Pants", brand: "Ninety Roll", price: 170, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["cream"], tier: "value", fit: "baggy" },
    { id: "pf5", name: "Mint Snow Pants", brand: "GSOU SNOW", price: 140, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["mint"], tier: "value", fit: "baggy" },
    { id: "pf6", name: "Mint Snow Pants", brand: "GSOU SNOW", price: 140, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["mint"], tier: "value", fit: "baggy" },
    { id: "pf7", name: "Teal Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["teal"], tier: "value", fit: "baggy" },
    { id: "pf8", name: "Teal Snow Pants", brand: "Solo Apparel", price: 125, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["teal"], tier: "value", fit: "baggy" },
    { id: "pf9", name: "Lime Snow Pants", brand: "GSOU SNOW", price: 140, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["lime"], tier: "value", fit: "baggy" },
    { id: "pf10", name: "Lime Snow Pants", brand: "GSOU SNOW", price: 140, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["lime"], tier: "value", fit: "baggy" },
    { id: "pf11", name: "Yellow Snow Pants", brand: "Bandits Apparels", price: 146, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["yellow"], tier: "value", fit: "baggy" },
    { id: "pf12", name: "Yellow Snow Pants", brand: "Bandits Apparels", price: 146, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["yellow"], tier: "value", fit: "baggy" },
    { id: "pf13", name: "Orange Snow Pants", brand: "Briqed", price: 140, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["orange"], tier: "value", fit: "baggy" },
    { id: "pf14", name: "Orange Snow Pants", brand: "Briqed", price: 140, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["orange"], tier: "value", fit: "baggy" },
    { id: "pf15", name: "Olive Snow Pants", brand: "GSOU SNOW", price: 140, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["olive"], tier: "value", fit: "baggy" },
    { id: "pf16", name: "Olive Snow Pants", brand: "GSOU SNOW", price: 140, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["olive"], tier: "value", fit: "baggy" },
    { id: "pf17", name: "Sand Snow Pants", brand: "Ninety Roll", price: 170, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sand"], tier: "value", fit: "baggy" },
    { id: "pf18", name: "Sand Snow Pants", brand: "Ninety Roll", price: 170, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sand"], tier: "value", fit: "baggy" },
    { id: "pf19", name: "Sky Blue Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sky"], tier: "value", fit: "baggy" },
    { id: "pf20", name: "Sky Blue Snow Pants", brand: "Solo Apparel", price: 125, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["sky"], tier: "value", fit: "baggy" },
    { id: "pf21", name: "Silver Snow Pants", brand: "Briqed", price: 140, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["silver"], tier: "value", fit: "baggy" },
    { id: "pf22", name: "Silver Snow Pants", brand: "Briqed", price: 140, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["silver"], tier: "value", fit: "baggy" },
    { id: "pf23", name: "Magenta Snow Pants", brand: "Bandits Apparels", price: 146, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["magenta"], tier: "value", fit: "baggy" },
    { id: "pf24", name: "Magenta Snow Pants", brand: "Bandits Apparels", price: 146, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["magenta"], tier: "value", fit: "baggy" },
    { id: "pf25", name: "Turquoise Snow Pants", brand: "GSOU SNOW", price: 140, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["turquoise"], tier: "value", fit: "baggy" },
    { id: "pf26", name: "Turquoise Snow Pants", brand: "GSOU SNOW", price: 140, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["turquoise"], tier: "value", fit: "baggy" },
    { id: "pf27", name: "Coral Snow Pants", brand: "Solo Apparel", price: 125, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["coral"], tier: "value", fit: "baggy" },
    { id: "pf28", name: "Coral Snow Pants", brand: "Solo Apparel", price: 125, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["coral"], tier: "value", fit: "baggy" },
    { id: "pf29", name: "Lavender Snow Pants", brand: "Ninety Roll", price: 170, gender: ["m"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["lavender"], tier: "value", fit: "baggy" },
    { id: "pf210", name: "Lavender Snow Pants", brand: "Ninety Roll", price: 170, gender: ["w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["lavender"], tier: "value", fit: "baggy" },
  ],
  goggles: [
    { id: "g1", name: "Helix 2.0 Goggles", brand: "Anon", price: 110, gender: ["m", "w"], ability: ["beginner", "intermediate"], terrain: ["groomed"], style: ["classic"], colors: ["black"], tier: "value" },
    { id: "gr1", name: "Drift — Pure Silver", brand: "RUFE", price: 38, gender: ["m", "w"], ability: ["beginner", "intermediate"], terrain: ["groomed", "park"], style: ["street", "classic"], colors: ["silver"], tier: "value" },
    { id: "gr2", name: "Drift — Glacier Blue", brand: "RUFE", price: 38, gender: ["m", "w"], ability: ["beginner", "intermediate"], terrain: ["groomed", "park"], style: ["street", "classic"], colors: ["sky"], tier: "value" },
    { id: "gr3", name: "Speedlane — Ice Blue Mirror", brand: "RUFE", price: 42, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["groomed", "ice"], style: ["classic", "race"], colors: ["turquoise"], tier: "value" },
    { id: "g2", name: "Squad Mag Goggles", brand: "Smith", price: 210, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["black"], tier: "mid" },
    { id: "g3", name: "Line Miner Prizm Goggles", brand: "Oakley", price: 180, gender: ["m", "w"], ability: ["intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "retro"], colors: ["white"], tier: "mid", image: "https://assets2.oakley.com/prod-onecp-record-files/pieyewear/0172b1ec-840a-4426-8b5c-b35e00f32d63/0OO7070__707013__OOE__shad__030A.png?impolicy=OO_ratio&width=800" },
    { id: "g4", name: "M4 Toric Goggles", brand: "Anon", price: 250, gender: ["m", "w"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "moguls"], style: ["street", "freeride"], colors: ["charcoal", "orange"], tier: "premium" },
    { id: "g5", name: "Sentry Pro Goggles", brand: "Salomon", price: 200, gender: ["m", "w"], ability: ["intermediate", "advanced"], terrain: ["powder", "groomed"], style: ["freeride", "classic"], colors: ["forest", "black"], tier: "mid" },
    { id: "g6", name: "Contour Goggles", brand: "Giro", price: 260, gender: ["m", "w"], ability: ["advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["forest", "black"], tier: "premium" },
    { id: "g7", name: "4D Mag Goggles", brand: "Smith", price: 280, gender: ["m", "w"], ability: ["intermediate", "advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["black", "sand"], tier: "premium" },
    { id: "g8", name: "Flight Deck Prizm Goggles", brand: "Oakley", price: 220, gender: ["m", "w"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["white"], tier: "premium" },
  ],
  helmet: [
    { id: "h1", name: "Ledge MIPS Helmet", brand: "Giro", price: 90, gender: ["m", "w"], ability: ["beginner", "intermediate"], terrain: ["groomed"], style: ["classic"], colors: ["black"], tier: "value" },
    { id: "h2", name: "Method MIPS Helmet", brand: "Smith", price: 130, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park"], style: ["street", "retro"], colors: ["white"], tier: "value" },
    { id: "h3", name: "Chase 2 Plus Helmet", brand: "Scott", price: 160, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street", "classic"], colors: ["white"], tier: "mid" },
    { id: "h4", name: "Mission MIPS Helmet", brand: "Smith", price: 150, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["moguls", "groomed"], style: ["classic", "freeride"], colors: ["black"], tier: "mid" },
    { id: "h5", name: "Neo MIPS Helmet", brand: "Giro", price: 180, gender: ["m", "w"], ability: ["intermediate", "advanced", "expert"], terrain: ["powder", "park"], style: ["freeride", "street"], colors: ["white"], tier: "mid" },
    { id: "h8", name: "Trig MIPS Helmet", brand: "Giro", price: 150, gender: ["m", "w"], ability: ["intermediate", "advanced", "expert"], terrain: ["park", "moguls"], style: ["street", "retro"], colors: ["black"], tier: "mid" },
    { id: "h9", name: "Union MIPS Helmet", brand: "Giro", price: 190, gender: ["m", "w"], ability: ["intermediate", "advanced", "expert"], terrain: ["park"], style: ["street"], colors: ["white"], tier: "premium" },
    { id: "h6", name: "Vantage 2 MIPS Helmet", brand: "Smith", price: 270, gender: ["m", "w"], ability: ["intermediate", "advanced", "expert"], terrain: ["powder", "backcountry"], style: ["freeride"], colors: ["black"], tier: "premium" },
    { id: "h7", name: "Flow Pro MIPS Helmet", brand: "Scott", price: 220, gender: ["m", "w"], ability: ["advanced", "expert"], terrain: ["groomed", "ice", "backcountry"], style: ["race", "classic"], colors: ["white"], tier: "premium" },
  ],
  gloves: [
    { id: "gl1", name: "PowderBound Gloves", brand: "Columbia", price: 75, gender: ["m", "w"], ability: ["beginner", "intermediate"], terrain: ["groomed"], style: ["classic"], colors: ["black"], tier: "value" },
    { id: "gl2", name: "Gondy GORE-TEX Glove", brand: "Burton", price: 120, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park"], style: ["street", "retro"], colors: ["black"], tier: "mid" },
    { id: "gl3", name: "Titan GORE-TEX Mitt", brand: "Dakine", price: 130, gender: ["m", "w"], ability: ["intermediate", "advanced"], terrain: ["park", "powder"], style: ["street", "freeride"], colors: ["forest", "black"], tier: "mid" },
    { id: "gl4", name: "Mercury Mitt", brand: "Black Diamond", price: 150, gender: ["m", "w"], ability: ["intermediate", "advanced", "expert"], terrain: ["backcountry", "powder"], style: ["freeride"], colors: ["white"], tier: "mid" },
    { id: "gl5", name: "Army Leather Heli Glove", brand: "Hestra", price: 200, gender: ["m", "w"], ability: ["advanced", "expert"], terrain: ["backcountry", "moguls"], style: ["freeride", "classic"], colors: ["white"], tier: "premium" },
    { id: "gl6", name: "Fall Line Glove", brand: "Hestra", price: 190, gender: ["m", "w"], ability: ["advanced", "expert"], terrain: ["groomed", "ice"], style: ["race", "classic"], colors: ["forest", "black"], tier: "mid" },
    { id: "gl7", name: "Leather Fall Line Mitt", brand: "Hestra", price: 210, gender: ["m", "w"], ability: ["intermediate", "advanced", "expert"], terrain: ["powder", "groomed"], style: ["retro", "freeride"], colors: ["cream", "sand"], tier: "premium" },
    { id: "gl9", name: "901T Lined Heavy-Duty Pigskin Ski Mitt", brand: "Kinco", price: 55, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced", "expert"], terrain: ["park", "backcountry", "groomed", "powder"], style: ["street", "freeride", "classic"], colors: ["sand"], tier: "value", customizable: true, note: "Natural tan leather — the classic. Most people dye, paint or Sharpie them to match their kit." },
    { id: "glbv1", name: "Insulated Leather Gloves", brand: "Big Vigs Apparel", price: 40, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value" },
    { id: "glbv2", name: "Black & White Insulated Leather Gloves", brand: "Big Vigs Apparel", price: 40, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black", "white"], tier: "value" },
    { id: "gl11", name: "Mittens", brand: "Bandits Apparels", price: 51, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["black"], tier: "value" },
    { id: "gl12", name: "Mittens", brand: "Bandits Apparels", price: 51, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["white"], tier: "value" },
    { id: "gl13", name: "Mittens", brand: "Bandits Apparels", price: 51, gender: ["m", "w"], ability: ["beginner", "intermediate", "advanced"], terrain: ["park", "groomed"], style: ["street"], colors: ["blush"], tier: "value" },
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

function scoreItem(item, answers) {
  let score = 0;
  if (item.ability.includes(answers.ability)) score += 4;

  const terrainSel = answers.terrain || [];
  if (terrainSel.length) {
    const matched = item.terrain.filter((t) => terrainSel.includes(t)).length;
    score += (matched / terrainSel.length) * 4;
  }

  const styleSel = answers.style || [];
  if (styleSel.length) {
    const matched = item.style.filter((s) => styleSel.includes(s)).length;
    score += (matched / styleSel.length) * 4;
  }

  score += colorScore(item, answers.colors);
  score += tierProximity(item.tier, answers.budget);
  if (item.fit && item.fit === answers.fit) score += 3;
  return score;
}

/* Raw score → a friendly percentage for the "match" badge on each
   card. Ceiling of 22 is the max any item could realistically earn
   (4 ability + 4 terrain + 4 style + 4 color + 3 tier + 3 fit).
   Bounded so it never claims a hollow 100% or an alarming near-zero. */
const MAX_MATCH_SCORE = 22;
function matchPercent(item, category, answers, fit, pantFit) {
  const target = category === "pants" ? { ...answers, fit: pantFit } : { ...answers, fit };
  const raw = scoreItem(item, target);
  return Math.max(80, Math.min(98, Math.round((raw / MAX_MATCH_SCORE) * 100) + 20));
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

    // Hard budget ceiling. Tier match used to be only a scoring bonus,
    // which meant a "Budget-Friendly" pick could still land on a premium
    // item if it scored well on ability/terrain/style - and testing showed
    // that happening in 100% of simulated Budget-Friendly runs, blowing
    // past the promised total by up to 3x. Budget is now a real filter:
    // never show anything above the selected tier, with a fallback to the
    // unrestricted pool only if a category has nothing at or under it.
    if (answers.budget) {
      const budgetRank = TIER_ORDER.indexOf(answers.budget);
      const withinBudget = pool.filter((i) => TIER_ORDER.indexOf(i.tier) <= budgetRank);
      if (withinBudget.length) pool = withinBudget;
    }

    // For skis specifically, the TYPE of ski matters more than color —
    // a black Völkl race ski or K2 all-mountain ski isn't a good answer
    // to "I ride park," even if the color happens to line up perfectly.
    // Narrow to the right ski type FIRST, so color can only refine
    // within that pool afterward — never override it.
    let workingPool = pool;
    if (category === "skis" && wantsParkSkis) {
      const parkSkis = workingPool.filter((i) => i.terrain.includes("park"));
      if (parkSkis.length) workingPool = parkSkis;
    } else if (category === "skis" && wantsRaceSkis) {
      const raceSkis = workingPool.filter((i) => i.style.includes("race"));
      if (raceSkis.length) workingPool = raceSkis;
    }

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
      if (exactMatches.length) workingPool = exactMatches;
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
    if (chosenColors.length > 1 && workingPool.length) {
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
      const diff = scoreItem(b, target) - scoreItem(a, target);
      return diff !== 0 ? diff : a.price - b.price;
    });
    rankings[category] = shuffleWithinTopTier(sorted, (item) => scoreItem(item, target));
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
function shuffleWithinTopTier(sortedList, scoreFn) {
  if (sortedList.length <= 1) return sortedList;
  const topScore = scoreFn(sortedList[0]);
  const threshold = topScore * 0.82;
  let cut = 1;
  while (cut < sortedList.length && cut < 4 && scoreFn(sortedList[cut]) >= threshold) cut++;
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
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
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

/* A stick figure wearing the full matched setup — each region filled
   with that category's actual matched colour, so the whole look reads
   at a glance without needing seven separate swatch tiles. Built from
   plain rects/circles rather than freehand curves, since a figure
   made of simple geometric primitives is far less likely to render
   oddly than hand-tuned bezier paths. */
function GearFigure({ colors, sport }) {
  const { helmet, goggles, jacket, gloves, pants, skis } = colors;
  const skin = "#C4B5A0";
  const neutral = "#6B6B70";
  return (
    <svg viewBox="0 0 152 260" width="100%" height="250" style={{ maxWidth: 185 }}>
      {/* skis / board — vertical beside the body, roughly where the raised
          hand grips them. Tips sit at eye level (matching the head at
          cy=37) rather than towering above the head. Both are noticeably
          thicker now — a real ski/board reads as a solid plank, not a thin
          line. Skis get curved upturned tips and a boot binding detail;
          the snowboard gets angled binding straps, so the two sports
          actually look distinct from each other. */}
      {sport === "snowboard" ? (
        <>
          <rect x="102" y="36" width="30" height="203" rx="12" fill={neutral} opacity="0.85" />
          {/* binding straps, angled like a real stance */}
          <rect x="96" y="94" width="42" height="8" rx="4" fill="#2A2A2E" opacity="0.7" transform="rotate(-8 117 98)" />
          <rect x="96" y="172" width="42" height="8" rx="4" fill="#2A2A2E" opacity="0.7" transform="rotate(-8 117 176)" />
        </>
      ) : (
        <>
          {/* left ski — thicker body, tip at eye level */}
          <path d="M 96 58 Q 96 40 107 36 Q 118 40 118 58 L 117 233 Q 117 239 107 239 Q 97 239 96 233 Z" fill={neutral} opacity="0.85" />
          <rect x="94" y="128" width="26" height="9" rx="3.5" fill="#2A2A2E" opacity="0.7" />
          {/* right ski */}
          <path d="M 120 58 Q 120 40 131 36 Q 142 40 142 58 L 141 233 Q 141 239 131 239 Q 121 239 120 233 Z" fill={neutral} opacity="0.85" />
          <rect x="118" y="128" width="26" height="9" rx="3.5" fill="#2A2A2E" opacity="0.7" />
        </>
      )}

      {/* legs — thick rounded-cap strokes function as filled pant legs with
          real volume, not thin lines. Slightly offset from each other for a
          natural weight-bearing stance. */}
      <path d="M 56 138 Q 53 165 54 188 Q 53 212 52 230" stroke={pants || neutral} strokeWidth="22" strokeLinecap="round" fill="none" />
      <path d="M 80 138 Q 82 163 83 186 Q 84 210 84 228" stroke={pants || neutral} strokeWidth="22" strokeLinecap="round" fill="none" />

      {/* ski boots — angled, chunky, filled, rounded corners instead of
          sharp trapezoid points */}
      <path d="M 45 227 Q 41 227 41 231 L 39 238 Q 39 240 41 240 L 63 240 Q 65 240 65 238 L 63 231 Q 63 227 59 227 Z" fill={neutral} />
      <path d="M 77 225 Q 73 225 73 229 L 71 236 Q 71 238 73 238 L 95 238 Q 97 238 97 236 L 95 229 Q 95 225 91 225 Z" fill={neutral} />

      {/* torso — filled jacket silhouette: wide shoulders, tapered waist,
          slight flare at the hem */}
      <path
        d="M 44 66 Q 39 71 41 82 Q 44 102 47 118 Q 47.5 130 48 140 L 88 140 Q 88.5 130 89 118 Q 92 102 95 82 Q 97 71 92 66 Q 80 60 68 60 Q 56 60 44 66 Z"
        fill={jacket || neutral}
      />
      {/* center zipper — a single line down the front reads as "jacket"
          much more than a plain filled shape does */}
      <line x1="68" y1="64" x2="68" y2="138" stroke="#000000" strokeWidth="1.5" opacity="0.25" />
      {/* chest pocket detail */}
      <rect x="73" y="90" width="14" height="10" rx="4" fill="#000000" opacity="0.12" />

      {/* left arm — upper arm and forearm as two thick rounded-cap strokes
          meeting at an elbow angle, reading as a real sleeve with a bend
          rather than one thin line */}
      <path d="M 46 72 Q 36 86 36 102" stroke={jacket || neutral} strokeWidth="17" strokeLinecap="round" fill="none" />
      <path d="M 36 102 Q 36 118 39 130" stroke={jacket || neutral} strokeWidth="15" strokeLinecap="round" fill="none" />
      <rect x="30" y="126" width="16" height="14" rx="6" fill={gloves || neutral} />

      {/* right arm — raised and bent at the elbow to grip the ski/board */}
      <path d="M 90 72 Q 100 66 105 59" stroke={jacket || neutral} strokeWidth="17" strokeLinecap="round" fill="none" />
      <path d="M 105 59 L 103 42" stroke={jacket || neutral} strokeWidth="15" strokeLinecap="round" fill="none" />
      <rect x="96" y="34" width="16" height="14" rx="6" fill={gloves || neutral} />

      {/* hood, bunched at the collar under the helmet */}
      <path d="M 50 62 Q 68 76 86 62 L 86 68 Q 68 82 50 68 Z" fill={jacket || neutral} opacity="0.9" />

      {/* neck */}
      <rect x="62" y="50" width="12" height="14" rx="4" fill={skin} />

      {/* head */}
      <circle cx="68" cy="37" r="16" fill={skin} />

      {/* helmet — sized to cover only the crown down to just above eye
          level, not the whole head. The previous version extended down
          far enough to sit on top of and completely hide the goggles -
          that was the actual bug, not a colour or detail issue. */}
      <path
        d="M 48 34 A 20 17 0 0 1 88 34 L 88 34 Q 88 38 84 39 L 52 39 Q 48 38 48 34 Z"
        fill={helmet || "#2A2A2E"}
      />
      <path d="M 56 23 Q 68 20 80 23" stroke="#000000" strokeWidth="1.2" opacity="0.25" fill="none" strokeLinecap="round" />
      <path d="M 54 28 Q 68 25 82 28" stroke="#000000" strokeWidth="1.2" opacity="0.2" fill="none" strokeLinecap="round" />

      {/* goggles — drawn AFTER the helmet so they sit visibly on top of
          it, right at the helmet's bottom rim. Frame + separate lens
          inset is what actually reads as goggles rather than a flat band. */}
      <rect x="49" y="38" width="38" height="14" rx="7" fill="#161616" />
      <rect x="52.5" y="40.5" width="31" height="9" rx="4.5" fill={goggles || "#3A6EA5"} />
      <path d="M 57 42 L 70 46 L 65 48 L 55 44.5 Z" fill="#FFFFFF" opacity="0.28" />
      <path d="M 49 45 Q 45 45 44 42" stroke="#161616" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 87 45 Q 91 45 92 42" stroke="#161616" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
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
    <div className="fixed inset-0 -z-10 bg-black overflow-hidden">
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
  const [sport, setSport] = useState(null); // "ski" | "snowboard"
  const [previousPhase, setPreviousPhase] = useState("intro");
  const [currency, setCurrency] = useState("CAD");
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [clickedPlan, setClickedPlan] = useState(null);
  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authStatus, setAuthStatus] = useState(null); // null | "sending" | "sent" | "error"
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
      <div className="relative min-h-screen w-full text-white flex flex-col items-center justify-center px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
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
    <div className="relative min-h-screen w-full text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
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
            ) : phase !== "premium" && (
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

              <div className="flex flex-wrap gap-x-8 gap-y-2 mt-8 pt-6 border-t border-white/10">
                {[
                  ["38", "Real brands"],
                  ["237", "Products matched against"],
                  ["6", "Gear categories"],
                ].map(([n, label]) => (
                  <div key={label}>
                    <span className="font-['Barlow_Condensed'] font-black text-2xl text-white">{n}</span>
                    <span className="block text-[11px] uppercase tracking-wide text-white/40 font-semibold">{label}</span>
                  </div>
                ))}
              </div>
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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Mountain size={16} color="#FFFFFF" strokeWidth={2.6} opacity={0.6} />
                  <span className="font-['Barlow_Condensed'] font-bold text-sm tracking-wide uppercase text-white/60">SlopeFit</span>
                </div>
                <button
                  onClick={() => setPhase("sport-select")}
                  className="text-xs uppercase tracking-widest font-semibold text-white/40 hover:text-white transition-colors border-l border-white/15 pl-3"
                >
                  Switch to {sport === "snowboard" ? "Skiing" : "Snowboarding"}
                </button>
              </div>
              <p className="text-xs text-white/35 max-w-md sm:text-right leading-relaxed">
                Some links may be affiliate links — we may earn a commission at no extra cost to you, and it
                never influences which gear gets recommended.
                <br />
                Prototype — not affiliated with or endorsed by any brand shown. Product names and prices are
                for demonstration and should be verified before purchase.
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
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={`${item.brand} ${item.name}`}
                        className="w-full aspect-[4/3] object-cover rounded-lg border border-white/15 bg-black/20"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling.style.display = "flex"; }}
                      />
                    ) : null}
                    {!item.image && (() => {
                      const chosen = answers.colors || [];
                      const overlap = item.colors.filter((c) => chosen.includes(c));
                      const primaryId = overlap[0] || item.colors[0];
                      const primary = colorById[primaryId];
                      const Icon = CATEGORY_ICON_FALLBACK[category] || (category === "skis" ? (sport === "snowboard" ? SnowboardIcon : SkiIcon) : Shirt);
                      return (
                        <div className="w-full aspect-[4/3] rounded-lg border border-white/15 flex items-center justify-center" style={{ backgroundColor: primary?.hex || "#2A2A2E" }}>
                          <Icon size={32} color={primary?.tone === "light" ? "#0B0B0C" : "#FFFFFF"} strokeWidth={1.8} />
                        </div>
                      );
                    })()}
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
                    <GearFigure colors={resolvedColors} sport={sport} />
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
            </div>
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
