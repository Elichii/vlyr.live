/**
 * Help Center content. Written to match how the app works today; update it
 * whenever a feature changes.
 */

export type Block =
  | { type: "p"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | { type: "tip"; text: string }
  | { type: "note"; text: string }

export interface Article {
  id: string
  title: string
  summary: string
  minutes: number
  body: Block[]
  /** Where in the app this happens */
  action?: { label: string; href: string }
}

export interface Topic {
  id: string
  label: string
  description: string
  icon: "rocket" | "sticker" | "star" | "inbox" | "bell" | "google" | "gift" | "map" | "building" | "card" | "lock" | "wrench"
  articles: Article[]
}

export interface GuideStep {
  title: string
  summary: string
  points: string[]
  action: { label: string; href: string }
}

export const GUIDE: GuideStep[] = [
  {
    title: "Connect your Google business",
    summary: "VLYR works with the Google Business Profile you already manage.",
    points: [
      "Sign in with the Google account that manages your business on Google.",
      "Pick your business from the list Google shows us. Only verified owners and managers can connect a business.",
      "We import your name, logo, address, phone, hours, rating and recent reviews automatically.",
    ],
    action: { label: "Open Business Profile", href: "/dashboard/profile" },
  },
  {
    title: "Check your details and review link",
    summary: "Make sure customers see the right business and land on the right review page.",
    points: [
      "On Business Profile, confirm your logo, name, address and map pin.",
      "Your Google review link is added for you. Mark it as primary so happy customers go there.",
      "Add your own details (name, role, mobile) on the right side of the page.",
    ],
    action: { label: "Review my profile", href: "/dashboard/profile" },
  },
  {
    title: "Print your stickers",
    summary: "Every sticker has its own QR code.",
    points: [
      "Go to Supply Shop and choose “Get my 15 free stickers” (free trial) or print more on a paid plan.",
      "Print on US Letter or A4 full-sheet sticker paper at 100% (“Actual size”, not “Fit to page”).",
      "Cut between the small corner marks. Each sheet holds six 2.5″ × 4.3″ stickers.",
    ],
    action: { label: "Go to Supply Shop", href: "/dashboard/supply" },
  },
  {
    title: "Put one on every order",
    summary: "The more customers see a sticker, the more ratings you get.",
    points: [
      "Stick one on every takeaway box, bag, receipt or package. One sticker = one rating.",
      "Place it where customers look after they're served: the lid, the receipt, the bag handle.",
      "Tell your team: “Scan the sticker and tell us how we did.” A short invitation helps a lot.",
    ],
    action: { label: "See placement tips", href: "/dashboard/help?article=placement" },
  },
  {
    title: "Turn on text alerts",
    summary: "Hear about unhappy customers while you can still fix it.",
    points: [
      "Open Feedback and find the Text alerts card.",
      "Enter your mobile number and type in the 6-digit code we text you.",
      "From then on, every 1–3★ sticker rating and new 1–3★ Google review texts you right away.",
    ],
    action: { label: "Set up text alerts", href: "/dashboard/feedback" },
  },
  {
    title: "Follow up and reward",
    summary: "Close the loop and bring customers back.",
    points: [
      "Open Feedback to read every rating. Unhappy ones that still need a reply are listed first.",
      "Contact the customer the way they asked, then mark the feedback as resolved.",
      "Set up a reward (for example “Free drink on your next visit”). Customers get a one-time code for leaving feedback.",
    ],
    action: { label: "Open Feedback", href: "/dashboard/feedback" },
  },
]

export const TOPICS: Topic[] = [
  {
    id: "getting-started",
    label: "Getting started",
    description: "What VLYR does and how to set it up.",
    icon: "rocket",
    articles: [
      {
        id: "what-is-vlyr",
        title: "What is VLYR?",
        summary: "QR stickers that turn every order into honest, real-time customer feedback.",
        minutes: 2,
        body: [
          { type: "p", text: "VLYR helps local businesses hear from their customers. You put a VLYR sticker on every order. Customers scan it, sign in with Google and rate their experience in a few seconds." },
          { type: "list", items: [
            "Happy customers are invited to share their experience on your Google review page.",
            "Unhappy customers reach you privately first, in your Feedback inbox and by text, so you can make it right.",
            "Every sticker has its own QR code, so you can see which order, and roughly where, each rating came from.",
          ] },
          { type: "p", text: "VLYR also watches your Google reviews and tells you about new 1–3★ reviews within minutes." },
        ],
      },
      {
        id: "setup-checklist",
        title: "Your setup checklist",
        summary: "Everything to do in your first day, in order.",
        minutes: 3,
        body: [
          { type: "steps", items: [
            "Connect your Google business (done during sign-up).",
            "Check your Business Profile: logo, address, map pin and primary review link.",
            "Print your stickers from Supply Shop.",
            "Put a sticker on every order and brief your team.",
            "Turn on text alerts on the Feedback page.",
            "Set up a reward on the Rewards page (optional).",
          ] },
          { type: "tip", text: "Scan one of your own stickers to see exactly what your customers see." },
        ],
        action: { label: "Open Business Profile", href: "/dashboard/profile" },
      },
      {
        id: "customer-experience",
        title: "What your customers see",
        summary: "The scan-to-rating journey, step by step.",
        minutes: 2,
        body: [
          { type: "steps", items: [
            "They scan the QR code with their phone camera. No app is needed.",
            "They sign in with Google, so every rating comes from a real person.",
            "They tap 1 to 5 stars and can add a comment, how they'd like you to contact them, and (optionally) their location.",
            "If you offer a reward, they get a one-time code on screen.",
            "Customers who rate 4–5★ get a one-tap link to your Google review page.",
          ] },
          { type: "note", text: "Each sticker can be rated once. Scanning a used sticker shows a friendly “already used” message." },
        ],
      },
    ],
  },
  {
    id: "stickers",
    label: "Stickers & printing",
    description: "Print, cut and place your QR stickers.",
    icon: "sticker",
    articles: [
      {
        id: "print-at-home",
        title: "Print stickers at home",
        summary: "Get perfect stickers from any home or office printer.",
        minutes: 3,
        body: [
          { type: "steps", items: [
            "Open Supply Shop and choose “Get my 15 free stickers” (or “Print labels” on a paid plan).",
            "Download the PDF for US Letter or A4.",
            "Load full-sheet sticker paper and print at 100% / “Actual size”. Don't use “Fit to page”: it shrinks the stickers.",
            "Cut between the small corner marks.",
          ] },
          { type: "tip", text: "Matte sticker paper is easiest to scan under shop lighting. Avoid glossy paper if your counter has bright lights." },
          { type: "note", text: "Downloading the same stickers again prints the same QR codes, so stickers already handed out keep working." },
        ],
        action: { label: "Go to Supply Shop", href: "/dashboard/supply" },
      },
      {
        id: "free-trial-stickers",
        title: "Your 15 free trial stickers",
        summary: "What's included and what happens after.",
        minutes: 2,
        body: [
          { type: "p", text: "The free trial includes one set of 15 stickers in the standard VLYR design, with your business name at the top." },
          { type: "list", items: [
            "You can download that same set again at any time from Supply Shop.",
            "The design can't be changed on the free trial. Upgrading lets you add your logo, colours and custom wording.",
            "When your 15 stickers are used, upgrade to keep collecting ratings.",
          ] },
        ],
        action: { label: "See plans", href: "/dashboard/upgrade" },
      },
      {
        id: "placement",
        title: "Where to put your stickers",
        summary: "Placement makes the biggest difference to how many ratings you get.",
        minutes: 2,
        body: [
          { type: "list", items: [
            "Takeaway boxes and bags: on the lid or across the seal, where it's seen when opening.",
            "Receipts and invoices: stick it next to the total.",
            "Deliveries: on the package, facing up.",
            "Dry cleaning and repairs: on the ticket or garment bag handed back to the customer.",
          ] },
          { type: "tip", text: "Ask at the happy moment, when the customer receives their order, not when they're paying or waiting." },
        ],
      },
      {
        id: "sticker-numbers",
        title: "Sticker numbers and one rating per sticker",
        summary: "Why each sticker is unique.",
        minutes: 1,
        body: [
          { type: "p", text: "Every sticker has its own QR code and a reference number (for example No. 0042) that VLYR tracks for you. When a customer rates, you'll see that number in Feedback and on the Sticker Map." },
          { type: "p", text: "A sticker can be rated once. This keeps ratings honest: nobody can rate the same order twice." },
        ],
      },
    ],
  },
  {
    id: "feedback",
    label: "Ratings & feedback",
    description: "Read ratings and follow up with customers.",
    icon: "inbox",
    articles: [
      {
        id: "feedback-inbox",
        title: "Using the Feedback inbox",
        summary: "Every rating in one place, with the ones that need you first.",
        minutes: 2,
        body: [
          { type: "list", items: [
            "Unhappy ratings (1–3★) that still need a reply appear first.",
            "Each rating shows the stars, comment, sticker number, time and how the customer wants to be contacted.",
            "Add a note for your team and mark the rating as resolved when you've followed up.",
          ] },
          { type: "tip", text: "The green and red numbers next to Feedback in the menu show new happy and unhappy ratings since you last looked." },
        ],
        action: { label: "Open Feedback", href: "/dashboard/feedback" },
      },
      {
        id: "follow-up",
        title: "How to follow up with an unhappy customer",
        summary: "A simple script that turns complaints into comebacks.",
        minutes: 2,
        body: [
          { type: "steps", items: [
            "Reply quickly, ideally the same day.",
            "Thank them for telling you directly.",
            "Say what you'll do differently, briefly and specifically.",
            "Offer something to make it right, then mark it resolved in Feedback.",
          ] },
          { type: "note", text: "Never ask a customer to change or remove a Google review in exchange for anything. It breaks Google's rules." },
        ],
      },
    ],
  },
  {
    id: "alerts",
    label: "Text alerts",
    description: "Get a text for every unhappy rating.",
    icon: "bell",
    articles: [
      {
        id: "text-alerts",
        title: "Turn on text alerts",
        summary: "Hear about 1–3★ ratings the moment they happen.",
        minutes: 2,
        body: [
          { type: "steps", items: [
            "Open Feedback and find the Text alerts card.",
            "Enter your US mobile number and choose “Text me a code”.",
            "Type in the 6-digit code. Alerts switch on straight away.",
            "Use “Send a test” to see what an alert looks like.",
          ] },
          { type: "list", items: [
            "You'll get a text for every 1–3★ sticker rating and every new 1–3★ Google review.",
            "Each alert shows the stars, the sticker number and the customer's comment.",
            "Reply STOP to any text to stop alerts, or switch them off in Feedback.",
          ] },
          { type: "note", text: "Message and data rates may apply. Message frequency depends on how much feedback you receive." },
        ],
        action: { label: "Set up text alerts", href: "/dashboard/feedback" },
      },
    ],
  },
  {
    id: "google",
    label: "Google reviews",
    description: "Your Google rating, reviews and connection.",
    icon: "google",
    articles: [
      {
        id: "google-connection",
        title: "How the Google connection works",
        summary: "Why we ask you to sign in with Google, and what we can see.",
        minutes: 2,
        body: [
          { type: "p", text: "Signing in with Google lets VLYR confirm that you manage the business on Google. Nobody else can connect your business to VLYR." },
          { type: "list", items: [
            "We read your business details, photos and reviews to show them in VLYR.",
            "We never post, reply or change anything on your Google profile.",
            "You can remove VLYR's access any time from your Google account's security settings.",
          ] },
        ],
      },
      {
        id: "review-watch",
        title: "New Google review alerts",
        summary: "VLYR checks your Google reviews every few minutes.",
        minutes: 1,
        body: [
          { type: "p", text: "VLYR checks your Google reviews every 5 minutes. New 1–3★ reviews are flagged and, if text alerts are on, sent to your phone." },
          { type: "p", text: "Your full Google rating and recent reviews are on the Review Analytics page." },
        ],
        action: { label: "Open Review Analytics", href: "/dashboard/analytics" },
      },
      {
        id: "switch-business",
        title: "Connect a different business",
        summary: "Changing which Google business VLYR protects.",
        minutes: 1,
        body: [
          { type: "p", text: "Each VLYR account protects one business today. To use a different one, contact support and we'll move your account over." },
          { type: "note", text: "Stickers from a business that's no longer connected stop accepting ratings. Customers who scan them see a clear message instead." },
        ],
      },
    ],
  },
  {
    id: "rewards",
    label: "Rewards",
    description: "Thank customers for their feedback.",
    icon: "gift",
    articles: [
      {
        id: "rewards",
        title: "Set up a reward",
        summary: "Give customers a one-time code for leaving feedback.",
        minutes: 2,
        body: [
          { type: "steps", items: [
            "Open Rewards and switch rewards on.",
            "Describe the offer, for example “10% off your next order”.",
            "Choose how many days the code stays valid (1–90).",
          ] },
          { type: "p", text: "After rating, the customer sees a one-time code. When they come back, type the code into “Check a customer's code” on the Rewards page and redeem it." },
          { type: "note", text: "Rewards are for leaving feedback at any rating. They must never be offered in exchange for a Google review, which breaks Google's rules." },
        ],
        action: { label: "Open Rewards", href: "/dashboard/rewards" },
      },
    ],
  },
  {
    id: "insights",
    label: "Sticker map & analytics",
    description: "See where and how customers rate you.",
    icon: "map",
    articles: [
      {
        id: "sticker-map",
        title: "Reading the Sticker Map",
        summary: "Where your stickers were scanned and rated.",
        minutes: 2,
        body: [
          { type: "list", items: [
            "Yellow dots are happy ratings (4–5★), red dots unhappy ones (1–3★), grey dots are scans without a rating.",
            "A soft halo means an approximate location (from the customer's network). Solid dots are exact, when the customer chose to share their location.",
            "Filter by rating and time period, and click a sticker in the list to zoom to it.",
          ] },
        ],
        action: { label: "Open Sticker Map", href: "/dashboard/stickers" },
      },
      {
        id: "overview-metrics",
        title: "Understanding your Overview",
        summary: "What each number on the Overview page means.",
        minutes: 2,
        body: [
          { type: "list", items: [
            "Sticker scans: how many times your stickers were scanned.",
            "Ratings: how many customers left a rating.",
            "Need follow-up: unhappy ratings you haven't marked resolved.",
            "Invited to Google: happy customers shown your Google review link.",
          ] },
        ],
        action: { label: "Open Overview", href: "/dashboard" },
      },
    ],
  },
  {
    id: "account",
    label: "Profile & account",
    description: "Your business details and your own.",
    icon: "building",
    articles: [
      {
        id: "business-profile",
        title: "Edit your Business Profile",
        summary: "Logo, address, map pin and review links.",
        minutes: 2,
        body: [
          { type: "list", items: [
            "Logo: printed on paid-plan stickers and shown on your feedback page.",
            "Address and map pin: used for the Sticker Map.",
            "Review links: the primary link is where happy customers are sent.",
            "Your details: your name, role, email and mobile, on the right side of the page.",
          ] },
        ],
        action: { label: "Open Business Profile", href: "/dashboard/profile" },
      },
      {
        id: "sign-out",
        title: "Signing out and signing back in",
        summary: "Your data stays safe while you're signed out.",
        minutes: 1,
        body: [
          { type: "p", text: "Use Sign out at the bottom of the menu. Sign back in with the same Google account. Text alerts keep working while you're signed out." },
        ],
      },
    ],
  },
  {
    id: "billing",
    label: "Plans & billing",
    description: "Free trial, plans and upgrading.",
    icon: "card",
    articles: [
      {
        id: "plans",
        title: "Plans at a glance",
        summary: "Free trial, Starter, Growth and Enterprise.",
        minutes: 2,
        body: [
          { type: "list", items: [
            "Free trial: 15 printable stickers in the standard design. No card needed.",
            "Starter: $49/month ($39/month billed yearly).",
            "Growth: $99/month ($79/month billed yearly).",
            "Enterprise: $249/month ($199/month billed yearly), for multiple locations.",
          ] },
          { type: "p", text: "Paid plans add custom sticker designs and more stickers." },
        ],
        action: { label: "Compare plans", href: "/dashboard/upgrade" },
      },
    ],
  },
  {
    id: "privacy",
    label: "Privacy & security",
    description: "How we protect you and your customers.",
    icon: "lock",
    articles: [
      {
        id: "privacy",
        title: "Your data and your customers' data",
        summary: "What we collect and what we never do.",
        minutes: 2,
        body: [
          { type: "list", items: [
            "Customers sign in with Google so ratings are real. We store their name, email and rating, and only what they choose to share (comment, phone, location).",
            "Your mobile number is used only for verification and the alerts you asked for. It's never shared or sold for marketing.",
            "Only you can see your feedback and customers' contact details.",
          ] },
        ],
        action: { label: "Read the Privacy Policy", href: "/privacy" },
      },
    ],
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting",
    description: "Fix common problems quickly.",
    icon: "wrench",
    articles: [
      {
        id: "qr-wont-scan",
        title: "A sticker won't scan",
        summary: "Usually printing size or lighting.",
        minutes: 1,
        body: [
          { type: "list", items: [
            "Check the PDF was printed at 100% / “Actual size”.",
            "Make sure the QR code isn't creased, wet or covered by tape.",
            "Glare from glossy paper can block scanning; tilt the phone slightly.",
            "If it still won't scan, download the PDF again from Supply Shop and reprint it. The QR codes stay the same.",
          ] },
        ],
      },
      {
        id: "no-text",
        title: "I'm not getting text alerts",
        summary: "Check these four things.",
        minutes: 1,
        body: [
          { type: "steps", items: [
            "On Feedback, make sure Text alerts shows “On” and the right number.",
            "Use “Send a test”.",
            "If you replied STOP before, reply START to the same number, then switch alerts on again.",
            "Still nothing? Contact support and we'll check the delivery report for you.",
          ] },
        ],
      },
      {
        id: "no-businesses",
        title: "My business isn't in the list",
        summary: "When Google doesn't show your business during sign-up.",
        minutes: 1,
        body: [
          { type: "list", items: [
            "Sign in with the Google account that manages the business on Google (check business.google.com).",
            "If someone else owns the profile, ask them to add you as a manager first.",
            "New profiles can take a little while to appear after Google verifies them.",
          ] },
        ],
      },
    ],
  },
]

export const FAQ: { q: string; a: string }[] = [
  { q: "Do my customers need an app?", a: "No. They scan the QR code with their phone camera and everything happens in their browser." },
  { q: "Why do customers sign in with Google?", a: "It makes every rating come from a real person and stops one person rating many times. Customers don't need to share anything else unless they choose to." },
  { q: "Can a customer rate the same sticker twice?", a: "No. Each sticker can be rated once. Put a new sticker on every order." },
  { q: "Will unhappy customers still be able to post on Google?", a: "Yes. VLYR never stops anyone from posting on Google. It gives you a private, faster way to hear about problems and fix them." },
  { q: "How fast do text alerts arrive?", a: "Sticker ratings text you within seconds. New Google reviews are checked every 5 minutes." },
  { q: "Can I change the sticker design?", a: "On the free trial the standard design is used. Paid plans can add a logo, colours and their own wording." },
  { q: "What paper should I use?", a: "Full-sheet sticker paper in US Letter or A4. Matte paper scans best. Print at 100% (“Actual size”)." },
  { q: "My printed stickers look smaller than expected.", a: "Your printer used “Fit to page”. Print again at 100% / “Actual size”." },
  { q: "Can I download my stickers again?", a: "Yes. Supply Shop lets you download the same stickers again at any time. The QR codes stay the same." },
  { q: "What happens to my stickers if I disconnect my business?", a: "They stop accepting ratings, and customers who scan them see a clear message instead." },
  { q: "Do rewards break Google's rules?", a: "Not when they're for feedback in general, at any rating, which is how VLYR rewards work. Never offer anything in exchange for a Google review." },
  { q: "Who can see the feedback?", a: "Only people signed in to your VLYR account. Customers' contact details are never shared." },
  { q: "How do I stop text alerts?", a: "Reply STOP to any alert, or switch alerts off on the Feedback page." },
  { q: "Can I manage more than one location?", a: "Each account protects one business today. Multi-location support is coming; contact us if you need it now." },
]

export const SUPPORT_EMAIL = "support@vlyr.io"
