export type School = {
  id: string;
  name: string;
  logoUrl?: string;
  coverUrl?: string;
  region: string;
  rating: number;
  passRate: number;
};

export type Announcement = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  publishedAt: string;
  summary: string;
};

export const REGIONS = [
  "အားလုံး",
  "ကချင်ပြည်နယ်",
  "ကယားပြည်နယ်",
  "ကရင်ပြည်နယ်",
  "ချင်းပြည်နယ်",
  "စစ်ကိုင်းတိုင်း",
  "တနင်္သာရီတိုင်း",
  "ပဲခူးတိုင်း",
  "မကွေးတိုင်း",
  "မန္တလေးတိုင်း",
  "မွန်ပြည်နယ်",
  "ရခိုင်ပြည်နယ်",
  "ရန်ကုန်တိုင်း",
  "ရှမ်းမြောက်",
  "ရှမ်းတောင်",
  "ရှမ်းအရှေ့",
  "ဧရာဝတီတိုင်း",
  "နေပြည်တော်",
] as const;

// Backend-ready: replace with real fetch (Supabase) later.
export async function fetchSchools(_region: string): Promise<School[]> {
  return [];
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  return [];
}
