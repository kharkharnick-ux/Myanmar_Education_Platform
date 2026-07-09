import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  FileText,
  GraduationCap,
  Info,
  Loader2,
  Mail,
  Pencil,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { CustomDropdown } from "@/components/layout/SchoolAdminRegistrationForm";
import { supabase } from "@/integrations/supabase/client";
import {
  createPrincipalRegistrationUploadUrls,
  getPrincipalInvite,
  submitPrincipalRegistration,
} from "@/lib/api/principal-account.functions";
import { cn } from "@/lib/utils";

type InviteState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      request: { id: string; email: string; note: string };
      school: {
        id: string;
        name: string;
        type: string | null;
        level: string | null;
        gradeFrom: string | null;
        gradeTo: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        logoUrl: string | null;
        region: string | null;
        township: string | null;
      };
    };

type RegionOption = { id: number; name: string };
type TownshipOption = { id: number; region_id: number; name: string; nrc_code?: string | null };

type FormValues = {
  fullNameMm: string;
  fullNameEn: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  nrcState: string;
  nrcTownship: string;
  nrcType: string;
  nrcNumberRaw: string;
  residentialAddress: string;
  stateRegionId: string;
  townshipId: string;
  highestEducation: string;
  yearsOfTeachingExperience: string;
  yearsOfManagementExperience: string;
  previousSchool: string;
  declarationAccepted: boolean;
};

type FileKey =
  | "profilePhoto"
  | "nrcFront"
  | "nrcBack"
  | "degreeCertificate"
  | "teachingLicense";

type FieldKey = keyof FormValues | FileKey;
type FieldErrors = Partial<Record<FieldKey, string>>;
type FieldWarnings = Partial<Record<"fullNameMm" | "fullNameEn", string>>;

const initialFormValues: FormValues = {
  fullNameMm: "",
  fullNameEn: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  nrcState: "",
  nrcTownship: "",
  nrcType: "",
  nrcNumberRaw: "",
  residentialAddress: "",
  stateRegionId: "",
  townshipId: "",
  highestEducation: "",
  yearsOfTeachingExperience: "0",
  yearsOfManagementExperience: "0",
  previousSchool: "",
  declarationAccepted: false,
};

const fileLabels: Record<FileKey, string> = {
  profilePhoto: "Profile ဓာတ်ပုံ (ရှိပါက)",
  nrcFront: "NRC ရှေ့ဘက် *",
  nrcBack: "NRC နောက်ဘက် *",
  degreeCertificate: "ပညာအရည်အချင်းလက်မှတ် *",
  teachingLicense: "သင်ကြားခွင့် / လုပ်ငန်းလိုင်စင်လက်မှတ် *",
};

const registrationSteps: Array<{ label: string; title: string; icon: LucideIcon }> = [
  { label: "Personal", title: "Personal Information", icon: UserRound },
  { label: "Professional", title: "ပညာအရည်အချင်းနှင့် အတွေ့အကြုံ", icon: GraduationCap },
  { label: "Documents", title: "လိုအပ်သောစာရွက်စာတမ်းများ", icon: FileText },
  { label: "အတည်ပြုခြင်း", title: "အချက်အလက်အတည်ပြုခြင်း", icon: ShieldCheck },
];
const lastRegistrationStepIndex = registrationSteps.length - 1;

const nrcTypeOptions = [
  { value: "\u1014\u102d\u102f\u1004\u103a", label: "\u1014\u102d\u102f\u1004\u103a" },
  { value: "\u1027\u100a\u1037\u103a", label: "\u1027\u100a\u1037\u103a" },
  { value: "\u1015\u103c\u102f", label: "\u1015\u103c\u102f" },
];

const requiredMessage = "ဤအချက်အလက်ကို ဖြည့်ရန်လိုအပ်ပါသည်။";
const myanmarNameMessage = "မြန်မာအမည်ကို မြန်မာစာဖြင့်သာ ရေးပါ။";
const englishNameMessage = "English name ကို English letters ဖြင့်သာ ရေးပါ။";
const phoneMessage = "ဖုန်းနံပါတ် မှန်ကန်စွာ ထည့်ပါ။";
const dobMessage = "မွေးသက္ကရာဇ်ကို ရွေးပါ။";
const genderMessage = "ကျား/မ ကို ရွေးပါ။";
const nrcStateMessage = "NRC တိုင်း/ပြည်နယ်ကို ရွေးပါ။";
const nrcTownshipMessage = "NRC မြို့နယ်ကို ရွေးပါ။";
const nrcTypeMessage = "NRC အမျိုးအစားကို ရွေးပါ။";
const nrcNumberMessage = "NRC နောက်ဆုံးဂဏန်း ၆ လုံးကို ဂဏန်း ၆ လုံးအတိအကျ ထည့်ပါ။";
const addressMessage = "နေရပ်လိပ်စာကို ဖြည့်ပါ။";
const highestEducationMessage = "အမြင့်ဆုံးပညာအရည်အချင်းကို ဖြည့်ပါ။";
const teachingExperienceMessage = "သင်ကြားမှုအတွေ့အကြုံ နှစ်အရေအတွက်ကို မှန်ကန်စွာ ထည့်ပါ။";
const managementExperienceMessage =
  "စီမံခန့်ခွဲမှုအတွေ့အကြုံ နှစ်အရေအတွက်ကို မှန်ကန်စွာ ထည့်ပါ။";
const nrcFrontMessage = "NRC ရှေ့ဘက်ပုံကို တင်ရန်လိုအပ်ပါသည်။";
const nrcBackMessage = "NRC နောက်ဘက်ပုံကို တင်ရန်လိုအပ်ပါသည်။";
const degreeCertificateMessage = "ပညာအရည်အချင်းလက်မှတ်ကို တင်ရန်လိုအပ်ပါသည်။";
const teachingLicenseMessage =
  "သင်ကြားခွင့် / လုပ်ငန်းလိုင်စင်လက်မှတ်ကို တင်ရန်လိုအပ်ပါသည်။";
const pdfFileMessage = "PDF file (.pdf) အဖြစ်သာ တင်ပါ။";
const declarationMessage = "အချက်အလက်များ မှန်ကန်ကြောင်း အတည်ပြုရန်လိုအပ်ပါသည်။";

const pdfOnlyFileKeys = new Set<FileKey>(["degreeCertificate", "teachingLicense"]);
const isPdfOnlyFileKey = (key: FileKey) => pdfOnlyFileKeys.has(key);
const isPdfFile = (file: File) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
const sanitizeMyanmarName = (value: string) =>
  value.replace(/[^\u1000-\u109f\uaa60-\uaa7f\s]/gu, "");
const sanitizeEnglishName = (value: string) => value.replace(/[^A-Za-z\s.'-]/g, "");
const sanitizeNrcNumber = (value: string) => value.replace(/[^0-9\u1040-\u1049]/g, "").slice(0, 6);
const toEnDigit = (value: string) =>
  value.replace(/[\u1040-\u1049]/g, (digit) => String(digit.charCodeAt(0) - 0x1040));
const isMyanmarName = (value: string) => /^[\u1000-\u109f\uaa60-\uaa7f\s]+$/u.test(value.trim());
const isEnglishName = (value: string) => /^[A-Za-z][A-Za-z\s.'-]*$/u.test(value.trim());
const countDigits = (value: string) => toEnDigit(value).replace(/\D/g, "").length;
const isValidPhone = (value: string) => {
  const normalized = toEnDigit(value).trim();
  return countDigits(normalized) >= 6 && countDigits(normalized) <= 15 && /^[0-9+\s().-]+$/.test(normalized);
};
const isValidNonNegativeNumber = (value: string) => {
  if (!value.trim()) return false;
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= 0;
};

export const Route = createFileRoute("/principal/register/form")({
  head: () => ({
    meta: [
      { title: "Principal Registration Form - Myanmar Education Platform" },
      {
        name: "description",
        content: "Complete invited Principal registration information.",
      },
    ],
  }),
  component: PrincipalRegisterPage,
});

function PrincipalRegisterPage() {
  const [invite, setInvite] = useState<InviteState>({ status: "loading" });
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<FormValues>(initialFormValues);
  const [files, setFiles] = useState<Partial<Record<FileKey, File>>>({});
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [townships, setTownships] = useState<TownshipOption[]>([]);
  const [nrcTownships, setNrcTownships] = useState<TownshipOption[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [fieldWarnings, setFieldWarnings] = useState<FieldWarnings>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") || "";
  }, []);

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) {
        setInvite({ status: "error", message: "Principal invite token is missing." });
        return;
      }

      try {
        const result = await getPrincipalInvite({ data: { token } });
        if (!result.school) throw new Error("Invited school was not found.");
        setInvite({
          status: "ready",
          request: result.request,
          school: result.school,
        });
      } catch (error) {
        setInvite({
          status: "error",
          message: error instanceof Error ? error.message : "Principal invite link is invalid.",
        });
      }
    };

    loadInvite();
  }, [token]);

  useEffect(() => {
    supabase
      .from("regions")
      .select("id, name")
      .order("name")
      .then(({ data }) => setRegions((data || []) as RegionOption[]));
  }, []);

  useEffect(() => {
    if (!values.stateRegionId) {
      setTownships([]);
      setValues((current) => ({ ...current, townshipId: "" }));
      return;
    }

    supabase
      .from("townships")
      .select("id, region_id, name, nrc_code")
      .eq("region_id", Number(values.stateRegionId))
      .order("name")
      .then(({ data }) => setTownships((data || []) as TownshipOption[]));
  }, [values.stateRegionId]);

  useEffect(() => {
    if (!values.nrcState) {
      setNrcTownships([]);
      setValues((current) =>
        current.nrcTownship ? { ...current, nrcTownship: "" } : current,
      );
      return;
    }

    supabase
      .from("townships")
      .select("id, region_id, name, nrc_code")
      .eq("region_id", Number(values.nrcState))
      .order("name")
      .then(({ data }) => setNrcTownships((data || []) as TownshipOption[]));
  }, [values.nrcState]);

  const selectedNrcTownship = nrcTownships.find(
    (township) => township.name === values.nrcTownship,
  );
  const nrcTownshipCode = selectedNrcTownship?.nrc_code || values.nrcTownship;
  const fullNrcNumber =
    values.nrcState && nrcTownshipCode && values.nrcType && values.nrcNumberRaw
      ? `${toEnDigit(values.nrcState)}/${nrcTownshipCode}(${values.nrcType})${toEnDigit(values.nrcNumberRaw)}`
      : "";

  const clearFieldError = (key: FieldKey) => {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const updateValue = (key: keyof FormValues, value: string | boolean) => {
    setValues((current) => ({ ...current, [key]: value }));
    clearFieldError(key);
    setSubmitError("");
  };

  const updateFile = (key: FileKey, file: File | undefined) => {
    if (file && isPdfOnlyFileKey(key) && !isPdfFile(file)) {
      setFiles((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      setFieldErrors((current) => ({ ...current, [key]: pdfFileMessage }));
      setSubmitError("");
      return;
    }

    setFiles((current) => {
      const next = { ...current };
      if (file) {
        next[key] = file;
      } else {
        delete next[key];
      }
      return next;
    });
    clearFieldError(key);
    setSubmitError("");
  };

  const handleMyanmarNameChange = (value: string) => {
    const sanitizedValue = sanitizeMyanmarName(value);
    setFieldWarnings((current) => ({
      ...current,
      fullNameMm: sanitizedValue !== value ? myanmarNameMessage : "",
    }));
    updateValue("fullNameMm", sanitizedValue);
  };

  const handleEnglishNameChange = (value: string) => {
    const sanitizedValue = sanitizeEnglishName(value);
    setFieldWarnings((current) => ({
      ...current,
      fullNameEn: sanitizedValue !== value ? englishNameMessage : "",
    }));
    updateValue("fullNameEn", sanitizedValue);
  };

  const scrollToFirstInvalidField = (errors: FieldErrors) => {
    const firstField = Object.keys(errors)[0];
    if (!firstField || typeof window === "undefined") return;

    window.setTimeout(() => {
      const target = document.querySelector(`[data-field="${firstField}"]`) as HTMLElement | null;
      if (!target) return;

      target.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusTarget = target.querySelector(
        "input:not([type='hidden']):not([disabled]), textarea:not([disabled]), button:not([disabled])",
      ) as HTMLElement | null;
      (focusTarget || target).focus({ preventScroll: true });
    }, 0);
  };

  const validateStep = (step: number): FieldErrors => {
    const errors: FieldErrors = {};

    if (step === 0) {
      if (!values.fullNameMm.trim()) errors.fullNameMm = requiredMessage;
      else if (!isMyanmarName(values.fullNameMm)) errors.fullNameMm = myanmarNameMessage;

      if (!values.fullNameEn.trim()) errors.fullNameEn = requiredMessage;
      else if (!isEnglishName(values.fullNameEn)) errors.fullNameEn = englishNameMessage;

      if (!values.phone.trim()) errors.phone = requiredMessage;
      else if (!isValidPhone(values.phone)) errors.phone = phoneMessage;

      if (!values.dateOfBirth) errors.dateOfBirth = dobMessage;
      if (!values.gender) errors.gender = genderMessage;
      if (!values.nrcState) errors.nrcState = nrcStateMessage;
      if (!values.nrcTownship || !selectedNrcTownship) errors.nrcTownship = nrcTownshipMessage;
      if (!values.nrcType) errors.nrcType = nrcTypeMessage;
      if (countDigits(values.nrcNumberRaw) !== 6 || !fullNrcNumber) {
        errors.nrcNumberRaw = nrcNumberMessage;
      }
      if (!values.residentialAddress.trim()) errors.residentialAddress = addressMessage;
    }

    if (step === 1) {
      if (!values.highestEducation.trim()) errors.highestEducation = highestEducationMessage;
      if (!isValidNonNegativeNumber(values.yearsOfTeachingExperience)) {
        errors.yearsOfTeachingExperience = teachingExperienceMessage;
      }
      if (!isValidNonNegativeNumber(values.yearsOfManagementExperience)) {
        errors.yearsOfManagementExperience = managementExperienceMessage;
      }
    }

    if (step === 2) {
      if (!files.nrcFront) errors.nrcFront = nrcFrontMessage;
      if (!files.nrcBack) errors.nrcBack = nrcBackMessage;
      if (!files.degreeCertificate) errors.degreeCertificate = degreeCertificateMessage;
      else if (!isPdfFile(files.degreeCertificate)) errors.degreeCertificate = pdfFileMessage;
      if (!files.teachingLicense) errors.teachingLicense = teachingLicenseMessage;
      else if (!isPdfFile(files.teachingLicense)) errors.teachingLicense = pdfFileMessage;
    }

    if (step === 3) {
      if (!values.declarationAccepted) errors.declarationAccepted = declarationMessage;
    }

    return errors;
  };

  const validateAllSteps = () =>
    registrationSteps.reduce<FieldErrors>(
      (errors, _step, index) => ({ ...errors, ...validateStep(index) }),
      {},
    );

  const stepForField = (field: string) => {
    if (
      [
        "fullNameMm",
        "fullNameEn",
        "phone",
        "dateOfBirth",
        "gender",
        "nrcState",
        "nrcTownship",
        "nrcType",
        "nrcNumberRaw",
        "residentialAddress",
      ].includes(field)
    ) {
      return 0;
    }

    if (
      [
        "highestEducation",
        "yearsOfTeachingExperience",
        "yearsOfManagementExperience",
      ].includes(field)
    ) {
      return 1;
    }

    if (["nrcFront", "nrcBack", "degreeCertificate", "teachingLicense"].includes(field)) {
      return 2;
    }
    return 3;
  };

  const showValidationErrors = (errors: FieldErrors) => {
    setFieldErrors(errors);
    setSubmitError("");
    scrollToFirstInvalidField(errors);
  };

  const getFileContentType = (key: FileKey, file: File) =>
    isPdfOnlyFileKey(key) ? "application/pdf" : file.type || "application/octet-stream";

  const uploadPrincipalRegistrationFiles = async () => {
    const fileEntries = (Object.entries(files) as Array<[FileKey, File | undefined]>).filter(
      (entry): entry is [FileKey, File] => Boolean(entry[1]),
    );

    if (fileEntries.length === 0) return {} as Partial<Record<FileKey, string>>;

    const signedUploadResult = await createPrincipalRegistrationUploadUrls({
      data: {
        token,
        files: fileEntries.map(([key, file]) => ({
          key,
          fileName: file.name,
          contentType: getFileContentType(key, file),
        })),
      },
    });

    const uploadByKey = new Map(signedUploadResult.uploads.map((upload) => [upload.key, upload]));
    const uploadedPaths: Partial<Record<FileKey, string>> = {};

    await Promise.all(
      fileEntries.map(async ([key, file]) => {
        const signedUpload = uploadByKey.get(key);
        if (!signedUpload) throw new Error("Missing signed upload information.");

        const { data, error } = await supabase.storage
          .from(signedUpload.bucket)
          .uploadToSignedUrl(signedUpload.path, signedUpload.uploadToken, file, {
            cacheControl: "3600",
            contentType: getFileContentType(key, file),
          });

        if (error) {
          console.error("[Principal registration upload] Upload failed", {
            key,
            bucket: signedUpload.bucket,
            path: signedUpload.path,
            message: error.message,
          });
          throw new Error("Unable to upload Principal registration files.");
        }

        uploadedPaths[key] = data?.path || signedUpload.path;
      }),
    );

    return uploadedPaths;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (invite.status !== "ready") return;

    const currentStepErrors = validateStep(currentStep);
    if (Object.keys(currentStepErrors).length > 0) {
      showValidationErrors(currentStepErrors);
      return;
    }

    if (currentStep < lastRegistrationStepIndex) {
      setFieldErrors({});
      setSubmitError("");
      setCurrentStep((step) => Math.min(step + 1, lastRegistrationStepIndex));
      return;
    }

    const allErrors = validateAllSteps();
    if (Object.keys(allErrors).length > 0) {
      const firstField = Object.keys(allErrors)[0];
      setCurrentStep(stepForField(firstField));
      showValidationErrors(allErrors);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setSubmitError("");

    try {
      const uploadedPaths = await uploadPrincipalRegistrationFiles();
      const profilePhotoUrl = uploadedPaths.profilePhoto || null;
      const nrcFrontUrl = uploadedPaths.nrcFront || null;
      const nrcBackUrl = uploadedPaths.nrcBack || null;
      const degreeCertificateUrl = uploadedPaths.degreeCertificate || null;
      const teachingLicenseUrl = uploadedPaths.teachingLicense || null;

      if (!nrcFrontUrl || !nrcBackUrl || !degreeCertificateUrl || !teachingLicenseUrl) {
        throw new Error("Required documents are missing.");
      }

      await submitPrincipalRegistration({
        data: {
          token,
          fullNameMm: values.fullNameMm.trim(),
          fullNameEn: values.fullNameEn.trim(),
          phone: values.phone.trim(),
          dateOfBirth: values.dateOfBirth,
          gender: values.gender,
          nrcNumber: fullNrcNumber,
          residentialAddress: values.residentialAddress.trim(),
          stateRegionId: values.stateRegionId ? Number(values.stateRegionId) : null,
          townshipId: values.townshipId ? Number(values.townshipId) : null,
          profilePhotoUrl,
          highestEducation: values.highestEducation.trim(),
          major: "",
          yearsOfTeachingExperience: Number(values.yearsOfTeachingExperience || 0),
          yearsOfManagementExperience: Number(values.yearsOfManagementExperience || 0),
          previousSchool: values.previousSchool.trim() || null,
          currentPosition: "",
          nrcFrontUrl,
          nrcBackUrl,
          degreeCertificateUrl,
          teachingLicenseUrl,
          appointmentLetterUrl: null,
          resumeUrl: null,
          recommendationLetterUrl: null,
          emergencyContactName: "",
          emergencyContactRelationship: "",
          emergencyContactPhone: "",
          declarationAccepted: true,
        },
      });

      setSuccess(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to submit Principal information.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (invite.status === "loading") {
    return (
      <CenteredState
        icon={<Loader2 className="h-8 w-8 animate-spin" />}
        title="Checking invite link..."
      />
    );
  }

  if (invite.status === "error") {
    return (
      <CenteredState
        icon={<ShieldCheck className="h-8 w-8" />}
        title="Invite unavailable"
        message={invite.message}
      />
    );
  }

  if (success) {
    return (
      <CenteredState
        icon={<CheckCircle2 className="h-9 w-9" />}
        title="Principal အချက်အလက်များ တင်သွင်းပြီးပါပြီ"
        message="သင့် Principal registration ကို School Admin မှ စစ်ဆေးအတည်ပြုရန် စောင့်ဆိုင်းနေပါသည်။"
      >
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          အတည်ပြုမှုအခြေအနေကို သိလိုပါက Home page သို့သွားပြီး
          “လျှောက်ထားမှုအခြေအနေစစ်ရန်” ကိုနှိပ်ပါ။ ထို့နောက် Email နှင့် NRC
          နောက်ဆုံးဂဏန်း ၆ လုံးဖြင့် ဝင်ရောက်စစ်ဆေးနိုင်ပါသည်။
        </p>
        <Link
          to="/"
          className="aqua-button mt-6 inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-105"
        >
          Home page သို့သွားရန်
        </Link>
      </CenteredState>
    );
  }

  const currentStepInfo = registrationSteps[currentStep];
  const CurrentStepIcon = currentStepInfo.icon;
  const progressPercent = ((currentStep + 1) / registrationSteps.length) * 100;
  const displayValue = (value: string | null | undefined, fallback = "မဖြည့်ထားပါ") =>
    value?.trim() || fallback;
  const genderLabels: Record<string, string> = {
    Male: "ကျား",
    Female: "မ",
    Other: "အခြား",
  };
  const genderDisplay = genderLabels[values.gender] || displayValue(values.gender);
  const uploadedStatus = (file?: File) => (file ? "တင်ပြီးပါပြီ" : "မတင်ထားပါ");
  const requiredUploadStatus = (file?: File) => (file ? "တင်ပြီးပါပြီ" : "တင်ရန်လိုအပ်ပါသည်");
  const editStep = (step: number) => {
    setFieldErrors({});
    setSubmitError("");
    setCurrentStep(step);
    if (typeof window !== "undefined") {
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    }
  };

  return (
    <main className="aqua-page min-h-screen px-4 py-6 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Link
          to="/principal/register"
          search={{ token }}
          className="glass-panel inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to invitation
        </Link>

        <form
          onSubmit={handleSubmit}
          className="aqua-card space-y-6 rounded-[2rem] p-5 sm:p-6 lg:p-8"
        >
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Principal registration
                </p>
                <h2 className="text-2xl font-bold glow-text">Complete your invited profile</h2>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                Step {currentStep + 1} of {registrationSteps.length}
              </span>
            </div>

            <div className="glass-panel rounded-3xl p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="theme-icon-tile-strong flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-primary-foreground">
                    <CurrentStepIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Step {currentStep + 1} of {registrationSteps.length}
                    </p>
                    <h3 className="text-base font-bold">{currentStepInfo.title}</h3>
                  </div>
                </div>
                <span className="rounded-2xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                  {currentStepInfo.label}
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary/10">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {currentStep === 0 && (
            <FormSection
              icon={UserRound}
              title="Personal Information"
              description="Use the same personal details that match your official records."
            >
              <InfoBox icon={Mail} title="Invite email is prefilled" className="md:col-span-2">
                This email came from your Principal invitation and cannot be edited here.
              </InfoBox>
              <TextInput
                label="Myanmar name"
                fieldName="fullNameMm"
                value={values.fullNameMm}
                error={fieldErrors.fullNameMm}
                warning={fieldWarnings.fullNameMm}
                onChange={handleMyanmarNameChange}
              />
              <TextInput
                label="English name"
                fieldName="fullNameEn"
                value={values.fullNameEn}
                error={fieldErrors.fullNameEn}
                warning={fieldWarnings.fullNameEn}
                onChange={handleEnglishNameChange}
              />
              <TextInput label="Email address" value={invite.request.email} readOnly />
              <TextInput
                label="Phone"
                fieldName="phone"
                value={values.phone}
                error={fieldErrors.phone}
                onChange={(value) => updateValue("phone", value)}
              />
              <TextInput
                label="Date of birth"
                fieldName="dateOfBirth"
                type="date"
                value={values.dateOfBirth}
                error={fieldErrors.dateOfBirth}
                onChange={(value) => updateValue("dateOfBirth", value)}
              />
              <SelectInput
                label="Gender"
                fieldName="gender"
                value={values.gender}
                error={fieldErrors.gender}
                onChange={(value) => updateValue("gender", value)}
                options={["Male", "Female", "Other"]}
              />
              <InfoBox icon={Info} title="NRC အချက်အလက်" className="md:col-span-2">
                NRC ကတ်ပေါ်ရှိ အချက်အလက်အတိုင်း ရွေးချယ်ပြီး နောက်ဆုံးဂဏန်း ၆ လုံးကို ထည့်ပါ။
              </InfoBox>
              <SelectInput
                label="NRC State/Region"
                fieldName="nrcState"
                value={values.nrcState}
                error={fieldErrors.nrcState}
                onChange={(value) => {
                  updateValue("nrcState", value);
                  updateValue("nrcTownship", "");
                  clearFieldError("nrcTownship");
                }}
                options={regions.map((region) => ({
                  value: String(region.id),
                  label: region.name,
                }))}
              />
              <SelectInput
                label="NRC Township"
                fieldName="nrcTownship"
                value={values.nrcTownship}
                error={fieldErrors.nrcTownship}
                onChange={(value) => updateValue("nrcTownship", value)}
                disabled={!values.nrcState}
                options={nrcTownships.map((township) => ({
                  value: township.name,
                  label: `${township.name}${township.nrc_code ? ` (${township.nrc_code})` : ""}`,
                }))}
              />
              <SelectInput
                label="NRC Type"
                fieldName="nrcType"
                value={values.nrcType}
                error={fieldErrors.nrcType}
                onChange={(value) => updateValue("nrcType", value)}
                options={nrcTypeOptions}
              />
              <TextInput
                label="NRC last 6 digits"
                fieldName="nrcNumberRaw"
                value={values.nrcNumberRaw}
                error={fieldErrors.nrcNumberRaw}
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                onChange={(value) => updateValue("nrcNumberRaw", sanitizeNrcNumber(value))}
              />
              <div className="glass-panel flex items-center justify-between gap-3 rounded-2xl border-primary/10 p-3 md:col-span-2">
                <span className="ml-1 text-xs font-semibold text-muted-foreground">
                  NRC Preview
                </span>
                <span className="rounded-xl bg-primary/10 px-3 py-1.5 text-sm font-bold tracking-widest text-primary">
                  {fullNrcNumber || "Select NRC details"}
                </span>
              </div>
              <SelectInput
                label="State/Region"
                value={values.stateRegionId}
                onChange={(value) => updateValue("stateRegionId", value)}
                options={regions.map((region) => ({
                  value: String(region.id),
                  label: region.name,
                }))}
              />
              <SelectInput
                label="Township"
                value={values.townshipId}
                onChange={(value) => updateValue("townshipId", value)}
                options={townships.map((township) => ({
                  value: String(township.id),
                  label: township.name,
                }))}
              />
              <label className="space-y-2 md:col-span-2">
                <span className="ml-1 text-sm font-semibold">Residential address</span>
                <textarea
                  data-field="residentialAddress"
                  aria-invalid={Boolean(fieldErrors.residentialAddress)}
                  className={cn(
                    "aqua-input min-h-28 w-full resize-none rounded-2xl px-4 py-3.5 text-sm outline-none transition-all focus:ring-2 ring-primary/20",
                    fieldErrors.residentialAddress &&
                      "border-destructive/50 ring-1 ring-destructive/20 focus:ring-destructive/25",
                  )}
                  value={values.residentialAddress}
                  onChange={(event) => updateValue("residentialAddress", event.target.value)}
                />
                {fieldErrors.residentialAddress && (
                  <p className="ml-1 text-[11px] leading-5 text-destructive">
                    {fieldErrors.residentialAddress}
                  </p>
                )}
              </label>
            </FormSection>
          )}

          {currentStep === 1 && (
            <FormSection
              icon={Briefcase}
              title="ပညာအရည်အချင်းနှင့် အတွေ့အကြုံ"
              description="Principal အဖြစ်တာဝန်ယူနိုင်ရန် လိုအပ်သော ပညာအရည်အချင်းနှင့် အတွေ့အကြုံအချက်အလက်များကို ဖြည့်ပါ။"
            >
              <TextInput
                label="အမြင့်ဆုံးပညာအရည်အချင်း"
                fieldName="highestEducation"
                value={values.highestEducation}
                error={fieldErrors.highestEducation}
                placeholder="ဥပမာ - B.Ed, M.Ed, Bachelor, Master"
                onChange={(value) => updateValue("highestEducation", value)}
              />
              <TextInput
                label="သင်ကြားမှုအတွေ့အကြုံ (နှစ်)"
                fieldName="yearsOfTeachingExperience"
                type="number"
                value={values.yearsOfTeachingExperience}
                error={fieldErrors.yearsOfTeachingExperience}
                inputMode="numeric"
                min={0}
                step={1}
                onChange={(value) => updateValue("yearsOfTeachingExperience", value)}
              />
              <TextInput
                label="စီမံခန့်ခွဲမှု / ကျောင်းအုပ်ချုပ်မှု အတွေ့အကြုံ (နှစ်)"
                fieldName="yearsOfManagementExperience"
                type="number"
                value={values.yearsOfManagementExperience}
                error={fieldErrors.yearsOfManagementExperience}
                inputMode="numeric"
                min={0}
                step={1}
                onChange={(value) => updateValue("yearsOfManagementExperience", value)}
              />
              <TextInput
                label="ယခင်တာဝန်ထမ်းဆောင်ခဲ့သည့်ကျောင်း (ရှိပါက)"
                value={values.previousSchool}
                placeholder="မရှိပါက ချန်ထားနိုင်ပါသည်။"
                onChange={(value) => updateValue("previousSchool", value)}
              />
            </FormSection>
          )}

          {currentStep === 2 && (
            <FormSection
              icon={FileText}
              title="လိုအပ်သောစာရွက်စာတမ်းများ"
              description="အချက်အလက်စစ်ဆေးနိုင်ရန် NRC ရှေ့ဘက်၊ NRC နောက်ဘက်၊ ပညာအရည်အချင်းလက်မှတ်နှင့် သင်ကြားခွင့် / လုပ်ငန်းလိုင်စင်လက်မှတ်ကို မဖြစ်မနေ တင်ပါ။ လက်မှတ် ၂ ခုကို PDF file အဖြစ်သာ တင်ပါ။"
            >
              {(
                [
                  "profilePhoto",
                  "nrcFront",
                  "nrcBack",
                  "degreeCertificate",
                  "teachingLicense",
                ] as FileKey[]
              ).map((key) => (
                <FileInput
                  key={key}
                  fieldName={key}
                  label={fileLabels[key]}
                  file={files[key]}
                  error={fieldErrors[key]}
                  accept={isPdfOnlyFileKey(key) ? "application/pdf,.pdf" : undefined}
                  onChange={(file) => updateFile(key, file)}
                />
              ))}
            </FormSection>
          )}

          {currentStep === 3 && (
            <FormSection
              icon={ShieldCheck}
              title="အချက်အလက်များ ပြန်လည်စစ်ဆေးရန်"
              description="တင်သွင်းမည့်အချက်အလက်များကို စစ်ဆေးပါ။ မှားယွင်းနေပါက ပြင်မည် ကိုနှိပ်ပြီး ပြန်ပြင်နိုင်ပါသည်။"
            >
              <div className="space-y-5 md:col-span-2">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ReviewCard
                    title="ကိုယ်ရေးအချက်အလက်"
                    className="lg:col-span-2"
                    onEdit={() => editStep(0)}
                  >
                    <ReviewRow label="မြန်မာအမည်" value={displayValue(values.fullNameMm)} />
                    <ReviewRow label="English name" value={displayValue(values.fullNameEn)} />
                    <ReviewRow label="Email" value={invite.request.email} />
                    <ReviewRow label="Phone" value={displayValue(values.phone)} />
                    <ReviewRow label="မွေးသက္ကရာဇ်" value={displayValue(values.dateOfBirth)} />
                    <ReviewRow label="ကျား/မ" value={genderDisplay} />
                    <ReviewRow label="NRC" value={displayValue(fullNrcNumber)} />
                    <ReviewRow
                      label="နေရပ်လိပ်စာ"
                      value={displayValue(values.residentialAddress)}
                    />
                  </ReviewCard>

                  <ReviewCard
                    title="ပညာအရည်အချင်းနှင့် အတွေ့အကြုံ"
                    onEdit={() => editStep(1)}
                  >
                    <ReviewRow
                      label="အမြင့်ဆုံးပညာအရည်အချင်း"
                      value={displayValue(values.highestEducation)}
                    />
                    <ReviewRow
                      label="သင်ကြားမှုအတွေ့အကြုံ (နှစ်)"
                      value={displayValue(values.yearsOfTeachingExperience)}
                    />
                    <ReviewRow
                      label="စီမံခန့်ခွဲမှု / ကျောင်းအုပ်ချုပ်မှု အတွေ့အကြုံ (နှစ်)"
                      value={displayValue(values.yearsOfManagementExperience)}
                    />
                    <ReviewRow
                      label="ယခင်တာဝန်ထမ်းဆောင်ခဲ့သည့်ကျောင်း (ရှိပါက)"
                      value={displayValue(values.previousSchool, "မရှိပါ")}
                    />
                  </ReviewCard>

                  <ReviewCard title="စာရွက်စာတမ်းများ" onEdit={() => editStep(2)}>
                    <DocumentStatusRow label="Profile ဓာတ်ပုံ" status={uploadedStatus(files.profilePhoto)} />
                    <DocumentStatusRow
                      label="NRC ရှေ့ဘက်"
                      status={requiredUploadStatus(files.nrcFront)}
                      required
                      uploaded={Boolean(files.nrcFront)}
                    />
                    <DocumentStatusRow
                      label="NRC နောက်ဘက်"
                      status={requiredUploadStatus(files.nrcBack)}
                      required
                      uploaded={Boolean(files.nrcBack)}
                    />
                    <DocumentStatusRow
                      label="ပညာအရည်အချင်းလက်မှတ်"
                      status={requiredUploadStatus(files.degreeCertificate)}
                      required
                      uploaded={Boolean(files.degreeCertificate)}
                    />
                    <DocumentStatusRow
                      label="သင်ကြားခွင့် / လုပ်ငန်းလိုင်စင်လက်မှတ်"
                      status={requiredUploadStatus(files.teachingLicense)}
                      required
                      uploaded={Boolean(files.teachingLicense)}
                    />
                  </ReviewCard>
                </div>

                <div data-field="declarationAccepted" className="mx-auto max-w-2xl space-y-2">
                  <label
                    className={cn(
                      "glass-panel flex items-start gap-3 rounded-2xl p-4 text-sm leading-6",
                      fieldErrors.declarationAccepted &&
                        "border-destructive/50 ring-1 ring-destructive/20",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={values.declarationAccepted}
                      onChange={(event) =>
                        updateValue("declarationAccepted", event.target.checked)
                      }
                      className="mt-1 h-4 w-4 accent-primary"
                    />
                    <span>
                      အချက်အလက်များကို စစ်ဆေးပြီး မှန်ကန်ကြောင်း အတည်ပြုပါသည်။
                    </span>
                  </label>
                  {fieldErrors.declarationAccepted && (
                    <p className="ml-1 text-[11px] leading-5 text-destructive">
                      {fieldErrors.declarationAccepted}
                    </p>
                  )}
                </div>
              </div>
            </FormSection>
          )}

          {submitError && (
            <div className="rounded-2xl border border-destructive/35 bg-destructive/10 p-4 text-sm text-destructive">
              {submitError}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              className="glass-panel inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-bold transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting || currentStep === 0}
              onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}
            >
              <ArrowLeft className="h-4 w-4" />
              နောက်သို့
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="aqua-button inline-flex flex-[2] items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-bold text-primary-foreground transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : currentStep === lastRegistrationStepIndex ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {currentStep === lastRegistrationStepIndex
                ? "Principal အချက်အလက် တင်သွင်းရန်"
                : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function CenteredState({
  icon,
  title,
  message,
  children,
}: {
  icon: ReactNode;
  title: string;
  message?: string;
  children?: ReactNode;
}) {
  return (
    <main className="aqua-page grid min-h-screen place-items-center px-4 py-10">
      <div className="aqua-card max-w-lg p-8 text-center">
        <div className="theme-icon-tile-strong mx-auto mb-4 h-14 w-14 rounded-2xl">{icon}</div>
        <h1 className="text-2xl font-bold glow-text">{title}</h1>
        {message && <p className="mt-3 text-sm leading-7 text-muted-foreground">{message}</p>}
        {children}
      </div>
    </main>
  );
}

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="glass-panel flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="aqua-section-title text-sm font-bold uppercase tracking-[0.22em]">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function InfoBox({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass-panel flex items-start gap-3 rounded-2xl border-primary/15 bg-primary/5 p-4",
        className,
      )}
    >
      <span className="theme-icon-tile mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-bold text-primary">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

function ReviewCard({
  title,
  onEdit,
  children,
  className,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("glass-panel rounded-3xl border-primary/15 p-4", className)}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-bold text-primary">{title}</h3>
        <button
          type="button"
          className="glass-panel inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/10"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
          ပြင်မည်
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function ReviewRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-background/35 p-3">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-bold leading-6">{value}</p>
    </div>
  );
}

function DocumentStatusRow({
  label,
  status,
  required = false,
  uploaded = false,
}: {
  label: string;
  status: string;
  required?: boolean;
  uploaded?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-background/35 p-3">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <span
        className={cn(
          "mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold",
          status === "တင်ပြီးပါပြီ" && "bg-primary/10 text-primary",
          status === "မတင်ထားပါ" && "bg-muted/40 text-muted-foreground",
          required && !uploaded && "bg-destructive/10 text-destructive",
        )}
      >
        {status}
      </span>
    </div>
  );
}

function TextInput({
  label,
  fieldName,
  value,
  onChange,
  type = "text",
  readOnly = false,
  inputMode,
  maxLength,
  min,
  step,
  placeholder,
  error,
  warning,
}: {
  label: string;
  fieldName?: FieldKey;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  readOnly?: boolean;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  min?: number;
  step?: number;
  placeholder?: string;
  error?: string;
  warning?: string;
}) {
  return (
    <label className="space-y-2" data-field={fieldName}>
      <span className="ml-1 text-sm font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        inputMode={inputMode}
        maxLength={maxLength}
        min={min}
        step={step}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange?.(event.target.value)}
        className={cn(
          "aqua-input w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition-all focus:ring-2 ring-primary/20",
          readOnly && "cursor-not-allowed bg-muted/20 text-muted-foreground",
          error &&
            "border-destructive/50 ring-1 ring-destructive/20 focus:ring-destructive/25",
        )}
      />
      {error && <p className="ml-1 text-[11px] leading-5 text-destructive">{error}</p>}
      {warning && <p className="ml-1 text-[11px] leading-5 text-amber-600">{warning}</p>}
    </label>
  );
}

function SelectInput({
  label,
  fieldName,
  value,
  options,
  onChange,
  disabled = false,
  error,
}: {
  label: string;
  fieldName?: FieldKey;
  value: string;
  options: Array<string | { value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  const dropdownOptions = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );

  return (
    <div className="space-y-2" data-field={fieldName}>
      <span className="ml-1 text-sm font-semibold">{label}</span>
      <CustomDropdown
        value={value}
        options={dropdownOptions}
        placeholder="Select"
        disabled={disabled}
        className={cn(
          "w-full rounded-2xl px-4 py-3.5 text-sm",
          error && "border-destructive/50 ring-1 ring-destructive/20",
        )}
        onChange={onChange}
      />
      {error && <p className="ml-1 text-[11px] leading-5 text-destructive">{error}</p>}
    </div>
  );
}

function FileInput({
  label,
  fieldName,
  file,
  onChange,
  error,
  accept,
}: {
  label: string;
  fieldName: FileKey;
  file?: File;
  onChange: (file: File | undefined) => void;
  error?: string;
  accept?: string;
}) {
  return (
    <div
      data-field={fieldName}
      tabIndex={-1}
      className={cn(
        "glass-panel rounded-3xl border-2 border-dashed border-primary/20 p-5 transition hover:border-primary/45",
        error && "border-destructive/50 ring-1 ring-destructive/20",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="theme-icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-primary">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">{label}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {file?.name || "No file selected"}
            </p>
            {accept && (
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                PDF file (.pdf) အဖြစ်သာ တင်ပါ။
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {file && (
            <button
              type="button"
              className="glass-panel inline-flex h-10 w-10 items-center justify-center rounded-2xl text-muted-foreground transition hover:text-destructive"
              aria-label={`Remove ${label}`}
              onClick={() => onChange(undefined)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <label className="aqua-button inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:brightness-105">
            <Upload className="h-4 w-4" />
            {file ? "Replace" : "Upload"}
            <input
              type="file"
              accept={accept}
              className="hidden"
              onChange={(event) => {
                onChange(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>
      {error && <p className="mt-3 text-[11px] leading-5 text-destructive">{error}</p>}
    </div>
  );
}
