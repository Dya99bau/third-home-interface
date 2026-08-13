export type Role = "guest" | "member" | "keeper";

export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposedBy: string;
  role: Role;
  category: "daily" | "community" | "structural";
  status: "open" | "consented" | "blocked" | "withdrawn";
  createdAt: string;
  deadlineAt: string;
  silentConsenters: number;
  blocks: Block[];
  concerns: Concern[];
}

export interface Block {
  by: string;
  reason: string;
}

export interface Concern {
  by: string;
  text: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  host: string;
  category: "cultural" | "food" | "governance" | "learning" | "social";
  spots: number | null;
  enrolled: string[];
  openTo: Role[];
}

export interface BedSpace {
  id: string;
  type: "single" | "double" | "bunk";
  name: string;
  description: string;
  available: boolean;
  priceGuest: number;
  priceMember: number;
  amenities: string[];
}

export interface Person {
  id: string;
  name: string;
  role: Role;
  since: string;
  contributions: string[];
  avatar: string;
}

export const proposals: Proposal[] = [
  {
    id: "p1",
    title: "Add a composting bin to the kitchen area",
    description:
      "I'd like us to set up a small composting system next to the kitchen. I've found a local pickup service that collects weekly for free. All we need is a lidded bin (≈€15). Silence by the deadline means we go ahead.",
    proposedBy: "Marta",
    role: "keeper",
    category: "daily",
    status: "open",
    createdAt: "2026-05-17",
    deadlineAt: "2026-05-20",
    silentConsenters: 7,
    blocks: [],
    concerns: [
      { by: "Jonas", text: "Will it smell? Maybe we go for a sealed bin with a filter?" },
    ],
  },
  {
    id: "p2",
    title: "Monthly film screening open to neighbourhood",
    description:
      "Propose we open one movie night per month to Wolfsburg residents outside HOME — free entry, donations welcome. This grows our presence in the city and tests if we can host bigger gatherings.",
    proposedBy: "Lena",
    role: "member",
    category: "community",
    status: "open",
    createdAt: "2026-05-14",
    deadlineAt: "2026-05-24",
    silentConsenters: 4,
    blocks: [],
    concerns: [],
  },
  {
    id: "p3",
    title: "Raise Guest contribution from €18 to €22/night",
    description:
      "Utilities have increased since winter. A €4 increase keeps us solvent without touching Member or Keeper rates. This is a structural change — requires unanimous Keeper consent.",
    proposedBy: "Reza",
    role: "keeper",
    category: "structural",
    status: "open",
    createdAt: "2026-05-10",
    deadlineAt: "2026-05-31",
    silentConsenters: 2,
    blocks: [
      {
        by: "Ama",
        reason:
          "I want to see the actual utility numbers first before we raise rates on Guests. Can we share the accounts?",
      },
    ],
    concerns: [],
  },
  {
    id: "p4",
    title: "Quiet hours extended to 10pm on weeknights",
    description:
      "Several people working early shifts have raised this. Shifting quiet hours from 11pm to 10pm Sun–Thu. Fri/Sat stay at midnight.",
    proposedBy: "Chen",
    role: "member",
    category: "daily",
    status: "consented",
    createdAt: "2026-05-01",
    deadlineAt: "2026-05-08",
    silentConsenters: 9,
    blocks: [],
    concerns: [],
  },
  {
    id: "p5",
    title: "Partnership with Wolfsburg Public Library for reading groups",
    description:
      "The library wants to co-host monthly reading groups at HOME. They bring books, we provide the space and host a meal after. No cost to us.",
    proposedBy: "Fatima",
    role: "keeper",
    category: "community",
    status: "consented",
    createdAt: "2026-04-20",
    deadlineAt: "2026-04-30",
    silentConsenters: 11,
    blocks: [],
    concerns: [],
  },
];

export const events: Event[] = [
  {
    id: "e1",
    title: "Wednesday Film Night — Paterson",
    description:
      "Jim Jarmusch's quiet masterpiece about a bus driver poet. 90 min, subtitled. Popcorn provided. Discussion after for whoever wants to stay.",
    date: "2026-05-21",
    time: "20:00",
    host: "Lena",
    category: "cultural",
    spots: null,
    enrolled: ["Jonas", "Marta", "Chen", "Reza"],
    openTo: ["guest", "member", "keeper"],
  },
  {
    id: "e2",
    title: "Collective Cooking — Georgian Feast",
    description:
      "Fatima is teaching us Georgian cooking: khachapuri, lobiani, walnut salad. Bring an appetite and willingness to knead dough. Cost covered by the communal food fund.",
    date: "2026-05-23",
    time: "18:00",
    host: "Fatima",
    category: "food",
    spots: 8,
    enrolled: ["Ama", "Jonas", "Chen"],
    openTo: ["guest", "member", "keeper"],
  },
  {
    id: "e3",
    title: "Keeper Circle — May governance session",
    description:
      "Monthly in-person governance meeting. We'll review open proposals, discuss the utility accounts, and welcome Ama's transition from Member to Keeper.",
    date: "2026-05-25",
    time: "17:00",
    host: "Reza",
    category: "governance",
    spots: null,
    enrolled: ["Reza", "Marta", "Ama", "Fatima"],
    openTo: ["keeper"],
  },
  {
    id: "e4",
    title: "Language Exchange — Arabic / German / English",
    description:
      "Informal language exchange in the common room. Bring whatever language you speak, find someone who wants to learn it. Coffee and cake provided.",
    date: "2026-05-28",
    time: "19:00",
    host: "Ama",
    category: "learning",
    spots: 12,
    enrolled: ["Fatima", "Jonas", "Chen", "Lena", "Reza"],
    openTo: ["guest", "member", "keeper"],
  },
  {
    id: "e5",
    title: "Member Welcome — May intake",
    description:
      "Three new Members joining this month. Come meet them, share a meal, hear what brings people to HOME. For current Members and Keepers.",
    date: "2026-06-01",
    time: "19:30",
    host: "Marta",
    category: "social",
    spots: null,
    enrolled: ["Marta", "Lena", "Reza", "Ama"],
    openTo: ["member", "keeper"],
  },
];

export const bedSpaces: BedSpace[] = [
  {
    id: "s1",
    type: "single",
    name: "Single A — Garden Side",
    description: "South-facing, overlooks the courtyard. The quietest room in the building.",
    available: true,
    priceGuest: 22,
    priceMember: 12,
    amenities: ["Garden view", "Shared bathroom", "Reading lamp", "Storage locker"],
  },
  {
    id: "s2",
    type: "single",
    name: "Single B — Street Side",
    description: "More street noise but blackout curtain provided. Good light in the morning.",
    available: false,
    priceGuest: 22,
    priceMember: 12,
    amenities: ["Blackout curtain", "Shared bathroom", "Reading lamp", "Storage locker"],
  },
  {
    id: "s3",
    type: "single",
    name: "Single C — Corner",
    description: "Corner room with two windows. More natural light than most.",
    available: true,
    priceGuest: 22,
    priceMember: 12,
    amenities: ["Two windows", "Shared bathroom", "Reading lamp", "Storage locker"],
  },
  {
    id: "s4",
    type: "single",
    name: "Single D — Attic",
    description: "Sloped ceiling and a skylight. Compact but full of character.",
    available: true,
    priceGuest: 22,
    priceMember: 12,
    amenities: ["Skylight", "Shared bathroom", "Reading lamp", "Storage locker"],
  },
  {
    id: "d1",
    type: "double",
    name: "Double A — Garden Side",
    description: "Two beds, south-facing. Good for a travelling pair or a member who needs space.",
    available: true,
    priceGuest: 18,
    priceMember: 10,
    amenities: ["Garden view", "Two beds", "Shared bathroom", "Small desk"],
  },
  {
    id: "d2",
    type: "double",
    name: "Double B — Street Side",
    description: "Two beds with good morning light. Blackout curtains on both windows.",
    available: true,
    priceGuest: 18,
    priceMember: 10,
    amenities: ["Blackout curtains", "Two beds", "Shared bathroom", "Small desk"],
  },
  {
    id: "d3",
    type: "double",
    name: "Double C — Corner",
    description: "Corner position, cross ventilation. The most airy double room.",
    available: false,
    priceGuest: 18,
    priceMember: 10,
    amenities: ["Cross ventilation", "Two beds", "Shared bathroom", "Small desk"],
  },
  {
    id: "d4",
    type: "double",
    name: "Double D — Attic",
    description: "Two beds under a sloped ceiling with a large skylight. Popular in summer.",
    available: true,
    priceGuest: 18,
    priceMember: 10,
    amenities: ["Skylight", "Two beds", "Shared bathroom", "Small desk"],
  },
  {
    id: "bk1",
    type: "bunk",
    name: "Bunk Room A",
    description: "Four bunk beds, privacy curtains on each. Best value, great energy.",
    available: true,
    priceGuest: 14,
    priceMember: 8,
    amenities: ["4 beds", "Privacy curtains", "Shared bathroom", "Lockers", "Reading light"],
  },
  {
    id: "bk2",
    type: "bunk",
    name: "Bunk Room B",
    description: "Four bunk beds with individual reading lights and lockable storage.",
    available: false,
    priceGuest: 14,
    priceMember: 8,
    amenities: ["4 beds", "Privacy curtains", "Shared bathroom", "Lockers", "Reading light"],
  },
];

export const people: Person[] = [
  {
    id: "u1",
    name: "Marta",
    role: "keeper",
    since: "2025-03",
    contributions: ["Facility maintenance", "Weekly cleaning coordination", "New member onboarding"],
    avatar: "M",
  },
  {
    id: "u2",
    name: "Reza",
    role: "keeper",
    since: "2025-01",
    contributions: ["Finance tracking", "Supplier relationships", "Governance facilitation"],
    avatar: "R",
  },
  {
    id: "u3",
    name: "Fatima",
    role: "keeper",
    since: "2025-04",
    contributions: ["Community cooking", "Translation (Arabic/German)", "Library partnership"],
    avatar: "F",
  },
  {
    id: "u4",
    name: "Ama",
    role: "keeper",
    since: "2025-11",
    contributions: ["Language exchange hosting", "Social media", "Guest orientation"],
    avatar: "A",
  },
  {
    id: "u5",
    name: "Jonas",
    role: "member",
    since: "2026-02",
    contributions: ["Film night curation"],
    avatar: "J",
  },
  {
    id: "u6",
    name: "Lena",
    role: "member",
    since: "2026-03",
    contributions: ["Event proposals", "Photography"],
    avatar: "L",
  },
  {
    id: "u7",
    name: "Chen",
    role: "member",
    since: "2026-04",
    contributions: ["Kitchen maintenance"],
    avatar: "C",
  },
];

export const roleConfig = {
  guest: {
    label: "Guest",
    color: "bg-[#E8DDD0] text-[#2C1A0E]",
    ring: "ring-[#D4C4B0]",
    description: "Staying 1–7 days. Full access to space and events.",
    contribution: "€14–22/night",
    hours: "None",
  },
  member: {
    label: "Member",
    color: "bg-[#6B7C4E] text-white",
    ring: "ring-[#6B7C4E]",
    description: "Committed for weeks or months. Shape the community.",
    contribution: "€8–12/night",
    hours: "2 hrs/week",
  },
  keeper: {
    label: "Keeper",
    color: "bg-[#C5603B] text-white",
    ring: "ring-[#C5603B]",
    description: "The stable core. Run HOME, hold the culture.",
    contribution: "€0–4/night",
    hours: "6–8 hrs/week",
  },
};
