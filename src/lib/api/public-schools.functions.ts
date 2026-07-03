import { createServerFn } from "@tanstack/react-start";

const SCHOOL_IMAGE_BUCKET = "application-school-logos";
const SIGNED_URL_EXPIRES_IN = 60 * 60;

type ApprovedSchoolRow = {
  id: string;
  school_name: string;
  school_type: string;
  grade_from: string;
  grade_to: string;
  address: string | null;
  school_phone: string | null;
  school_email: string | null;
  website: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  regions?: { name: string | null } | null;
  townships?: { name: string | null } | null;
};

export type PublicApprovedSchool = {
  id: string;
  name: string;
  schoolType: string;
  gradeFrom: string;
  gradeTo: string;
  logoUrl: string;
  coverUrl: string;
  region: string;
  township: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
};

function normalizeSchoolImagePath(path: string) {
  let normalizedPath = path.trim().replace(/^\/+/, "");

  if (normalizedPath.startsWith(`${SCHOOL_IMAGE_BUCKET}/`)) {
    normalizedPath = normalizedPath.slice(SCHOOL_IMAGE_BUCKET.length + 1);
  }

  return normalizedPath;
}

function withCacheBust(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
}

export const getPublicApprovedSchools = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("schools")
    .select(
      "id, school_name, school_type, grade_from, grade_to, address, school_phone, school_email, website, logo_url, cover_image_url, regions(name), townships(name)",
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const signSchoolImage = async (path?: string | null) => {
    if (!path) return "";
    if (/^(https?:|data:|blob:)/.test(path)) return path;

    const objectPath = normalizeSchoolImagePath(path);

    try {
      const { data: signedData, error: signedError } = await supabaseAdmin.storage
        .from(SCHOOL_IMAGE_BUCKET)
        .createSignedUrl(objectPath, SIGNED_URL_EXPIRES_IN);

      if (signedError || !signedData?.signedUrl) {
        console.error("Public school image signed URL failed", {
          bucket: SCHOOL_IMAGE_BUCKET,
          path: objectPath,
          originalPath: path,
          error: signedError,
          data: signedData,
        });
        return "";
      }

      return withCacheBust(signedData.signedUrl);
    } catch (signError) {
      console.error("Public school image signed URL failed", {
        bucket: SCHOOL_IMAGE_BUCKET,
        path: objectPath,
        originalPath: path,
        error: signError,
        data: null,
      });
      return "";
    }
  };

  const schools = await Promise.all(
    ((data || []) as ApprovedSchoolRow[]).map(async (school) => {
      const [logoUrl, coverUrl] = await Promise.all([
        signSchoolImage(school.logo_url),
        signSchoolImage(school.cover_image_url),
      ]);

      return {
        id: school.id,
        name: school.school_name,
        schoolType: school.school_type,
        gradeFrom: school.grade_from,
        gradeTo: school.grade_to,
        logoUrl,
        coverUrl,
        region: school.regions?.name || "",
        township: school.townships?.name || "",
        address: school.address || "",
        phone: school.school_phone || undefined,
        email: school.school_email || undefined,
        website: school.website || undefined,
      } satisfies PublicApprovedSchool;
    }),
  );

  return schools;
});
