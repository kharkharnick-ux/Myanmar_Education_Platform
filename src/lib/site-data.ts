import { getPublicApprovedSchools, type PublicApprovedSchool } from "@/lib/api/public-schools.functions";

export type School = PublicApprovedSchool;

export type Announcement = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  publishedAt: string;
  summary: string;
};

export const ALL_REGIONS = "အားလုံး";

export const REGIONS = [ALL_REGIONS] as const;

const APPROVED_SCHOOLS_CACHE_MS = 30 * 1000;

let approvedSchoolsCache: { data: School[]; expiresAt: number } | null = null;
let approvedSchoolsRequest: Promise<School[]> | null = null;

async function getCachedApprovedSchools() {
  const now = Date.now();

  if (approvedSchoolsCache && approvedSchoolsCache.expiresAt > now) {
    return approvedSchoolsCache.data;
  }

  if (approvedSchoolsRequest) {
    return approvedSchoolsRequest;
  }

  approvedSchoolsRequest = getPublicApprovedSchools()
    .then((schools) => {
      approvedSchoolsCache = {
        data: schools,
        expiresAt: Date.now() + APPROVED_SCHOOLS_CACHE_MS,
      };
      return schools;
    })
    .finally(() => {
      approvedSchoolsRequest = null;
    });

  return approvedSchoolsRequest;
}

export function hasFreshApprovedSchoolsCache() {
  return Boolean(approvedSchoolsCache && approvedSchoolsCache.expiresAt > Date.now());
}

export async function fetchSchools(region: string): Promise<School[]> {
  const startedAt = performance.now();
  const schools = await getCachedApprovedSchools();

  if (import.meta.env.DEV) {
    console.log("Approved schools fetch duration", {
      durationMs: Math.round(performance.now() - startedAt),
      cached: Boolean(approvedSchoolsCache && approvedSchoolsCache.expiresAt > Date.now()),
      count: schools.length,
    });
  }

  return schools.filter((school) => {
    if (!region || region === ALL_REGIONS) return true;
    return school.region === region;
  });
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  return [];
}
