import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const invitePrincipalSchema = z.object({
  accessToken: z.string().min(1).optional(),
  email: z.string().email(),
  note: z.string().optional(),
});

const tokenSchema = z.object({
  token: z.string().min(16),
});

const principalRegistrationUploadFileSchema = z.object({
  key: z.enum(["profilePhoto", "nrcFront", "nrcBack", "degreeCertificate", "teachingLicense"]),
  fileName: z.string().min(1).max(180),
  contentType: z.string().optional(),
});

const createPrincipalRegistrationUploadUrlsSchema = z.object({
  token: z.string().min(16),
  files: z.array(principalRegistrationUploadFileSchema).min(1).max(5),
});

const submitPrincipalRegistrationSchema = z.object({
  token: z.string().min(16),
  fullNameMm: z.string().min(1),
  fullNameEn: z.string().min(1),
  phone: z.string().min(1),
  dateOfBirth: z.string().min(1),
  gender: z.string().min(1),
  nrcNumber: z.string().min(1),
  residentialAddress: z.string().min(1),
  stateRegionId: z.number().int().nullable(),
  townshipId: z.number().int().nullable(),
  profilePhotoUrl: z.string().nullable(),
  highestEducation: z.string().min(1),
  major: z.string(),
  yearsOfTeachingExperience: z.number().int().min(0),
  yearsOfManagementExperience: z.number().int().min(0),
  previousSchool: z.string().nullable(),
  currentPosition: z.string(),
  nrcFrontUrl: z.string().min(1),
  nrcBackUrl: z.string().min(1),
  degreeCertificateUrl: z.string().min(1),
  teachingLicenseUrl: z.string().min(1),
  appointmentLetterUrl: z.string().nullable(),
  resumeUrl: z.string().nullable(),
  recommendationLetterUrl: z.string().nullable(),
  emergencyContactName: z.string(),
  emergencyContactRelationship: z.string(),
  emergencyContactPhone: z.string(),
  declarationAccepted: z.literal(true),
});

const registerSelfPrincipalSchema = z.object({
  accessToken: z.string().min(1).optional(),
});

const principalManagementSchema = z.object({
  accessToken: z.string().min(1).optional(),
});

const principalDashboardAccessSchema = z.object({
  accessToken: z.string().min(1).optional(),
});

const principalDocumentSignedUrlSchema = z.object({
  accessToken: z.string().min(1).optional(),
  bucket: z.enum(["application-nrc-docs", "application-school-docs"]),
  path: z.string().min(1),
});

const reviewPrincipalSchema = z.object({
  accessToken: z.string().min(1).optional(),
  requestId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().optional(),
});

type SupabaseAdmin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

type SchoolRow = {
  id: string;
  school_name: string;
  school_type: string | null;
  school_level?: string | null;
  grade_from: string | null;
  grade_to: string | null;
  address: string | null;
  school_phone: string | null;
  school_email: string | null;
  logo_url: string | null;
  region_id?: number | null;
  township_id?: number | null;
  regions?: { name: string | null } | null;
  townships?: { name: string | null } | null;
};

type PrincipalRequestRow = {
  id: string;
  request_type: string;
  status: "invited" | "pending" | "approved" | "rejected";
  email: string;
  phone: string | null;
  full_name_mm: string | null;
  full_name_en: string | null;
  date_of_birth: string | null;
  gender: string | null;
  nrc_number: string | null;
  residential_address: string | null;
  state_region_id: number | null;
  township_id: number | null;
  nrc_front_url: string | null;
  nrc_back_url: string | null;
  invite_token: string | null;
  invite_token_expires_at: string | null;
  invited_by: string | null;
  approved_school_id: string | null;
  approved_profile_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  invite_note?: string | null;
  highest_education?: string | null;
  major?: string | null;
  years_of_teaching_experience?: number | null;
  years_of_management_experience?: number | null;
  previous_school?: string | null;
  current_position?: string | null;
  profile_photo_url?: string | null;
  degree_certificate_url?: string | null;
  teaching_license_url?: string | null;
  appointment_letter_url?: string | null;
  resume_url?: string | null;
  recommendation_letter_url?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_relationship?: string | null;
  emergency_contact_phone?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ActivePrincipalTeacherRow = {
  id: string;
  profile_id: string | null;
  school_id: string | null;
  level: string | null;
  created_at: string | null;
};

type ActivePrincipalProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string | null;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const sanitizePrincipalUploadFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9.\-_]+/g, "-").slice(0, 90) || "upload";

const SCHOOL_ADMIN_PROFILE_NOT_FOUND_MESSAGE =
  "School Admin အကောင့်အချက်အလက် မတွေ့ရှိပါ။";
const SCHOOL_ADMIN_SCHOOL_NOT_FOUND_MESSAGE =
  "ဤ School Admin နှင့်ချိတ်ဆက်ထားသော ကျောင်းမတွေ့ရှိပါ။";
const PRINCIPAL_MANAGEMENT_LOAD_ERROR_MESSAGE =
  "Principal အချက်အလက်များကို ယာယီဖွင့်မရပါ။ ပြန်စမ်းကြည့်ပါ။";
const ACTIVE_PRINCIPAL_EXISTS_MESSAGE =
  "ဤကျောင်းတွင် Active Principal ရှိပြီးသားဖြစ်ပါသည်။";
const PRINCIPAL_PENDING_APPROVAL_MESSAGE =
  "သင့် Principal registration ကို School Admin မှ စစ်ဆေးအတည်ပြုရန် စောင့်ဆိုင်းနေပါသည်။";

type PrincipalServerErrorContext = {
  queryName: string;
  table?: string;
  userId?: string | null;
  profileId?: string | null;
  schoolId?: string | null;
  expectedColumns?: string[];
  bucket?: string;
};

const getSupabaseErrorDetails = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return {
      message: error instanceof Error ? error.message : String(error),
      code: undefined,
      details: undefined,
      hint: undefined,
    };
  }

  const record = error as Record<string, unknown>;
  return {
    message: typeof record.message === "string" ? record.message : String(error),
    code: typeof record.code === "string" ? record.code : undefined,
    details: typeof record.details === "string" ? record.details : undefined,
    hint: typeof record.hint === "string" ? record.hint : undefined,
  };
};

const logPrincipalServerError = (label: string, error: unknown, context: PrincipalServerErrorContext) => {
  console.error(label, {
    ...context,
    ...getSupabaseErrorDetails(error),
  });
};

const principalManagementRequestSelect = [
  "id",
  "request_type",
  "email",
  "phone",
  "full_name_mm",
  "full_name_en",
  "date_of_birth",
  "gender",
  "nrc_number",
  "residential_address",
  "state_region_id",
  "township_id",
  "nrc_front_url",
  "nrc_back_url",
  "status",
  "invite_note",
  "invite_token_expires_at",
  "highest_education",
  "major",
  "years_of_teaching_experience",
  "years_of_management_experience",
  "previous_school",
  "current_position",
  "profile_photo_url",
  "degree_certificate_url",
  "teaching_license_url",
  "appointment_letter_url",
  "resume_url",
  "recommendation_letter_url",
  "emergency_contact_name",
  "emergency_contact_relationship",
  "emergency_contact_phone",
  "rejection_reason",
  "approved_school_id",
  "reviewed_at",
  "created_at",
  "updated_at",
].join(", ");

type PrincipalManagementRequestForFiltering = {
  id: string;
  email: string;
  status: PrincipalRequestRow["status"];
  approved_school_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const actionablePrincipalRequestStatuses = new Set<PrincipalRequestRow["status"]>([
  "invited",
  "pending",
]);

const getPrincipalRequestTimestamp = (request: PrincipalManagementRequestForFiltering) => {
  const timestamp = Date.parse(request.updated_at || request.created_at || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const sortPrincipalRequestsNewestFirst = <T extends PrincipalManagementRequestForFiltering>(
  left: T,
  right: T,
) => getPrincipalRequestTimestamp(right) - getPrincipalRequestTimestamp(left);

const getPrincipalDuplicateRequestKey = (
  request: PrincipalManagementRequestForFiltering,
  schoolId: string,
) => `${normalizeEmail(request.email)}::${request.approved_school_id || schoolId}`;

const filterCurrentActionablePrincipalRequests = <T extends PrincipalManagementRequestForFiltering>(
  requests: T[],
  schoolId: string,
) => {
  const requestsByEmailAndSchool = new Map<string, T[]>();

  for (const request of requests) {
    const key = getPrincipalDuplicateRequestKey(request, schoolId);
    requestsByEmailAndSchool.set(key, [...(requestsByEmailAndSchool.get(key) || []), request]);
  }

  const filteredRequests: T[] = [];

  for (const [key, duplicateRequests] of requestsByEmailAndSchool.entries()) {
    if (duplicateRequests.length > 1) {
      const [email] = key.split("::");
      console.info("[Principal approval] duplicate requests found", {
        context: "principal-management-load",
        schoolId,
        requestEmail: email,
        duplicateRequestCount: duplicateRequests.length - 1,
        actionableDuplicateRequestCount: duplicateRequests.filter((request) =>
          actionablePrincipalRequestStatuses.has(request.status),
        ).length,
      });
    }

    const finalRequests = duplicateRequests.filter((request) =>
      !actionablePrincipalRequestStatuses.has(request.status),
    );
    const hasApprovedRequest = finalRequests.some((request) => request.status === "approved");

    if (hasApprovedRequest) {
      filteredRequests.push(...finalRequests);
      continue;
    }

    const latestPendingRequest = duplicateRequests
      .filter((request) => request.status === "pending")
      .sort(sortPrincipalRequestsNewestFirst)[0];
    const latestInvitedRequest = duplicateRequests
      .filter((request) => request.status === "invited")
      .sort(sortPrincipalRequestsNewestFirst)[0];
    const currentActionableRequest = latestPendingRequest || latestInvitedRequest;

    filteredRequests.push(...finalRequests);
    if (currentActionableRequest) filteredRequests.push(currentActionableRequest);
  }

  return filteredRequests.sort(sortPrincipalRequestsNewestFirst);
};

const principalDocumentUrlColumns = [
  "profile_photo_url",
  "nrc_front_url",
  "nrc_back_url",
  "degree_certificate_url",
  "teaching_license_url",
  "appointment_letter_url",
  "resume_url",
  "recommendation_letter_url",
] as const;

const principalDocumentRequestSelect = ["id", ...principalDocumentUrlColumns].join(", ");

const principalUploadBucketByKey = {
  profilePhoto: "application-nrc-docs",
  nrcFront: "application-nrc-docs",
  nrcBack: "application-nrc-docs",
  degreeCertificate: "application-school-docs",
  teachingLicense: "application-school-docs",
} as const;

const principalPdfUploadKeys = new Set(["degreeCertificate", "teachingLicense"]);

const getPrincipalUploadFileName = (
  key: keyof typeof principalUploadBucketByKey,
  fileName: string,
) => {
  const sanitizedName = sanitizePrincipalUploadFileName(fileName);
  if (!principalPdfUploadKeys.has(key)) return sanitizedName;

  const withoutExtension = sanitizedName.replace(/\.[^/.]+$/, "") || key;
  return `${withoutExtension}.pdf`;
};

const isPrincipalPdfUpload = (fileName: string, contentType?: string) =>
  contentType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

const getRedactedKeyPrefix = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("sb_publishable_")) return "sb_publishable_...";
  if (trimmed.startsWith("sb_secret_")) return "sb_secret_...";
  if (trimmed.startsWith("eyJ")) return "eyJ...";
  return `${trimmed.slice(0, 4)}...`;
};

const logSupabasePrincipalAuthEnv = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const vitePublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || vitePublishableKey;

  console.info("[Principal auth config] Supabase env", {
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasSupabaseServiceRoleKey: Boolean(serviceRoleKey),
    supabaseServiceRoleKeyPrefix: getRedactedKeyPrefix(serviceRoleKey),
    hasViteSupabasePublishableKey: Boolean(vitePublishableKey),
    viteSupabasePublishableKeyPrefix: getRedactedKeyPrefix(vitePublishableKey),
    hasSupabasePublishableKeyFallback: Boolean(process.env.SUPABASE_PUBLISHABLE_KEY),
    supabasePublishableKeyPrefix: getRedactedKeyPrefix(publishableKey),
  });
};

const getSupabasePublicConfig = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

  if (!url || !publishableKey) {
    logSupabasePrincipalAuthEnv();
    throw new Error("Supabase authentication is not configured.");
  }

  return { url, publishableKey };
};

const getBearerTokenFromRequest = async () => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const request = getRequest();
  const authHeader = request?.headers?.get("authorization") || "";

  if (!authHeader) return "";
  if (!authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice("Bearer ".length).trim();
};

const getCurrentUserAccessToken = async (fallbackAccessToken?: string) => {
  const requestToken = await getBearerTokenFromRequest();
  return requestToken || fallbackAccessToken?.trim() || "";
};

const getVerifiedUserFromRequest = async (fallbackAccessToken?: string) => {
  logSupabasePrincipalAuthEnv();

  const accessToken = await getCurrentUserAccessToken(fallbackAccessToken);
  if (!accessToken) throw new Error("Please sign in again to continue.");

  const { createClient } = await import("@supabase/supabase-js");
  const { url, publishableKey } = getSupabasePublicConfig();
  const authClient = createClient(url, publishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(accessToken);

  if (error) {
    console.error("[Principal auth] User verification failed", {
      message: error.message,
      status: "status" in error ? error.status : undefined,
      name: error.name,
    });
    throw new Error("Please sign in again to continue.");
  }

  if (!user?.id) throw new Error("Please sign in again to continue.");
  return user;
};

const getAppOrigin = async () => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const request = getRequest();
  const fallbackOrigin = "http://localhost:8080";
  const origin =
    process.env.APP_ORIGIN ||
    process.env.SITE_URL ||
    process.env.VITE_APP_URL ||
    (request ? new URL(request.url).origin : fallbackOrigin);

  return origin.replace(/\/$/, "");
};

const getPasswordSetupRedirectUrl = async () => `${await getAppOrigin()}/auth/setup-password`;

const getPrincipalInviteUrl = async (token: string) =>
  `${await getAppOrigin()}/principal/register?token=${encodeURIComponent(token)}`;

const createInviteToken = () =>
  `${crypto.randomUUID()}-${crypto.randomUUID()}-${Date.now().toString(36)}`;

type PrincipalInviteEmailJSConfig =
  | {
      mode: "emailjs";
      serviceId: string;
      templateId: string;
      publicKey: string;
      privateKey: string | null;
    }
  | {
      mode: "manual";
      missingKeys: string[];
    };

const EMAILJS_SEND_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";
const PRINCIPAL_INVITE_EMAIL_ERROR = "Unable to send the Principal invite email.";

const isProductionRuntime = () => process.env.NODE_ENV === "production";

const readServerEnv = (key: string) => process.env[key]?.trim() || "";

const isUsableEmailJSPrivateKey = (value?: string | null) => {
  const trimmed = value?.trim();
  return Boolean(trimmed && trimmed !== "..........");
};

const getPrincipalInviteEmailJSConfig = (): PrincipalInviteEmailJSConfig => {
  const serviceId = readServerEnv("EMAILJS_SERVICE_ID");
  const templateId = readServerEnv("EMAILJS_TEMPLATE_ID");
  const publicKey = readServerEnv("EMAILJS_PUBLIC_KEY");
  const privateKeyValue = readServerEnv("EMAILJS_PRIVATE_KEY");
  const privateKey = isUsableEmailJSPrivateKey(privateKeyValue) ? privateKeyValue : null;
  const missingKeys = [
    ["EMAILJS_SERVICE_ID", serviceId],
    ["EMAILJS_TEMPLATE_ID", templateId],
    ["EMAILJS_PUBLIC_KEY", publicKey],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    if (!isProductionRuntime()) {
      console.warn("[Principal invite email] EmailJS config missing; using dev manual mode.", {
        missingKeys,
      });
      return { mode: "manual", missingKeys };
    }

    console.error("[Principal invite email] EmailJS config missing in production.", {
      missingKeys,
    });
    throw new Error(PRINCIPAL_INVITE_EMAIL_ERROR);
  }

  return {
    mode: "emailjs",
    serviceId,
    templateId,
    publicKey,
    privateKey,
  };
};

const buildPrincipalInviteMessage = (schoolName: string, note?: string | null) => {
  const trimmedNote = note?.trim();
  return trimmedNote || `Please complete your Principal registration for ${schoolName}.`;
};

const redactEmailJSLogText = ({
  value,
  config,
  inviteUrl,
}: {
  value: string;
  config: Extract<PrincipalInviteEmailJSConfig, { mode: "emailjs" }>;
  inviteUrl: string;
}) => {
  let redacted = value;
  const escapedInviteUrl = inviteUrl.replace(/\//g, "\\/");
  const sensitiveValues = [
    config.publicKey,
    config.privateKey,
    inviteUrl,
    escapedInviteUrl,
  ].filter((item): item is string => Boolean(item));

  for (const sensitiveValue of sensitiveValues) {
    redacted = redacted.split(sensitiveValue).join("[redacted]");
  }

  return redacted
    .replace(/https?:\/\/[^\s"'<>]*\/principal\/register\?token=[^\s"'<>]+/g, "[redacted invite link]")
    .replace(/https?:\\\/\\\/[^\s"'<>]*\\\/principal\\\/register\?token=[^\s"'<>]+/g, "[redacted invite link]")
    .replace(/(token=)[^&\s"'<>]+/g, "$1[redacted]");
};

const parseEmailJSLogBody = ({
  bodyText,
  config,
  inviteUrl,
}: {
  bodyText: string;
  config: Extract<PrincipalInviteEmailJSConfig, { mode: "emailjs" }>;
  inviteUrl: string;
}) => {
  const redactedText = redactEmailJSLogText({ value: bodyText, config, inviteUrl });

  try {
    return JSON.parse(redactedText) as unknown;
  } catch {
    return redactedText;
  }
};

const sendPrincipalInviteEmailWithEmailJS = async ({
  config,
  principalEmail,
  schoolName,
  schoolAdminName,
  schoolAdminEmail,
  inviteUrl,
  note,
}: {
  config: Extract<PrincipalInviteEmailJSConfig, { mode: "emailjs" }>;
  principalEmail: string;
  schoolName: string;
  schoolAdminName: string;
  schoolAdminEmail: string;
  inviteUrl: string;
  note?: string | null;
}) => {
  let response: Response;
  const templateParams = {
    to_email: principalEmail,
    school_name: schoolName,
    admin_name: schoolAdminName,
    invite_link: inviteUrl,
    message: buildPrincipalInviteMessage(schoolName, note),
    reply_to: schoolAdminEmail,
  };
  const templateParamKeys = Object.keys(templateParams);
  const logContext = {
    serviceIdExists: Boolean(config.serviceId),
    templateIdExists: Boolean(config.templateId),
    publicKeyExists: Boolean(config.publicKey),
    privateKeyExists: isUsableEmailJSPrivateKey(config.privateKey),
    toEmail: principalEmail,
    templateParamKeys,
  };
  const requestBody = {
    service_id: config.serviceId,
    template_id: config.templateId,
    user_id: config.publicKey,
    ...(isUsableEmailJSPrivateKey(config.privateKey) ? { accessToken: config.privateKey } : {}),
    template_params: templateParams,
  };

  console.info("[Principal invite EmailJS] Sending invite email", logContext);

  try {
    response = await fetch(EMAILJS_SEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    console.error("[Principal invite EmailJS] Request failed", {
      ...logContext,
      message: error instanceof Error ? error.message : String(error),
    });
    throw new Error(PRINCIPAL_INVITE_EMAIL_ERROR);
  }

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    const body = parseEmailJSLogBody({
      bodyText: responseText,
      config,
      inviteUrl,
    });

    console.error("[Principal invite EmailJS] Send failed", {
      status: response.status,
      statusText: response.statusText,
      body,
      ...logContext,
    });
    throw new Error(PRINCIPAL_INVITE_EMAIL_ERROR);
  }
};

const toPublicSchool = (school: SchoolRow | null) =>
  school
    ? {
        id: school.id,
        name: school.school_name,
        type: school.school_type,
        level: school.school_level || null,
        gradeFrom: school.grade_from,
        gradeTo: school.grade_to,
        address: school.address,
        phone: school.school_phone,
        email: school.school_email,
        logoUrl: school.logo_url,
        region: school.regions?.name || null,
        township: school.townships?.name || null,
      }
    : null;

const getSchoolAdminContext = async (
  supabaseAdmin: SupabaseAdmin,
  fallbackAccessToken?: string,
) => {
  const user = await getVerifiedUserFromRequest(fallbackAccessToken);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role, status, email, full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    logPrincipalServerError("[Principal auth] School Admin profile query failed", profileError, {
      queryName: "school-admin-profile",
      table: "profiles",
      userId: user.id,
      expectedColumns: ["id", "role", "status", "email", "full_name", "phone"],
    });
    throw new Error(SCHOOL_ADMIN_PROFILE_NOT_FOUND_MESSAGE);
  }
  if (!profile) {
    console.error("[Principal auth] School Admin profile not found", {
      queryName: "school-admin-profile",
      table: "profiles",
      userId: user.id,
      expectedColumns: ["id", "role", "status", "email", "full_name", "phone"],
    });
    throw new Error(SCHOOL_ADMIN_PROFILE_NOT_FOUND_MESSAGE);
  }
  if (profile.role !== "school_admin" || profile.status !== "active") {
    console.error("[Principal auth] Active School Admin permission required", {
      queryName: "school-admin-profile-permission",
      table: "profiles",
      userId: user.id,
      profileRole: profile.role,
      profileStatus: profile.status,
    });
    throw new Error(SCHOOL_ADMIN_PROFILE_NOT_FOUND_MESSAGE);
  }

  const { data: school, error: schoolError } = await supabaseAdmin
    .from("schools")
    .select(
      "id, school_name, school_type, school_level, grade_from, grade_to, address, school_phone, school_email, logo_url, region_id, township_id, regions(name), townships(name)",
    )
    .eq("school_admin_id", user.id)
    .eq("status", "approved")
    .maybeSingle();

  if (schoolError) {
    logPrincipalServerError("[Principal auth] Approved school query failed", schoolError, {
      queryName: "approved-school-for-school-admin",
      table: "schools",
      userId: user.id,
      expectedColumns: [
        "id",
        "school_name",
        "school_type",
        "school_level",
        "grade_from",
        "grade_to",
        "address",
        "school_phone",
        "school_email",
        "logo_url",
        "region_id",
        "township_id",
      ],
    });
    throw new Error(SCHOOL_ADMIN_SCHOOL_NOT_FOUND_MESSAGE);
  }
  if (!school) {
    console.error("[Principal auth] Approved school not found", {
      queryName: "approved-school-for-school-admin",
      table: "schools",
      userId: user.id,
    });
    throw new Error(SCHOOL_ADMIN_SCHOOL_NOT_FOUND_MESSAGE);
  }

  return { user, profile, school: school as SchoolRow };
};

const fetchPrincipalRequestForSchool = async (
  supabaseAdmin: SupabaseAdmin,
  requestId: string,
  schoolId: string,
) => {
  const { data, error } = await supabaseAdmin
    .from("registration_requests")
    .select("*")
    .eq("id", requestId)
    .eq("request_type", "principal")
    .eq("approved_school_id", schoolId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Principal request not found.");
  return data as PrincipalRequestRow;
};

const fetchValidPrincipalInvite = async (supabaseAdmin: SupabaseAdmin, token: string) => {
  const { data: request, error } = await supabaseAdmin
    .from("registration_requests")
    .select("*")
    .eq("request_type", "principal")
    .eq("invite_token", token)
    .maybeSingle();

  if (error) throw error;
  if (!request) throw new Error("Principal invite link is invalid.");

  const principalRequest = request as PrincipalRequestRow;
  if (principalRequest.status !== "invited") {
    throw new Error("Principal invite link has already been used or reviewed.");
  }

  if (
    principalRequest.invite_token_expires_at &&
    new Date(principalRequest.invite_token_expires_at).getTime() < Date.now()
  ) {
    throw new Error(
      "Principal invite link has expired. Please ask the School Admin for a new invite.",
    );
  }

  return principalRequest;
};

const findAuthUserByEmail = async (supabaseAdmin: SupabaseAdmin, email: string) => {
  const normalizedEmail = normalizeEmail(email);

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;
    const users = data?.users || [];
    const match = users.find((user) => normalizeEmail(user.email || "") === normalizedEmail);
    if (match) return match;
    if (users.length < 1000) return null;
  }

  return null;
};

type PrincipalAuthUser = NonNullable<Awaited<ReturnType<typeof findAuthUserByEmail>>>;

const formatExistingAccountRole = (role?: string | null) => {
  if (!role) return "ရှိပြီးသားတာဝန်";

  const roleLabels: Record<string, string> = {
    school_admin: "School Admin",
    principal: "Principal",
    teacher: "Teacher",
    student: "Student",
    super_admin: "Super Admin",
  };

  return roleLabels[role] || role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const fetchSchoolNameById = async (supabaseAdmin: SupabaseAdmin, schoolId?: string | null) => {
  if (!schoolId) return null;

  const { data, error } = await supabaseAdmin
    .from("schools")
    .select("school_name")
    .eq("id", schoolId)
    .maybeSingle();

  if (error) throw error;
  return data?.school_name || null;
};

const fetchSchoolNameByAdminId = async (supabaseAdmin: SupabaseAdmin, profileId: string) => {
  const { data, error } = await supabaseAdmin
    .from("schools")
    .select("school_name")
    .eq("school_admin_id", profileId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.school_name || null;
};

const getExistingPrincipalInviteWarning = async (
  supabaseAdmin: SupabaseAdmin,
  email: string,
) => {
  const existingUser = await findAuthUserByEmail(supabaseAdmin, email);
  if (!existingUser) return null;

  const metadata = existingUser.user_metadata as Record<string, unknown> | undefined;
  const metadataRole = typeof metadata?.role === "string" ? metadata.role : null;
  const metadataSchoolId =
    typeof metadata?.approved_school_id === "string" ? metadata.approved_school_id : null;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role, email, full_name")
    .eq("id", existingUser.id)
    .maybeSingle();

  if (profileError) throw profileError;

  const { data: teacher, error: teacherError } = await supabaseAdmin
    .from("teachers")
    .select("id, school_id, profile_id, level")
    .eq("profile_id", existingUser.id)
    .limit(1)
    .maybeSingle();

  if (teacherError) throw teacherError;

  const role = teacher?.level || profile?.role || metadataRole;
  let schoolName = await fetchSchoolNameById(supabaseAdmin, teacher?.school_id);

  if (!schoolName && profile?.role === "school_admin") {
    schoolName = await fetchSchoolNameByAdminId(supabaseAdmin, existingUser.id);
  }

  if (!schoolName) {
    schoolName = await fetchSchoolNameById(supabaseAdmin, metadataSchoolId);
  }

  return `ဤ email account သည် ${schoolName || "ရှိပြီးသားကျောင်းတစ်ခု"} တွင် ${formatExistingAccountRole(role)} အဖြစ် တာဝန်ထမ်းဆောင်နေပြီးသားဖြစ်ပါသည်။ Principal အဖြစ် ခန့်အပ်၍မရပါ။`;
};

const inviteOrResetPrincipalUser = async (
  supabaseAdmin: SupabaseAdmin,
  request: PrincipalRequestRow,
  reviewerId: string,
  existingAuthUser?: PrincipalAuthUser | null,
) => {
  const redirectTo = await getPasswordSetupRedirectUrl();
  const normalizedEmail = normalizeEmail(request.email);
  const userMetadata = {
    full_name: request.full_name_mm || request.full_name_en || normalizedEmail,
    full_name_en: request.full_name_en,
    role: "principal",
    teacher_level: "principal",
    registration_request_id: request.id,
    approved_by_school_admin_id: reviewerId,
    approved_school_id: request.approved_school_id,
  };

  const authUser = existingAuthUser ?? (await findAuthUserByEmail(supabaseAdmin, normalizedEmail));

  if (authUser) {
    const currentMetadata = (authUser.user_metadata || {}) as Record<string, unknown>;
    const { data: updatedUserData, error: updateUserError } =
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
          ...currentMetadata,
          ...userMetadata,
        },
      });

    if (updateUserError) throw updateUserError;

    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    if (resetError) throw resetError;

    return {
      user: updatedUserData.user || authUser,
      emailAction: "password_reset" as const,
    };
  }

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo,
    data: userMetadata,
  });

  if (error) {
    const racedAuthUser = await findAuthUserByEmail(supabaseAdmin, normalizedEmail);

    if (racedAuthUser) {
      return inviteOrResetPrincipalUser(supabaseAdmin, request, reviewerId, racedAuthUser);
    }

    throw error;
  }
  if (!data.user) throw new Error("Unable to create Principal auth invite.");

  return {
    user: data.user,
    emailAction: "invite" as const,
  };
};

export const invitePrincipal = createServerFn({ method: "POST" })
  .validator(invitePrincipalSchema)
  .handler(async ({ data }) => {
    console.info("[Principal invite debug] function reached");
    console.info("[Principal invite debug] input", {
      email: data.email,
      note: data.note ?? null,
    });

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { user, profile, school } = await getSchoolAdminContext(
        supabaseAdmin,
        data.accessToken,
      );
      const normalizedEmail = normalizeEmail(data.email);
      const token = createInviteToken();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

      console.info("[Principal invite debug] current context", {
        userId: user.id,
        schoolId: school.id,
        schoolRecordExists: Boolean(school),
      });

      const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
        .from("profiles")
        .select("id, role, email")
        .eq("email", normalizedEmail)
        .limit(1)
        .maybeSingle();

      if (targetProfileError) {
        console.error("[Principal invite debug] target profile query error", targetProfileError);
      }

      console.info("[Principal invite debug] target profile exists", {
        targetProfileExists: Boolean(targetProfile),
        targetProfileId: targetProfile?.id ?? null,
        targetProfileRole: targetProfile?.role ?? null,
      });

      if (normalizeEmail(user.email || "") === normalizedEmail) {
        throw new Error(
          "This is the School Admin email. Choose 'School Admin is also Principal' instead.",
        );
      }

      const existingUserWarning = await getExistingPrincipalInviteWarning(
        supabaseAdmin,
        normalizedEmail,
      );
      if (existingUserWarning) {
        throw new Error(existingUserWarning);
      }

      const { data: existingActivePrincipal, error: activePrincipalError } = await supabaseAdmin
        .from("teachers")
        .select("id")
        .eq("school_id", school.id)
        .eq("level", "principal")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (activePrincipalError) {
        console.error("[Principal invite debug] active principal query error", activePrincipalError);
        throw new Error(
          activePrincipalError.message || "Unable to check the current Principal assignment.",
        );
      }
      if (existingActivePrincipal) {
        throw new Error("This school already has an active Principal.");
      }

      const emailConfig = getPrincipalInviteEmailJSConfig();

      const insertPayload = {
        request_type: "principal",
        status: "invited",
        email: normalizedEmail,
        phone: "",
        full_name_mm: "Invited Principal",
        full_name_en: "Invited Principal",
        date_of_birth: null,
        gender: null,
        nrc_number: "",
        residential_address: "",
        state_region_id: school.region_id || null,
        township_id: school.township_id || null,
        nrc_front_url: "",
        nrc_back_url: "",
        approved_school_id: school.id,
        invited_by: user.id,
        invite_token: token,
        invite_token_expires_at: expiresAt,
        invite_note: data.note?.trim() || null,
        school_name: school.school_name,
        school_type: school.school_type,
        school_level: school.school_level || null,
        grade_from: school.grade_from,
        grade_to: school.grade_to,
        region_id: school.region_id || null,
        school_township_id: school.township_id || null,
        school_address: school.address || "",
        school_phone: school.school_phone,
        school_email: school.school_email,
      };

      const { invite_token: _inviteToken, ...safeInsertPayload } = insertPayload;
      console.info("[Principal invite debug] Supabase insert", {
        table: "registration_requests",
        payload: {
          ...safeInsertPayload,
          invite_token: "[redacted]",
        },
      });

      const { data: request, error } = await supabaseAdmin
        .from("registration_requests")
        .insert(insertPayload)
        .select("id")
        .single();

      if (error) {
        console.error("[Principal invite debug] registration_requests insert error", error);
        throw new Error(error.message || "Unable to create the Principal invite request.");
      }

      const inviteUrl = await getPrincipalInviteUrl(token);
      if (emailConfig.mode === "manual") {
        return {
          ok: true,
          requestId: request?.id as string,
          email: normalizedEmail,
          emailSent: false,
          manualMode: true,
          inviteUrl,
          message: "EmailJS is not configured in development. Use the manual invite link below.",
        };
      }

      await sendPrincipalInviteEmailWithEmailJS({
        config: emailConfig,
        principalEmail: normalizedEmail,
        schoolName: school.school_name,
        schoolAdminName: profile.full_name?.trim() || user.email || "School Admin",
        schoolAdminEmail: normalizeEmail(profile.email || user.email || ""),
        inviteUrl,
        note: data.note,
      });

      return {
        ok: true,
        requestId: request?.id as string,
        email: normalizedEmail,
        emailSent: true,
        manualMode: false,
        message: `Principal invite email sent to ${normalizedEmail}.`,
      };
    } catch (error) {
      console.error("[Principal invite debug] caught exception", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        error,
      });
      throw error;
    }
  });

export const getPrincipalManagementData = createServerFn({ method: "POST" })
  .validator(principalManagementSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { school } = await getSchoolAdminContext(supabaseAdmin, data.accessToken);

    const { data: requests, error: requestError } = await supabaseAdmin
      .from("registration_requests")
      .select(principalManagementRequestSelect)
      .eq("request_type", "principal")
      .eq("approved_school_id", school.id)
      .order("created_at", { ascending: false });

    if (requestError) {
      logPrincipalServerError("[Principal management] Request query failed", requestError, {
        queryName: "principal-registration-requests",
        table: "registration_requests",
        schoolId: school.id,
        expectedColumns: principalManagementRequestSelect.split(", "),
      });
      throw new Error(PRINCIPAL_MANAGEMENT_LOAD_ERROR_MESSAGE);
    }

    const { data: teacherData, error: teacherError } = await supabaseAdmin
      .from("teachers")
      .select("id, profile_id, school_id, level, created_at")
      .eq("school_id", school.id)
      .eq("level", "principal")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (teacherError) {
      logPrincipalServerError("[Principal management] Active principal teacher query failed", teacherError, {
        queryName: "active-principal-teacher",
        table: "teachers",
        schoolId: school.id,
        expectedColumns: ["id", "profile_id", "school_id", "level", "status", "created_at"],
      });
      throw new Error(PRINCIPAL_MANAGEMENT_LOAD_ERROR_MESSAGE);
    }

    const teacher = teacherData as ActivePrincipalTeacherRow | null;
    let profile: ActivePrincipalProfileRow | null = null;

    if (teacher?.profile_id) {
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, status")
        .eq("id", teacher.profile_id)
        .maybeSingle();

      if (profileError) {
        logPrincipalServerError("[Principal management] Active principal profile query failed", profileError, {
          queryName: "active-principal-profile",
          table: "profiles",
          schoolId: school.id,
          profileId: teacher.profile_id,
          expectedColumns: ["id", "full_name", "email", "phone", "avatar_url", "status"],
        });
        throw new Error(PRINCIPAL_MANAGEMENT_LOAD_ERROR_MESSAGE);
      }

      profile = profileData as ActivePrincipalProfileRow | null;
    }

    const { data: regions, error: regionsError } = await supabaseAdmin
      .from("regions")
      .select("id, name")
      .order("name");

    if (regionsError) {
      logPrincipalServerError("[Principal management] Regions lookup failed", regionsError, {
        queryName: "principal-management-regions",
        table: "regions",
        schoolId: school.id,
        expectedColumns: ["id", "name"],
      });
      throw new Error(PRINCIPAL_MANAGEMENT_LOAD_ERROR_MESSAGE);
    }

    const { data: townships, error: townshipsError } = await supabaseAdmin
      .from("townships")
      .select("id, region_id, name")
      .order("name");

    if (townshipsError) {
      logPrincipalServerError("[Principal management] Townships lookup failed", townshipsError, {
        queryName: "principal-management-townships",
        table: "townships",
        schoolId: school.id,
        expectedColumns: ["id", "region_id", "name"],
      });
      throw new Error(PRINCIPAL_MANAGEMENT_LOAD_ERROR_MESSAGE);
    }

    const activePrincipal = teacher
      ? {
          id: teacher.id,
          profile_id: teacher.profile_id,
          school_id: teacher.school_id,
          level: teacher.level,
          created_at: teacher.created_at,
          full_name: profile?.full_name || null,
          email: profile?.email || null,
          phone: profile?.phone || null,
          avatar_url: profile?.avatar_url || null,
        }
      : null;

    const currentRequests = filterCurrentActionablePrincipalRequests(
      ((requests || []) as PrincipalManagementRequestForFiltering[]),
      school.id,
    );

    console.info("[Principal management] Loaded dashboard data", {
      schoolId: school.id,
      requestCount: requests?.length || 0,
      currentRequestCount: currentRequests.length,
      pendingCount: currentRequests.filter((request) => request.status === "pending").length,
      activePrincipalExists: Boolean(activePrincipal),
    });

    return {
      ok: true,
      requests: currentRequests,
      activePrincipal,
      regions: regions || [],
      townships: townships || [],
    };
  });

export const createPrincipalDocumentSignedUrl = createServerFn({ method: "POST" })
  .validator(principalDocumentSignedUrlSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { school } = await getSchoolAdminContext(supabaseAdmin, data.accessToken);

    const { data: requests, error: requestError } = await supabaseAdmin
      .from("registration_requests")
      .select(principalDocumentRequestSelect)
      .eq("request_type", "principal")
      .eq("approved_school_id", school.id)
      .in("status", ["pending", "approved", "rejected"]);

    if (requestError) {
      logPrincipalServerError("[Principal management] Document ownership query failed", requestError, {
        queryName: "principal-document-ownership",
        table: "registration_requests",
        schoolId: school.id,
        expectedColumns: principalDocumentRequestSelect.split(", "),
        bucket: data.bucket,
      });
      throw new Error(PRINCIPAL_MANAGEMENT_LOAD_ERROR_MESSAGE);
    }

    const matchingRequest = ((requests || []) as Array<Record<string, string | null>>).find(
      (request) => principalDocumentUrlColumns.some((column) => request[column] === data.path),
    );

    if (!matchingRequest) {
      console.error("[Principal management] Document path is not attached to this school", {
        queryName: "principal-document-ownership",
        table: "registration_requests",
        schoolId: school.id,
        bucket: data.bucket,
        hasPath: Boolean(data.path),
      });
      throw new Error("Principal စာရွက်စာတမ်းကို ဖွင့်၍မရပါ။");
    }

    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(data.bucket)
      .createSignedUrl(data.path, 60 * 5);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      logPrincipalServerError(
        "[Principal management] Signed document URL resolution failed",
        signedUrlError || new Error("Signed URL was not returned."),
        {
          queryName: "principal-document-signed-url",
          schoolId: school.id,
          bucket: data.bucket,
        },
      );
      throw new Error("Principal စာရွက်စာတမ်းကို ဖွင့်၍မရပါ။");
    }

    return {
      ok: true,
      signedUrl: signedUrlData.signedUrl,
    };
  });

export const getPrincipalDashboardAccess = createServerFn({ method: "POST" })
  .validator(principalDashboardAccessSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getVerifiedUserFromRequest(data.accessToken);
    const normalizedEmail = normalizeEmail(user.email || "");

    if (!normalizedEmail) throw new Error("Please sign in again to continue.");

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, status, email, full_name, phone, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logPrincipalServerError("[Principal dashboard] Profile query failed", profileError, {
        queryName: "principal-dashboard-profile",
        table: "profiles",
        userId: user.id,
        expectedColumns: ["id", "role", "status", "email", "full_name", "phone", "avatar_url"],
      });
      throw new Error("Principal dashboard ကို ယာယီဖွင့်မရပါ။ ပြန်စမ်းကြည့်ပါ။");
    }

    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("teachers")
      .select("id, school_id, profile_id, level, status, schools(id, school_name)")
      .eq("profile_id", user.id)
      .eq("level", "principal")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (teacherError) {
      logPrincipalServerError("[Principal dashboard] Active principal teacher query failed", teacherError, {
        queryName: "principal-dashboard-active-teacher",
        table: "teachers",
        userId: user.id,
        expectedColumns: ["id", "school_id", "profile_id", "level", "status"],
      });
      throw new Error("Principal dashboard ကို ယာယီဖွင့်မရပါ။ ပြန်စမ်းကြည့်ပါ။");
    }

    if (teacher && profile?.status === "active") {
      const school = (teacher as { schools?: { id: string; school_name: string | null } | null })
        .schools;

      return {
        ok: true,
        status: "approved" as const,
        profile: {
          id: user.id,
          fullName: profile.full_name || normalizedEmail,
          email: profile.email || normalizedEmail,
          phone: profile.phone || null,
          avatarUrl: profile.avatar_url || null,
          role: profile.role || null,
        },
        school: {
          id: teacher.school_id as string,
          name: school?.school_name || "Assigned school",
        },
      };
    }

    const { data: request, error: requestError } = await supabaseAdmin
      .from("registration_requests")
      .select("id, status, rejection_reason, approved_school_id, reviewed_at")
      .eq("request_type", "principal")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (requestError) {
      logPrincipalServerError("[Principal dashboard] Principal request lookup failed", requestError, {
        queryName: "principal-dashboard-registration-request",
        table: "registration_requests",
        userId: user.id,
        expectedColumns: ["id", "status", "rejection_reason", "approved_school_id", "reviewed_at"],
      });
      throw new Error("Principal dashboard ကို ယာယီဖွင့်မရပါ။ ပြန်စမ်းကြည့်ပါ။");
    }

    if (request?.status === "rejected") {
      return {
        ok: true,
        status: "rejected" as const,
        message: request.rejection_reason || "Principal registration ကို ငြင်းပယ်ထားပါသည်။",
      };
    }

    if (!request && profile?.role !== "principal") {
      return {
        ok: true,
        status: "not_principal" as const,
      };
    }

    return {
      ok: true,
      status: "pending" as const,
      message: PRINCIPAL_PENDING_APPROVAL_MESSAGE,
    };
  });

export const registerSelfPrincipal = createServerFn({ method: "POST" })
  .validator(registerSelfPrincipalSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { user, profile, school } = await getSchoolAdminContext(supabaseAdmin, data.accessToken);
    const normalizedEmail = normalizeEmail(user.email || "");
    const now = new Date().toISOString();

    if (!normalizedEmail) throw new Error("School Admin email was not found.");

    const { data: activePrincipal, error: activePrincipalError } = await supabaseAdmin
      .from("teachers")
      .select("id, profile_id")
      .eq("school_id", school.id)
      .eq("level", "principal")
      .eq("status", "active")
      .maybeSingle();

    if (activePrincipalError) throw activePrincipalError;
    if (activePrincipal && activePrincipal.profile_id !== user.id) {
      throw new Error("This school already has an active Principal.");
    }

    const teacherPayload = {
      school_id: school.id,
      profile_id: user.id,
      level: "principal",
      status: "active",
      full_name: profile.full_name || normalizedEmail,
      email: normalizedEmail,
      phone: profile.phone || null,
      updated_at: now,
    };

    if (activePrincipal?.id) {
      const { error: updateError } = await supabaseAdmin
        .from("teachers")
        .update(teacherPayload)
        .eq("id", activePrincipal.id);

      if (updateError) throw updateError;
    } else {
      const { data: existingTeacher, error: existingTeacherError } = await supabaseAdmin
        .from("teachers")
        .select("id")
        .eq("school_id", school.id)
        .eq("profile_id", user.id)
        .eq("level", "principal")
        .limit(1)
        .maybeSingle();

      if (existingTeacherError) throw existingTeacherError;

      if (existingTeacher) {
        const { error: updateError } = await supabaseAdmin
          .from("teachers")
          .update(teacherPayload)
          .eq("id", existingTeacher.id);

        if (updateError) throw updateError;
      } else {
        const { error: teacherError } = await supabaseAdmin.from("teachers").insert({
          ...teacherPayload,
          created_at: now,
        });

        if (teacherError) throw teacherError;
      }
    }

    return {
      ok: true,
      message: "You have been set as the Principal of this school.",
    };
  });

export const getPrincipalInvite = createServerFn({ method: "POST" })
  .validator(tokenSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const principalRequest = await fetchValidPrincipalInvite(supabaseAdmin, data.token);

    const { data: school, error: schoolError } = await supabaseAdmin
      .from("schools")
      .select(
        "id, school_name, school_type, school_level, grade_from, grade_to, address, school_phone, school_email, logo_url, regions(name), townships(name)",
      )
      .eq("id", principalRequest.approved_school_id)
      .maybeSingle();

    if (schoolError) throw schoolError;
    if (!school) throw new Error("Invited school was not found.");

    return {
      ok: true,
      request: {
        id: principalRequest.id,
        email: principalRequest.email,
        note: principalRequest.invite_note || "",
      },
      school: toPublicSchool(school as SchoolRow),
    };
  });

export const createPrincipalRegistrationUploadUrls = createServerFn({ method: "POST" })
  .validator(createPrincipalRegistrationUploadUrlsSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const invite = await fetchValidPrincipalInvite(supabaseAdmin, data.token);
    const stamp = Date.now();

    const signedUploads = await Promise.all(
      data.files.map(async (file) => {
        const bucket = principalUploadBucketByKey[file.key];

        if (principalPdfUploadKeys.has(file.key) && !isPrincipalPdfUpload(file.fileName, file.contentType)) {
          throw new Error("PDF file is required.");
        }

        const path = [
          "principal-requests",
          invite.id,
          `${file.key}-${stamp}-${crypto.randomUUID()}-${getPrincipalUploadFileName(file.key, file.fileName)}`,
        ].join("/");

        const { data: signedUrlData, error } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUploadUrl(path, { upsert: true });

        if (error || !signedUrlData?.token) {
          console.error("[Principal registration upload] Signed upload URL failed", {
            bucket,
            key: file.key,
            inviteId: invite.id,
            hasToken: Boolean(signedUrlData?.token),
            message: error?.message,
            statusCode: "statusCode" in (error || {}) ? error?.statusCode : undefined,
          });
          throw new Error("Unable to prepare Principal registration file upload.");
        }

        return {
          key: file.key,
          bucket,
          path: signedUrlData.path,
          uploadToken: signedUrlData.token,
        };
      }),
    );

    return {
      ok: true,
      uploads: signedUploads,
    };
  });

export const submitPrincipalRegistration = createServerFn({ method: "POST" })
  .validator(submitPrincipalRegistrationSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const invite = await fetchValidPrincipalInvite(supabaseAdmin, data.token);
    const now = new Date().toISOString();

    const { data: updatedRequest, error } = await supabaseAdmin
      .from("registration_requests")
      .update({
        status: "pending",
        full_name_mm: data.fullNameMm,
        full_name_en: data.fullNameEn,
        phone: data.phone,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        nrc_number: data.nrcNumber,
        residential_address: data.residentialAddress,
        state_region_id: data.stateRegionId,
        township_id: data.townshipId,
        profile_photo_url: data.profilePhotoUrl,
        highest_education: data.highestEducation,
        major: data.major,
        years_of_teaching_experience: data.yearsOfTeachingExperience,
        years_of_management_experience: data.yearsOfManagementExperience,
        previous_school: data.previousSchool,
        current_position: data.currentPosition,
        nrc_front_url: data.nrcFrontUrl,
        nrc_back_url: data.nrcBackUrl,
        degree_certificate_url: data.degreeCertificateUrl,
        teaching_license_url: data.teachingLicenseUrl,
        appointment_letter_url: data.appointmentLetterUrl,
        resume_url: data.resumeUrl,
        recommendation_letter_url: data.recommendationLetterUrl,
        emergency_contact_name: data.emergencyContactName,
        emergency_contact_relationship: data.emergencyContactRelationship,
        emergency_contact_phone: data.emergencyContactPhone,
        updated_at: now,
      })
      .eq("id", invite.id)
      .eq("request_type", "principal")
      .eq("status", "invited")
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!updatedRequest) throw new Error("Principal invite is no longer available.");

    return {
      ok: true,
      message: "Your information has been submitted and is waiting for approval.",
    };
  });

export const reviewPrincipalRegistration = createServerFn({ method: "POST" })
  .validator(reviewPrincipalSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { user, school } = await getSchoolAdminContext(supabaseAdmin, data.accessToken);
    const request = await fetchPrincipalRequestForSchool(supabaseAdmin, data.requestId, school.id);
    const now = new Date().toISOString();
    const requestSchoolId = request.approved_school_id;
    const normalizedEmail = normalizeEmail(request.email);

    if (!requestSchoolId) {
      throw new Error("Principal request is missing a school assignment.");
    }

    if (request.status !== "pending") {
      throw new Error("Only pending principal requests can be reviewed.");
    }

    if (data.status === "rejected") {
      if (!data.rejectionReason?.trim()) throw new Error("Rejection reason is required.");

      const { error } = await supabaseAdmin
        .from("registration_requests")
        .update({
          status: "rejected",
          rejection_reason: data.rejectionReason.trim(),
          reviewed_by: user.id,
          reviewed_at: now,
        })
        .eq("id", request.id)
        .eq("request_type", "principal")
        .eq("approved_school_id", requestSchoolId);

      if (error) throw error;
      return { ok: true };
    }

    type PrincipalDuplicateRequestRow = {
      id: string;
      status: PrincipalRequestRow["status"];
      approved_profile_id: string | null;
      created_at: string | null;
      updated_at: string | null;
    };

    const duplicateEmailMatches = Array.from(
      new Set([request.email, normalizedEmail].map((email) => email.trim()).filter(Boolean)),
    );

    const { data: duplicateRequests, error: duplicateRequestsError } = await supabaseAdmin
      .from("registration_requests")
      .select("id, status, approved_profile_id, created_at, updated_at")
      .eq("request_type", "principal")
      .eq("approved_school_id", requestSchoolId)
      .in("email", duplicateEmailMatches)
      .order("created_at", { ascending: false });

    if (duplicateRequestsError) {
      logPrincipalServerError(
        "[Principal approval] Duplicate principal request query failed",
        duplicateRequestsError,
        {
          queryName: "principal-duplicate-requests",
          table: "registration_requests",
          userId: user.id,
          schoolId: requestSchoolId,
          expectedColumns: ["id", "status", "approved_profile_id", "created_at", "updated_at"],
        },
      );
      throw duplicateRequestsError;
    }

    const duplicateRequestRows = (duplicateRequests || []) as PrincipalDuplicateRequestRow[];
    const duplicateRequestCount = duplicateRequestRows.filter(
      (duplicateRequest) => duplicateRequest.id !== request.id,
    ).length;
    const actionableDuplicateRequestIds = duplicateRequestRows
      .filter(
        (duplicateRequest) =>
          duplicateRequest.id !== request.id &&
          actionablePrincipalRequestStatuses.has(duplicateRequest.status),
      )
      .map((duplicateRequest) => duplicateRequest.id);

    if (duplicateRequestCount > 0) {
      console.info("[Principal approval] duplicate requests found", {
        selectedRequestId: request.id,
        requestEmail: normalizedEmail,
        schoolId: requestSchoolId,
        duplicateRequestCount,
        actionableDuplicateRequestCount: actionableDuplicateRequestIds.length,
      });
    }

    const existingAuthUser = await findAuthUserByEmail(supabaseAdmin, normalizedEmail);
    const initialTargetPrincipalProfileId = existingAuthUser?.id || null;

    const { data: activePrincipal, error: activePrincipalError } = await supabaseAdmin
      .from("teachers")
      .select("id, profile_id")
      .eq("school_id", requestSchoolId)
      .eq("level", "principal")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (activePrincipalError) {
      logPrincipalServerError("[Principal approval] Active principal check failed", activePrincipalError, {
        queryName: "review-active-principal-check",
        table: "teachers",
        userId: user.id,
        schoolId: requestSchoolId,
        expectedColumns: ["id", "school_id", "profile_id", "level", "status"],
      });
      throw activePrincipalError;
    }

    const activePrincipalProfileId =
      typeof activePrincipal?.profile_id === "string" ? activePrincipal.profile_id : null;
    const shouldBlockApproval = Boolean(
      activePrincipal &&
        (!initialTargetPrincipalProfileId ||
          activePrincipalProfileId !== initialTargetPrincipalProfileId),
    );

    console.info("[Principal approval] approval decision", {
      selectedRequestId: request.id,
      requestEmail: normalizedEmail,
      schoolId: requestSchoolId,
      duplicateRequestCount,
      activePrincipalFound: Boolean(activePrincipal),
      activePrincipalProfileId,
      targetPrincipalProfileId: initialTargetPrincipalProfileId,
      shouldBlockApproval,
      approvalStatusBefore: request.status,
    });

    if (shouldBlockApproval) throw new Error(ACTIVE_PRINCIPAL_EXISTS_MESSAGE);

    const authResult = await inviteOrResetPrincipalUser(
      supabaseAdmin,
      request,
      user.id,
      existingAuthUser,
    );
    const authUser = authResult.user;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: authUser.id,
        email: normalizedEmail,
        full_name: request.full_name_mm,
        full_name_en: request.full_name_en,
        phone: request.phone,
        avatar_url: request.profile_photo_url || null,
        role: "principal",
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

    if (profileError) {
      logPrincipalServerError("[Principal approval] Principal profile upsert failed", profileError, {
        queryName: "principal-profile-upsert",
        table: "profiles",
        userId: user.id,
        profileId: authUser.id,
        schoolId: requestSchoolId,
        expectedColumns: [
          "id",
          "email",
          "full_name",
          "full_name_en",
          "phone",
          "role",
          "status",
          "nrc_number",
        ],
      });
      throw profileError;
    }

    const teacherPayload = {
      school_id: requestSchoolId,
      profile_id: authUser.id,
      level: "principal",
      status: "active",
      full_name: request.full_name_mm,
      email: normalizedEmail,
      phone: request.phone,
      updated_at: now,
    };

    const { data: existingPrincipalTeacher, error: existingTeacherError } = await supabaseAdmin
      .from("teachers")
      .select("id")
      .eq("school_id", requestSchoolId)
      .eq("profile_id", authUser.id)
      .eq("level", "principal")
      .limit(1)
      .maybeSingle();

    if (existingTeacherError) {
      logPrincipalServerError(
        "[Principal approval] Existing principal teacher query failed",
        existingTeacherError,
        {
          queryName: "existing-principal-teacher-for-profile",
          table: "teachers",
          userId: user.id,
          profileId: authUser.id,
          schoolId: requestSchoolId,
          expectedColumns: ["id", "school_id", "profile_id", "level"],
        },
      );
      throw existingTeacherError;
    }

    if (existingPrincipalTeacher?.id) {
      const { error: teacherUpdateError } = await supabaseAdmin
        .from("teachers")
        .update(teacherPayload)
        .eq("id", existingPrincipalTeacher.id);

      if (teacherUpdateError) {
        logPrincipalServerError(
          "[Principal approval] Principal teacher assignment update failed",
          teacherUpdateError,
          {
            queryName: "principal-teacher-assignment-update",
            table: "teachers",
            userId: user.id,
            profileId: authUser.id,
            schoolId: requestSchoolId,
            expectedColumns: ["school_id", "profile_id", "level", "status"],
          },
        );
        throw teacherUpdateError;
      }
    } else {
      const { error: teacherError } = await supabaseAdmin.from("teachers").insert({
        ...teacherPayload,
        created_at: now,
      });

      if (teacherError) {
        logPrincipalServerError(
          "[Principal approval] Principal teacher assignment insert failed",
          teacherError,
          {
            queryName: "principal-teacher-assignment-insert",
            table: "teachers",
            userId: user.id,
            profileId: authUser.id,
            schoolId: requestSchoolId,
            expectedColumns: ["school_id", "profile_id", "level", "status"],
          },
        );
        throw teacherError;
      }
    }

    const { data: approvedRequest, error: requestError } = await supabaseAdmin
      .from("registration_requests")
      .update({
        status: "approved",
        approved_profile_id: authUser.id,
        approved_school_id: requestSchoolId,
        reviewed_by: user.id,
        reviewed_at: now,
        rejection_reason: null,
      })
      .eq("id", request.id)
      .eq("request_type", "principal")
      .eq("approved_school_id", requestSchoolId)
      .eq("status", "pending")
      .select("id, status")
      .maybeSingle();

    if (requestError) {
      logPrincipalServerError("[Principal approval] Registration request update failed", requestError, {
        queryName: "principal-registration-approval-update",
        table: "registration_requests",
        userId: user.id,
        profileId: authUser.id,
        schoolId: requestSchoolId,
        expectedColumns: [
          "status",
          "approved_profile_id",
          "approved_school_id",
          "reviewed_by",
          "reviewed_at",
          "rejection_reason",
        ],
      });
      throw requestError;
    }

    if (!approvedRequest) {
      throw new Error("Selected Principal request is no longer pending.");
    }

    if (actionableDuplicateRequestIds.length > 0) {
      const { error: duplicateCleanupError } = await supabaseAdmin
        .from("registration_requests")
        .update({
          status: "rejected",
          rejection_reason: "Duplicate request superseded by approved request.",
          reviewed_by: user.id,
          reviewed_at: now,
        })
        .eq("request_type", "principal")
        .eq("approved_school_id", requestSchoolId)
        .in("id", actionableDuplicateRequestIds)
        .in("status", ["invited", "pending"]);

      if (duplicateCleanupError) {
        logPrincipalServerError(
          "[Principal approval] Duplicate principal request cleanup failed",
          duplicateCleanupError,
          {
            queryName: "principal-duplicate-request-cleanup",
            table: "registration_requests",
            userId: user.id,
            profileId: authUser.id,
            schoolId: requestSchoolId,
            expectedColumns: ["status", "rejection_reason", "reviewed_by", "reviewed_at"],
          },
        );
        throw duplicateCleanupError;
      }
    }

    console.info("[Principal approval] approval completed", {
      selectedRequestId: request.id,
      requestEmail: normalizedEmail,
      schoolId: requestSchoolId,
      duplicateRequestCount,
      activePrincipalFound: Boolean(activePrincipal),
      activePrincipalProfileId,
      targetPrincipalProfileId: authUser.id,
      shouldBlockApproval: false,
      approvalStatusBefore: request.status,
      approvalStatusAfter: approvedRequest.status,
      duplicateRequestsMarkedRejected: actionableDuplicateRequestIds.length,
      authEmailAction: authResult.emailAction,
    });

    return {
      ok: true,
      message:
        authResult.emailAction === "password_reset"
          ? `Principal account approved. Password reset email sent to ${normalizedEmail}.`
          : `Principal account approved. Password setup email sent to ${normalizedEmail}.`,
    };
  });
