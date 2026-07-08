import { supabase } from "@/integrations/supabase/client";

export const SCHOOL_IMAGE_BUCKET = "application-school-logos";

function normalizeSchoolImagePath(path: string) {
  let normalizedPath = path.trim().replace(/^\/+/, "");

  if (normalizedPath.startsWith(`${SCHOOL_IMAGE_BUCKET}/`)) {
    normalizedPath = normalizedPath.slice(SCHOOL_IMAGE_BUCKET.length + 1);
  }

  return normalizedPath;
}

export async function getSchoolImageUrl(path?: string | null) {
  if (!path) return "";

  if (/^(https?:|data:|blob:)/.test(path)) {
    return path;
  }

  const objectPath = normalizeSchoolImagePath(path);

  try {
    const folder = objectPath.substring(0, objectPath.lastIndexOf("/"));

    await supabase.storage.from(SCHOOL_IMAGE_BUCKET).list(folder);

    const { data, error } = await supabase.storage
      .from(SCHOOL_IMAGE_BUCKET)
      .createSignedUrl(objectPath, 60 * 60);

    if (error || !data?.signedUrl) {
      console.error("School image signed URL failed", {
        bucket: SCHOOL_IMAGE_BUCKET,
        path: objectPath,
        originalPath: path,
        error,
        data,
      });

      return "";
    }

    const separator = data.signedUrl.includes("?") ? "&" : "?";
    return `${data.signedUrl}${separator}v=${Date.now()}`;
  } catch (error) {
    console.error("School image signed URL failed", {
      bucket: SCHOOL_IMAGE_BUCKET,
      path: objectPath,
      originalPath: path,
      error,
      data: null,
    });
    return "";
  }
}

export async function attachSchoolImageUrls<T extends { logo_url?: string | null; cover_image_url?: string | null }>(
  school: T,
) {
  const [logoUrl, coverUrl] = await Promise.all([
    getSchoolImageUrl(school.logo_url),
    getSchoolImageUrl(school.cover_image_url),
  ]);

  return {
    ...school,
    logoPreviewUrl: logoUrl,
    coverPreviewUrl: coverUrl,
  };
}
