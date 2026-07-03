export interface SchoolAdminPersonalDraft {
  applicationId: string;
  fullNameMm: string;
  fullNameEn: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  nrcNumber: string;
  residentialAddress: string;
  stateRegionId: number | null;
  townshipId: number | null;
  nrcState: string;
  nrcTownship: string;
  nrcType: string;
  nrcNumberRaw: string;
}

export interface SchoolAdminPersonalFileDraft {
  nrcFrontFile: File;
  nrcBackFile: File;
}

export const sanitizeFileName = (name: string) =>
  name
    .trim()
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
