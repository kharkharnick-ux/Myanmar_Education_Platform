import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SCHOOL_IMAGE_BUCKET = "application-school-logos";
const SIGNED_URL_EXPIRES_IN = 60 * 60;

const schoolDetailInputSchema = z.object({
  schoolId: z.string().uuid(),
});

type ApprovedSchoolRow = {
  id: string;
  school_name: string;
  school_type: string;
  grade_from: string;
  grade_to: string;
  address: string | null;
  owner_name?: string | null;
  owner_phone?: string | null;
  owner_email?: string | null;
  school_phone: string | null;
  school_email: string | null;
  website: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  status?: string | null;
  school_admin_id?: string | null;
  school_admin?: { full_name: string | null; email: string | null } | null;
  regions?: { name: string | null } | null;
  townships?: { name: string | null } | null;
};

type AcademicYearRow = {
  id: string;
  name: string | null;
};

type SchoolAcademicStatisticRow = {
  school_id: string;
  rating_average: number | null;
  rating_count: number | null;
  pass_rate: number | null;
  distinction_count: number | null;
  highlight_badge: string | null;
};

type TeacherPrincipalRow = {
  profile_id: string | null;
};

type PrincipalProfileRow = {
  full_name: string | null;
  full_name_en: string | null;
  email: string | null;
  phone: string | null;
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
  rating_average?: number;
  rating_count?: number;
  pass_rate?: number;
  distinction_count?: number;
  highlight_badge?: string;
  academic_year_name?: string;
};

export type PublicSchoolDetail = PublicApprovedSchool & {
  status: string;
  acceptingStudents: boolean;
  studentCount: number;
  teacherCount: number;
  principalName: string;
  principalEmail?: string;
  principalPhone?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
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

  const schoolRows = (data || []) as ApprovedSchoolRow[];
  const schoolIds = schoolRows.map((school) => school.id);
  const statisticsBySchoolId = new Map<string, SchoolAcademicStatisticRow>();

  const { data: activeAcademicYear, error: activeAcademicYearError } = await supabaseAdmin
    .from("academic_years")
    .select("id, name")
    .eq("status", "active")
    .maybeSingle();

  if (activeAcademicYearError) {
    console.error("Failed to fetch active academic year for public schools", activeAcademicYearError);
  }

  if (schoolIds.length > 0 && activeAcademicYear?.id) {
    const { data: statisticsRows, error: statisticsError } = await supabaseAdmin
      .from("school_academic_statistics")
      .select("school_id, rating_average, rating_count, pass_rate, distinction_count, highlight_badge")
      .eq("academic_year_id", (activeAcademicYear as AcademicYearRow).id)
      .in("school_id", schoolIds);

    if (statisticsError) {
      console.error("Failed to fetch public school academic statistics", statisticsError);
    } else {
      ((statisticsRows || []) as SchoolAcademicStatisticRow[]).forEach((statistic) => {
        statisticsBySchoolId.set(statistic.school_id, statistic);
      });
    }
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
    schoolRows.map(async (school) => {
      const [logoUrl, coverUrl] = await Promise.all([
        signSchoolImage(school.logo_url),
        signSchoolImage(school.cover_image_url),
      ]);
      const statistic = statisticsBySchoolId.get(school.id);

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
        rating_average: statistic?.rating_average ?? undefined,
        rating_count: statistic?.rating_count ?? undefined,
        pass_rate: statistic?.pass_rate ?? undefined,
        distinction_count: statistic?.distinction_count ?? undefined,
        highlight_badge: statistic?.highlight_badge || undefined,
        academic_year_name: (activeAcademicYear as AcademicYearRow | null)?.name || undefined,
      } satisfies PublicApprovedSchool;
    }),
  );

  return schools;
});

export const getPublicSchoolDetail = createServerFn({ method: "POST" })
  .validator(schoolDetailInputSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from("schools")
      .select(
        "id, school_name, school_type, grade_from, grade_to, address, owner_name, owner_phone, owner_email, school_phone, school_email, website, logo_url, cover_image_url, status, school_admin_id, school_admin:profiles!schools_school_admin_id_fkey(full_name, email), regions(name), townships(name)",
      )
      .eq("id", data.schoolId)
      .maybeSingle();

    if (schoolError) {
      throw schoolError;
    }

    if (!schoolData) {
      throw new Error("School not found");
    }

    const school = schoolData as ApprovedSchoolRow;

    const signSchoolImage = async (path?: string | null) => {
      if (!path) return "";
      if (/^(https?:|data:|blob:)/.test(path)) return path;

      const objectPath = normalizeSchoolImagePath(path);

      try {
        const { data: signedData, error: signedError } = await supabaseAdmin.storage
          .from(SCHOOL_IMAGE_BUCKET)
          .createSignedUrl(objectPath, SIGNED_URL_EXPIRES_IN);

        if (signedError || !signedData?.signedUrl) {
          console.error("Public school detail image signed URL failed", {
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
        console.error("Public school detail image signed URL failed", {
          bucket: SCHOOL_IMAGE_BUCKET,
          path: objectPath,
          originalPath: path,
          error: signError,
          data: null,
        });
        return "";
      }
    };

    const countSchoolRows = async (table: "students" | "teachers") => {
      const { count, error } = await supabaseAdmin
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("school_id", school.id);

      if (error) {
        console.error(`Failed to count ${table} for public school detail`, error);
        return 0;
      }

      return count ?? 0;
    };

    const fetchPrincipalProfile = async () => {
      const { data: principalTeacher, error: principalTeacherError } = await supabaseAdmin
        .from("teachers")
        .select("profile_id")
        .eq("school_id", school.id)
        .eq("level", "principal")
        .maybeSingle();

      if (principalTeacherError) {
        console.error("Failed to fetch public school principal teacher", principalTeacherError);
        return null;
      }

      const profileId = (principalTeacher as TeacherPrincipalRow | null)?.profile_id;
      if (!profileId) return null;

      const { data: principalProfile, error: principalProfileError } = await supabaseAdmin
        .from("profiles")
        .select("full_name, full_name_en, email, phone")
        .eq("id", profileId)
        .maybeSingle();

      if (principalProfileError) {
        console.error("Failed to fetch public school principal profile", principalProfileError);
        return null;
      }

      return principalProfile as PrincipalProfileRow | null;
    };

    const [
      logoUrl,
      coverUrl,
      studentCount,
      teacherCount,
      principalProfile,
      activeAcademicYearResult,
    ] = await Promise.all([
      signSchoolImage(school.logo_url),
      signSchoolImage(school.cover_image_url),
      countSchoolRows("students"),
      countSchoolRows("teachers"),
      fetchPrincipalProfile(),
      supabaseAdmin.from("academic_years").select("id, name").eq("status", "active").maybeSingle(),
    ]);

    const activeAcademicYear = activeAcademicYearResult.data as AcademicYearRow | null;
    if (activeAcademicYearResult.error) {
      console.error("Failed to fetch active academic year for public school detail", activeAcademicYearResult.error);
    }

    let statistic: SchoolAcademicStatisticRow | null = null;

    if (activeAcademicYear?.id) {
      const { data: statisticData, error: statisticError } = await supabaseAdmin
        .from("school_academic_statistics")
        .select("school_id, rating_average, rating_count, pass_rate, distinction_count, highlight_badge")
        .eq("school_id", school.id)
        .eq("academic_year_id", activeAcademicYear.id)
        .maybeSingle();

      if (statisticError) {
        console.error("Failed to fetch public school detail academic statistics", statisticError);
      } else {
        statistic = statisticData as SchoolAcademicStatisticRow | null;
      }
    }

    const principalName =
      principalProfile?.full_name ||
      principalProfile?.full_name_en ||
      school.school_admin?.full_name ||
      school.owner_name ||
      "";

    // TODO: Replace this with a dedicated admission/active column when the backend exposes one.
    const acceptingStudents = (school.status || "approved") === "approved";

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
      rating_average: statistic?.rating_average ?? undefined,
      rating_count: statistic?.rating_count ?? undefined,
      pass_rate: statistic?.pass_rate ?? undefined,
      distinction_count: statistic?.distinction_count ?? undefined,
      highlight_badge: statistic?.highlight_badge || undefined,
      academic_year_name: activeAcademicYear?.name || undefined,
      status: school.status || "unknown",
      acceptingStudents,
      studentCount,
      teacherCount,
      principalName,
      principalEmail: principalProfile?.email || school.school_admin?.email || undefined,
      principalPhone: principalProfile?.phone || undefined,
      ownerName: school.owner_name || undefined,
      ownerEmail: school.owner_email || undefined,
      ownerPhone: school.owner_phone || undefined,
    } satisfies PublicSchoolDetail;
  });
