import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const profileInputSchema = z.object({
  applicationId: z.string().uuid(),
  fullNameMm: z.string().min(1),
  fullNameEn: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  dob: z.string().min(1),
  gender: z.string().min(1),
  nrcNumber: z.string().min(1),
  residentialAddress: z.string().nullable(),
  stateRegionId: z.number().int().nullable(),
  townshipId: z.number().int().nullable(),
  nrcFrontUrl: z.string().min(1),
  nrcBackUrl: z.string().min(1),
});

const schoolSubmissionSchema = z.object({
  applicationId: z.string().uuid(),
  schoolName: z.string().min(1),
  schoolType: z.enum(["private", "public"]),
  schoolLevel: z.enum(["primary", "middle", "high"]),
  gradeFrom: z.string().min(1),
  gradeTo: z.string().min(1),
  regionId: z.number().int(),
  townshipId: z.number().int(),
  address: z.string().min(1),
  licenseDocumentUrl: z.string().nullable(),
  buildingDocumentUrl: z.string().nullable(),
  landDocumentUrl: z.string().nullable(),
  ownerApplicationDocumentUrl: z.string().nullable(),
  schoolPhone: z.string().nullable(),
  schoolEmail: z.string().email().nullable(),
  website: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  personalSnapshot: profileInputSchema.omit({ applicationId: true }),
});

const reviewInputSchema = z.object({
  applicationId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().optional(),
  accessToken: z.string().min(1),
});

const activateInputSchema = z.object({
  accessToken: z.string().min(1),
});

type RegistrationRequestRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
  request_type: string;
  full_name_mm: string;
  full_name_en: string | null;
  email: string;
  phone: string;
  date_of_birth: string | null;
  gender: string | null;
  nrc_number: string;
  residential_address: string | null;
  state_region_id: number | null;
  township_id: number | null;
  nrc_front_url: string | null;
  nrc_back_url: string | null;
  school_name: string;
  school_type: string;
  grade_from: string | null;
  grade_to: string | null;
  region_id: number | null;
  school_township_id: number | null;
  school_address: string;
  license_document_url: string | null;
  building_document_url: string | null;
  land_document_url: string | null;
  owner_application_document_url: string | null;
  school_phone: string | null;
  school_email: string | null;
  reviewed_by?: string | null;
};

type AuthUserRecord = {
  id: string;
  email?: string | null;
};

const gradeOrder = ["KG", ...Array.from({ length: 12 }, (_, index) => `G-${index + 1}`)];

const gradeIndex = (grade: string) => gradeOrder.indexOf(grade);

const validateGradeRangeForLevel = (level: "primary" | "middle" | "high", gradeFrom: string, gradeTo: string) => {
  const fromIndex = gradeIndex(gradeFrom);
  const toIndex = gradeIndex(gradeTo);
  const primaryMaxGradeIndex = gradeIndex("G-5");
  const middleMinGradeIndex = gradeIndex("G-6");
  const middleMaxGradeIndex = gradeIndex("G-9");
  const highMinGradeIndex = gradeIndex("G-10");
  const highMaxGradeIndex = gradeIndex("G-12");

  if (fromIndex < 0 || toIndex < 0 || toIndex < fromIndex) return false;
  if (level === "primary") return fromIndex <= primaryMaxGradeIndex && toIndex <= primaryMaxGradeIndex;
  if (level === "middle") return fromIndex <= middleMaxGradeIndex && toIndex >= middleMinGradeIndex && toIndex <= middleMaxGradeIndex;
  return toIndex >= highMinGradeIndex && toIndex <= highMaxGradeIndex;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const PASSWORD_SETUP_EMAIL_CONFIG_ERROR =
  "Password setup email မပို့နိုင်သေးပါ။\nServer configuration ကိုစစ်ဆေးရန်လိုအပ်ပါသည်။";

const isMissingSupabaseServerEnvError = (error: unknown) =>
  error instanceof Error &&
  error.message.includes("Missing Supabase server environment variable");

const findAuthUserByEmail = async (
  supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  email: string,
): Promise<AuthUserRecord | null> => {
  const normalizedEmail = normalizeEmail(email);

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    const users = data?.users || [];
    const matchingUser = users.find((user) => normalizeEmail(user.email || "") === normalizedEmail);
    if (matchingUser) return matchingUser;
    if (users.length < 1000) return null;
  }

  return null;
};

const getOrInviteSchoolAdminUser = async (
  supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  request: RegistrationRequestRow,
  reviewerId: string,
): Promise<AuthUserRecord> => {
  console.info("[School admin approval debug] getOrInviteSchoolAdminUser reached", {
    requestId: request.id,
    emailExists: Boolean(request.email),
  });

  const redirectTo = await getPasswordSetupRedirectUrl();
  const existingUser = await findAuthUserByEmail(supabaseAdmin, request.email);
  if (existingUser) {
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
      user_metadata: {
        full_name: request.full_name_mm,
        full_name_en: request.full_name_en,
        role: "school_admin",
        registration_request_id: request.id,
        approved_by_super_admin_id: reviewerId,
      },
    });

    if (updateError) throw updateError;

    const { error: recoveryError } = await supabaseAdmin.auth.resetPasswordForEmail(
      normalizeEmail(request.email),
      { redirectTo },
    );

    if (recoveryError) throw recoveryError;
    return existingUser;
  }

  console.info("[School admin approval debug] inviteUserByEmail reached", {
    requestId: request.id,
    emailExists: Boolean(request.email),
    redirectToExists: Boolean(redirectTo),
  });

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizeEmail(request.email), {
    redirectTo,
    data: {
      full_name: request.full_name_mm,
      full_name_en: request.full_name_en,
      role: "school_admin",
      registration_request_id: request.id,
      approved_by_super_admin_id: reviewerId,
    },
  });

  if (error) {
    console.error("[School admin approval debug] inviteUserByEmail Supabase error", error);
    if (/already|registered|exists/i.test(error.message)) {
      const userAfterRetry = await findAuthUserByEmail(supabaseAdmin, request.email);
      if (userAfterRetry) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userAfterRetry.id, {
          user_metadata: {
            full_name: request.full_name_mm,
            full_name_en: request.full_name_en,
            role: "school_admin",
            registration_request_id: request.id,
            approved_by_super_admin_id: reviewerId,
          },
        });
        if (updateError) throw updateError;

        const { error: recoveryError } = await supabaseAdmin.auth.resetPasswordForEmail(
          normalizeEmail(request.email),
          { redirectTo },
        );
        if (recoveryError) throw recoveryError;
        return userAfterRetry;
      }
    }

    throw error;
  }

  if (!data.user) throw new Error("Unable to provision School Admin auth user.");
  return data.user;
};

const getSchoolDocumentUrl = (request: RegistrationRequestRow) =>
  request.license_document_url ||
  request.building_document_url ||
  request.land_document_url ||
  request.owner_application_document_url ||
  "";

const getPasswordSetupRedirectUrl = async () => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const request = getRequest();
  const localDevOrigin = "http://localhost:8080";
  const origin =
    process.env.APP_ORIGIN ||
    process.env.SITE_URL ||
    process.env.VITE_APP_URL ||
    (request ? new URL(request.url).origin : localDevOrigin);

  return `${origin.replace(/\/$/, "")}/auth/setup-password`;
};

const requireSchoolRegistrationFields = (request: RegistrationRequestRow) => {
  if (request.school_type !== "private" && request.school_type !== "public") {
    throw new Error("Invalid school type in registration request.");
  }

  if (!request.grade_from || !request.grade_to) {
    throw new Error("Registration request is missing grade range.");
  }

  if (!request.region_id || !request.school_township_id) {
    throw new Error("Registration request is missing school region or township.");
  }

  if (request.school_type === "private" && !request.license_document_url) {
    throw new Error("Private school registration request is missing license document.");
  }
};

const provisionApprovedSchoolAdmin = async (
  supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  request: RegistrationRequestRow,
  authUser: AuthUserRecord,
  reviewerId: string | null,
) => {
  const now = new Date().toISOString();
  const normalizedEmail = normalizeEmail(request.email);

  requireSchoolRegistrationFields(request);

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: authUser.id,
      email: normalizedEmail,
      full_name: request.full_name_mm,
      full_name_en: request.full_name_en,
      phone: request.phone,
      avatar_url: null,
      role: "school_admin",
      status: "active",
      date_of_birth: request.date_of_birth,
      gender: request.gender,
      nrc_number: request.nrc_number,
      residential_address: request.residential_address,
      state_region_id: request.state_region_id,
      township_id: request.township_id,
      nrc_front_url: request.nrc_front_url,
      nrc_back_url: request.nrc_back_url,
      updated_at: now,
    },
    { onConflict: "id" },
  );

  if (profileError) throw profileError;

  const { data: school, error: schoolError } = await supabaseAdmin
    .from("schools")
    .insert({
      school_name: request.school_name,
      school_type: request.school_type,
      grade_from: request.grade_from,
      grade_to: request.grade_to,
      region_id: request.region_id,
      township_id: request.school_township_id,
      address: request.school_address,
      owner_name: request.full_name_mm,
      owner_phone: request.phone,
      owner_email: normalizedEmail,
      document_url: getSchoolDocumentUrl(request),
      status: "approved",
      school_admin_id: authUser.id,
      approved_by: reviewerId,
      approved_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (schoolError) throw schoolError;
  if (!school?.id) throw new Error("School was approved but no school id was returned.");

  const { error: reviewError } = await supabaseAdmin
    .from("registration_requests")
    .update({
      status: "approved",
      reviewed_at: now,
      reviewed_by: reviewerId,
      rejection_reason: null,
      approved_profile_id: authUser.id,
      approved_school_id: school.id,
    })
    .eq("id", request.id)
    .eq("request_type", "school_admin")
    .eq("status", "pending");

  if (reviewError) throw reviewError;

  return { profileId: authUser.id, schoolId: school.id };
};

export const submitSchoolRegistration = createServerFn({ method: "POST" })
  .validator(schoolSubmissionSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!validateGradeRangeForLevel(data.schoolLevel, data.gradeFrom, data.gradeTo)) {
      throw new Error("Selected school level and grade range do not match.");
    }

    if (
      data.schoolType === "private" &&
      (!data.licenseDocumentUrl ||
        !data.buildingDocumentUrl ||
        !data.landDocumentUrl ||
        !data.ownerApplicationDocumentUrl)
    ) {
      throw new Error("Private school requires all four PDF documents.");
    }

    const { error: requestError } = await supabaseAdmin.from("registration_requests").insert({
      id: data.applicationId,
      request_type: "school_admin",
      status: "pending",

      full_name_mm: data.personalSnapshot.fullNameMm,
      full_name_en: data.personalSnapshot.fullNameEn || null,
      email: data.personalSnapshot.email.trim().toLowerCase(),
      phone: data.personalSnapshot.phone,
      date_of_birth: data.personalSnapshot.dob || null,
      gender: data.personalSnapshot.gender || null,
      nrc_number: data.personalSnapshot.nrcNumber,
      residential_address: data.personalSnapshot.residentialAddress,
      state_region_id: data.personalSnapshot.stateRegionId,
      township_id: data.personalSnapshot.townshipId,
      nrc_front_url: data.personalSnapshot.nrcFrontUrl,
      nrc_back_url: data.personalSnapshot.nrcBackUrl,

      school_name: data.schoolName,
      school_type: data.schoolType,
      school_level: data.schoolLevel,
      grade_from: data.gradeFrom,
      grade_to: data.gradeTo,
      region_id: data.regionId,
      school_township_id: data.townshipId,
      school_address: data.address,
      school_phone: data.schoolPhone,
      school_email: data.schoolEmail,
      website: data.website,
      latitude: data.latitude,
      longitude: data.longitude,

      license_document_url: data.licenseDocumentUrl,
      building_document_url: data.buildingDocumentUrl,
      land_document_url: data.landDocumentUrl,
      owner_application_document_url: data.ownerApplicationDocumentUrl,

      approved_profile_id: null,
      approved_school_id: null,
    });

    if (requestError) throw requestError;

    return { applicationId: data.applicationId };
  });

export const reviewSchoolAdminApplication = createServerFn({ method: "POST" })
  .validator(reviewInputSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let user;
    let authError;

    try {
      const authResult = await supabaseAdmin.auth.getUser(data.accessToken);
      user = authResult.data.user;
      authError = authResult.error;
    } catch (error) {
      if (isMissingSupabaseServerEnvError(error)) {
        console.error("School admin approval server configuration error:", error);
        throw new Error(PASSWORD_SETUP_EMAIL_CONFIG_ERROR);
      }

      throw error;
    }

    if (authError) throw authError;
    if (!user) throw new Error("Unauthorized.");

    const { data: reviewerProfile, error: reviewerError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (reviewerError) throw reviewerError;
    if (reviewerProfile.role !== "super_admin") throw new Error("Super admin permission required.");

    const now = new Date().toISOString();

    if (data.status === "rejected" && !data.rejectionReason?.trim()) {
      throw new Error("Rejection reason is required.");
    }

    if (data.status === "rejected") {
      const { error: rejectError } = await supabaseAdmin
        .from("registration_requests")
        .update({
          status: "rejected",
          reviewed_at: now,
          reviewed_by: user.id,
          rejection_reason: data.rejectionReason?.trim(),
        })
        .eq("id", data.applicationId)
        .eq("request_type", "school_admin")
        .eq("status", "pending");

      if (rejectError) throw rejectError;

      return { ok: true };
    }

    const { data: request, error: requestError } = await supabaseAdmin
      .from("registration_requests")
      .select("*")
      .eq("id", data.applicationId)
      .eq("request_type", "school_admin")
      .eq("status", "pending")
      .single();

    if (requestError) throw requestError;
    if (!request) throw new Error("Pending registration request not found.");

    const registrationRequest = request as RegistrationRequestRow;
    requireSchoolRegistrationFields(registrationRequest);

    try {
      await getOrInviteSchoolAdminUser(supabaseAdmin, registrationRequest, user.id);
    } catch (error) {
      console.error("School admin password setup email failed:", error);
      throw new Error(PASSWORD_SETUP_EMAIL_CONFIG_ERROR);
      throw new Error(
        "Password setup email မပို့နိုင်သေးပါ။ Server configuration ကိုစစ်ဆေးရန်လိုအပ်ပါသည်။",
      );
    }

    return {
      ok: true,
      inviteSent: true,
      email: normalizeEmail(registrationRequest.email),
      message: `School Admin email (${normalizeEmail(registrationRequest.email)}) သို့ password သတ်မှတ်ရန် link ပေးပို့ထားပါသည်။ User မှ password သတ်မှတ်ပြီးပါက account ကို အလိုအလျောက် အတည်ပြုပေးပါမည်။`,
    };
  });

export const activateApprovedSchoolAdminRegistration = createServerFn({ method: "POST" })
  .validator(activateInputSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(data.accessToken);

    if (authError) throw authError;
    if (!user?.email) throw new Error("Unauthorized.");

    const userMetadata = (user.user_metadata || {}) as Record<string, unknown>;
    const registrationRequestId =
      typeof userMetadata.registration_request_id === "string"
        ? userMetadata.registration_request_id
        : "";
    const reviewerIdFromInvite =
      typeof userMetadata.approved_by_super_admin_id === "string"
        ? userMetadata.approved_by_super_admin_id
        : null;

    let requestQuery = supabaseAdmin
      .from("registration_requests")
      .select("*")
      .eq("request_type", "school_admin")
      .eq("status", "pending")
      .eq("email", normalizeEmail(user.email));

    if (registrationRequestId) {
      requestQuery = requestQuery.eq("id", registrationRequestId);
    }

    const { data: request, error: requestError } = await requestQuery
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (requestError) throw requestError;
    if (!request) throw new Error("Pending registration request not found for this email.");

    const registrationRequest = request as RegistrationRequestRow;
    const reviewerId = reviewerIdFromInvite || registrationRequest.reviewed_by || null;

    const result = await provisionApprovedSchoolAdmin(
      supabaseAdmin,
      registrationRequest,
      {
        id: user.id,
        email: user.email,
      },
      reviewerId,
    );

    return { ok: true, activated: true, ...result };
  });
