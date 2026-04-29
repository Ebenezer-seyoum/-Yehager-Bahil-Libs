export const TAXONOMY = {
  "Oromo": ["Wollega", "Shewa", "Arsi", "Jimma", "Borena", "Harar", "Guji", "Kids", "Apparels"],
  "Amhara": ["Gondar", "Gojam", "Wollo", "Minjar", "Kids", "Apparels"],
  "Tigre": ["Raya", "Adigrat", "Axum", "Shire", "Chiffon", "Kids", "Apparels"],
  "Debub": ["Gurage", "Welaita", "Gamo", "Sidama", "Kids", "Apparels"],
  "Islamic": [],
  "Men": [],
  "Bride & Groom": ["Modern", "Amhara", "Oromo", "Tigre", "Debub"],
  "Mila's Choice": []
};

export const REGIONS = ["Amhara", "Oromo", "Tigre", "Debub", "Islamic", "Men", "Bride & Groom", "Mila's Choice"];

export const LEARN_LANGUAGES_URL = "https://learnethiopianlanguages.online/";

export const REGION_COLORS = {
  "Oromo": "amber",
  "Amhara": "rose",
  "Tigre": "blue",
  "Debub": "green",
  "Mila's Choice": "purple"
};

export const SOCIAL_SHARE_LINKS = (url, message) => [
  {
    name: "WhatsApp",
    icon: "💬",
    href: `https://wa.me/?text=${encodeURIComponent(message + " " + url)}`,
    bg: "bg-green-500"
  },
  {
    name: "Facebook",
    icon: "f",
    href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    bg: "bg-blue-600"
  },
  {
    name: "Messenger",
    icon: "m",
    href: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=291494419107518`,
    bg: "bg-blue-500"
  },
  {
    name: "X / Twitter",
    icon: "✕",
    href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`,
    bg: "bg-black"
  },
  {
    name: "Pinterest",
    icon: "P",
    href: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(message)}`,
    bg: "bg-red-600"
  },
  {
    name: "Telegram",
    icon: "✈",
    href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`,
    bg: "bg-sky-500"
  },
  {
    name: "Snapchat",
    icon: "👻",
    href: `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(url)}`,
    bg: "bg-yellow-400"
  },
  {
    name: "TikTok",
    icon: "♪",
    href: `https://www.tiktok.com/`,
    bg: "bg-neutral-900"
  },
  {
    name: "Instagram",
    icon: "◉",
    href: `https://www.instagram.com/`,
    bg: "bg-gradient-to-tr from-yellow-400 via-rose-500 to-purple-600"
  },
  {
    name: "SMS",
    icon: "✉",
    href: `sms:?body=${encodeURIComponent(message + " " + url)}`,
    bg: "bg-gray-600"
  },
  {
    name: "Email",
    icon: "@",
    href: `mailto:?subject=${encodeURIComponent("Check out this Ethiopian garment!")}&body=${encodeURIComponent(message + "\n\n" + url)}`,
    bg: "bg-red-700"
  }
];