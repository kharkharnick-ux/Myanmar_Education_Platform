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
  Phone,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { CustomDropdown } from "@/components/layout/SchoolAdminRegistrationForm";
import { supabase } from "@/integrations/supabase/client";
import {
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
  major: string;
  yearsOfTeachingExperience: string;
  yearsOfManagementExperience: string;
  previousSchool: string;
  currentPosition: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  declarationAccepted: boolean;
};

type FileKey =
  | "profilePhoto"
  | "nrcFront"
  | "nrcBack"
  | "degreeCertificate"
  | "teachingLicense"
  | "appointmentLetter"
  | "resume"
  | "recommendationLetter";

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
  major: "",
  yearsOfTeachingExperience: "0",
  yearsOfManagementExperience: "0",
  previousSchool: "",
  currentPosition: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhone: "",
  declarationAccepted: false,
};

const fileLabels: Record<FileKey, string> = {
  profilePhoto: "Profile photo",
  nrcFront: "NRC front",
  nrcBack: "NRC back",
  degreeCertificate: "Degree certificate",
  teachingLicense: "Teaching license",
  appointmentLetter: "Appointment letter",
  resume: "Resume",
  recommendationLetter: "Recommendation letter",
};

const registrationSteps: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Personal", icon: UserRound },
  { label: "Professional", icon: GraduationCap },
  { label: "Documents", icon: FileText },
  { label: "Emergency", icon: Phone },
];
const lastRegistrationStepIndex = registrationSteps.length - 1;

const nrcTypeOptions = [
  { value: "\u1014\u102d\u102f\u1004\u103a", label: "\u1014\u102d\u102f\u1004\u103a" },
  { value: "\u1027\u100a\u1037\u103a", label: "\u1027\u100a\u1037\u103a" },
  { value: "\u1015\u103c\u102f", label: "\u1015\u103c\u102f" },
];

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9.\-_]+/g, "-").slice(0, 90);
const sanitizeMyanmarName = (value: string) =>
  value.replace(/[^\u1000-\u109f\uaa60-\uaa7f\s]/gu, "");
const sanitizeEnglishName = (value: string) => value.replace(/[^A-Za-z\s.'-]/g, "");
const sanitizeNrcNumber = (value: string) => value.replace(/[^0-9\u1040-\u1049]/g, "").slice(0, 6);
const toEnDigit = (value: string) =>
  value.replace(/[\u1040-\u1049]/g, (digit) => String(digit.charCodeAt(0) - 0x1040));

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

  const updateValue = (key: keyof FormValues, value: string | boolean) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const validate = () => {
    const required: Array<[keyof FormValues, string]> = [
      ["fullNameMm", "Myanmar name is required."],
      ["fullNameEn", "English name is required."],
      ["phone", "Phone is required."],
      ["dateOfBirth", "Date of birth is required."],
      ["gender", "Gender is required."],
      ["nrcState", "NRC state/region is required."],
      ["nrcTownship", "NRC township is required."],
      ["nrcType", "NRC type is required."],
      ["nrcNumberRaw", "NRC number is required."],
      ["residentialAddress", "Residential address is required."],
      ["highestEducation", "Highest education is required."],
      ["major", "Major is required."],
      ["currentPosition", "Current position is required."],
      ["emergencyContactName", "Emergency contact name is required."],
      ["emergencyContactRelationship", "Emergency contact relationship is required."],
      ["emergencyContactPhone", "Emergency contact phone is required."],
    ];

    for (const [key, message] of required) {
      if (!String(values[key] || "").trim()) return message;
    }

    if (!selectedNrcTownship) return "Please select a valid NRC township.";
    if (toEnDigit(values.nrcNumberRaw).length !== 6) return "NRC number must be 6 digits.";
    if (!fullNrcNumber) return "NRC number is required.";
    if (!files.nrcFront || !files.nrcBack) return "NRC front and back files are required.";
    if (!values.declarationAccepted) return "Please confirm the declaration.";
    return "";
  };

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) throw error;
    if (!data?.path) throw new Error("File upload did not return a path.");
    return data.path;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (invite.status !== "ready") return;

    if (currentStep < lastRegistrationStepIndex) {
      setCurrentStep((step) => Math.min(step + 1, lastRegistrationStepIndex));
      return;
    }

    const validationError = validate();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const folder = `principal-requests/${invite.request.id}`;
      const stamp = Date.now();
      const upload = (key: FileKey, bucket: string) => {
        const file = files[key];
        if (!file) return Promise.resolve(null);
        return uploadFile(file, bucket, `${folder}/${key}-${stamp}-${sanitizeFileName(file.name)}`);
      };

      const [
        profilePhotoUrl,
        nrcFrontUrl,
        nrcBackUrl,
        degreeCertificateUrl,
        teachingLicenseUrl,
        appointmentLetterUrl,
        resumeUrl,
        recommendationLetterUrl,
      ] = await Promise.all([
        upload("profilePhoto", "application-nrc-docs"),
        upload("nrcFront", "application-nrc-docs"),
        upload("nrcBack", "application-nrc-docs"),
        upload("degreeCertificate", "application-school-docs"),
        upload("teachingLicense", "application-school-docs"),
        upload("appointmentLetter", "application-school-docs"),
        upload("resume", "application-school-docs"),
        upload("recommendationLetter", "application-school-docs"),
      ]);

      if (!nrcFrontUrl || !nrcBackUrl) throw new Error("NRC files are required.");

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
          major: values.major.trim(),
          yearsOfTeachingExperience: Number(values.yearsOfTeachingExperience || 0),
          yearsOfManagementExperience: Number(values.yearsOfManagementExperience || 0),
          previousSchool: values.previousSchool.trim() || null,
          currentPosition: values.currentPosition.trim(),
          nrcFrontUrl,
          nrcBackUrl,
          degreeCertificateUrl,
          teachingLicenseUrl,
          appointmentLetterUrl,
          resumeUrl,
          recommendationLetterUrl,
          emergencyContactName: values.emergencyContactName.trim(),
          emergencyContactRelationship: values.emergencyContactRelationship.trim(),
          emergencyContactPhone: values.emergencyContactPhone.trim(),
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
        title="Your information has been submitted"
        message="Your Principal registration is waiting for School Admin approval."
      />
    );
  }

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

            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
              {registrationSteps.map((step, index) => {
                const StepIcon = step.icon;

                return (
                  <button
                    key={step.label}
                    type="button"
                    className={cn(
                      "inline-flex min-w-max items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition",
                      index === currentStep
                        ? "aqua-button text-primary-foreground shadow-[0_14px_32px_hsl(var(--primary)/0.24)]"
                        : "glass-panel text-muted-foreground hover:text-primary",
                    )}
                    onClick={() => setCurrentStep(index)}
                  >
                    <StepIcon className="h-4 w-4" />
                    <span>
                      {index + 1}. {step.label}
                    </span>
                  </button>
                );
              })}
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
                value={values.fullNameMm}
                onChange={(value) => updateValue("fullNameMm", sanitizeMyanmarName(value))}
              />
              <TextInput
                label="English name"
                value={values.fullNameEn}
                onChange={(value) => updateValue("fullNameEn", sanitizeEnglishName(value))}
              />
              <TextInput label="Email address" value={invite.request.email} readOnly />
              <TextInput
                label="Phone"
                value={values.phone}
                onChange={(value) => updateValue("phone", value)}
              />
              <TextInput
                label="Date of birth"
                type="date"
                value={values.dateOfBirth}
                onChange={(value) => updateValue("dateOfBirth", value)}
              />
              <SelectInput
                label="Gender"
                value={values.gender}
                onChange={(value) => updateValue("gender", value)}
                options={["Male", "Female", "Other"]}
              />
              <InfoBox icon={Info} title="NRC information" className="md:col-span-2">
                Select the NRC state and township from the database, then enter only the last 6
                digits.
              </InfoBox>
              <SelectInput
                label="NRC State/Region"
                value={values.nrcState}
                onChange={(value) => {
                  updateValue("nrcState", value);
                  updateValue("nrcTownship", "");
                }}
                options={regions.map((region) => ({
                  value: String(region.id),
                  label: region.name,
                }))}
              />
              <SelectInput
                label="NRC Township"
                value={values.nrcTownship}
                onChange={(value) => updateValue("nrcTownship", value)}
                disabled={!values.nrcState}
                options={nrcTownships.map((township) => ({
                  value: township.name,
                  label: `${township.name}${township.nrc_code ? ` (${township.nrc_code})` : ""}`,
                }))}
              />
              <SelectInput
                label="NRC Type"
                value={values.nrcType}
                onChange={(value) => updateValue("nrcType", value)}
                options={nrcTypeOptions}
              />
              <TextInput
                label="NRC last 6 digits"
                value={values.nrcNumberRaw}
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
                  className="aqua-input min-h-28 w-full resize-none rounded-2xl px-4 py-3.5 text-sm outline-none transition-all focus:ring-2 ring-primary/20"
                  value={values.residentialAddress}
                  onChange={(event) => updateValue("residentialAddress", event.target.value)}
                />
              </label>
            </FormSection>
          )}

          {currentStep === 1 && (
            <FormSection
              icon={Briefcase}
              title="Professional Information"
              description="Share your education and leadership background for review."
            >
              <TextInput
                label="Highest education"
                value={values.highestEducation}
                onChange={(value) => updateValue("highestEducation", value)}
              />
              <TextInput
                label="Major"
                value={values.major}
                onChange={(value) => updateValue("major", value)}
              />
              <TextInput
                label="Teaching experience years"
                type="number"
                value={values.yearsOfTeachingExperience}
                onChange={(value) => updateValue("yearsOfTeachingExperience", value)}
              />
              <TextInput
                label="Management experience years"
                type="number"
                value={values.yearsOfManagementExperience}
                onChange={(value) => updateValue("yearsOfManagementExperience", value)}
              />
              <TextInput
                label="Previous school"
                value={values.previousSchool}
                onChange={(value) => updateValue("previousSchool", value)}
              />
              <TextInput
                label="Current position"
                value={values.currentPosition}
                onChange={(value) => updateValue("currentPosition", value)}
              />
            </FormSection>
          )}

          {currentStep === 2 && (
            <FormSection
              icon={FileText}
              title="Documents"
              description="Upload clear documents so the School Admin can review your profile quickly."
            >
              <InfoBox icon={Info} title="Required document notice" className="md:col-span-2">
                NRC front and NRC back are required. Other documents are optional but helpful for
                verification.
              </InfoBox>
              {(
                [
                  "profilePhoto",
                  "nrcFront",
                  "nrcBack",
                  "degreeCertificate",
                  "teachingLicense",
                  "appointmentLetter",
                  "resume",
                  "recommendationLetter",
                ] as FileKey[]
              ).map((key) => (
                <FileInput
                  key={key}
                  label={`${fileLabels[key]}${key === "nrcFront" || key === "nrcBack" ? " *" : ""}`}
                  file={files[key]}
                  onChange={(file) => setFiles((current) => ({ ...current, [key]: file }))}
                />
              ))}
            </FormSection>
          )}

          {currentStep === 3 && (
            <>
              <FormSection
                icon={ShieldCheck}
                title="Emergency Contact"
                description="Add a trusted contact who can be reached if the school needs urgent confirmation."
              >
                <TextInput
                  label="Name"
                  value={values.emergencyContactName}
                  onChange={(value) => updateValue("emergencyContactName", value)}
                />
                <TextInput
                  label="Relationship"
                  value={values.emergencyContactRelationship}
                  onChange={(value) => updateValue("emergencyContactRelationship", value)}
                />
                <TextInput
                  label="Phone"
                  value={values.emergencyContactPhone}
                  onChange={(value) => updateValue("emergencyContactPhone", value)}
                />
              </FormSection>

              <label className="glass-panel flex items-start gap-3 rounded-2xl p-4 text-sm leading-6">
                <input
                  type="checkbox"
                  checked={values.declarationAccepted}
                  onChange={(event) => updateValue("declarationAccepted", event.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <span>I confirm that the information provided is true and correct.</span>
              </label>
            </>
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
              Back
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
                ? "Submit Principal Information"
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
}: {
  icon: ReactNode;
  title: string;
  message?: string;
}) {
  return (
    <main className="aqua-page grid min-h-screen place-items-center px-4 py-10">
      <div className="aqua-card max-w-lg p-8 text-center">
        <div className="theme-icon-tile-strong mx-auto mb-4 h-14 w-14 rounded-2xl">{icon}</div>
        <h1 className="text-2xl font-bold glow-text">{title}</h1>
        {message && <p className="mt-3 text-sm leading-7 text-muted-foreground">{message}</p>}
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

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
  inputMode,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  readOnly?: boolean;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="ml-1 text-sm font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        className={cn(
          "aqua-input w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition-all focus:ring-2 ring-primary/20",
          readOnly && "cursor-not-allowed bg-muted/20 text-muted-foreground",
        )}
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: Array<string | { value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const dropdownOptions = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );

  return (
    <div className="space-y-2">
      <span className="ml-1 text-sm font-semibold">{label}</span>
      <CustomDropdown
        value={value}
        options={dropdownOptions}
        placeholder="Select"
        disabled={disabled}
        className="w-full rounded-2xl px-4 py-3.5 text-sm"
        onChange={onChange}
      />
    </div>
  );
}

function FileInput({
  label,
  file,
  onChange,
}: {
  label: string;
  file?: File;
  onChange: (file: File | undefined) => void;
}) {
  return (
    <div className="glass-panel rounded-3xl border-2 border-dashed border-primary/20 p-5 transition hover:border-primary/45">
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
              className="hidden"
              onChange={(event) => {
                onChange(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
