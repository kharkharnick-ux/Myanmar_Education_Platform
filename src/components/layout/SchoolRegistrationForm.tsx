import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Globe,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Phone,
  School,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  sanitizeFileName,
  type SchoolAdminPersonalDraft,
  type SchoolAdminPersonalFileDraft,
} from "@/lib/school-admin-application";
import { GlassCard } from "@/components/ui-kit/GlassCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomDropdown } from "./SchoolAdminRegistrationForm";

type SchoolType = "private" | "public";

type NormalizedSchoolOwnership = "private" | "public";
type NormalizedSchoolLevel = "primary" | "middle" | "high";
type PrivateDocumentKey =
  | "licenseDocument"
  | "buildingDocument"
  | "landDocument"
  | "ownerApplicationDocument";

interface SchoolRegistrationFormData {
  schoolName: string;
  schoolType: SchoolType | "";
  schoolLevel: string;
  gradeFrom: string;
  gradeTo: string;
  region: string;
  shanArea: string;
  township: string;
  address: string;
  latitude: string;
  longitude: string;
  licenseDocument?: FileList;
  buildingDocument?: FileList;
  landDocument?: FileList;
  ownerApplicationDocument?: FileList;
  schoolPhone: string;
  schoolEmail: string;
}

interface RegionOption {
  id: number | string;
  name: string;
}

interface TownshipOption {
  id: number | string;
  region_id?: number | string;
  name: string;
  shan_area?: "north" | "south" | "east" | null;
}

const schoolTypeOptions = [
  { value: "private", label: "ကိုယ်ပိုင်ကျောင်း" },
  { value: "public", label: "အစိုးရကျောင်း" },
];

const schoolLevelOptions = [
  { value: "Primary", label: "Primary" },
  { value: "Middle", label: "Middle" },
  { value: "High", label: "High" },
];

const gradeOptions = ["KG", ...Array.from({ length: 12 }, (_, index) => `G-${index + 1}`)].map(
  (grade) => ({ value: grade, label: grade }),
);

const shanAreaOptions = [
  { value: "south", label: "တောင်ပိုင်း" },
  { value: "north", label: "မြောက်ပိုင်း" },
  { value: "east", label: "အရှေ့ပိုင်း" },
];

const privateDocumentConfigs: Array<{
  key: PrivateDocumentKey;
  fieldName: keyof Pick<
    SchoolRegistrationFormData,
    "licenseDocument" | "buildingDocument" | "landDocument" | "ownerApplicationDocument"
  >;
  title: string;
}> = [
  {
    key: "licenseDocument",
    fieldName: "licenseDocument",
    title: "ကိုယ်ပိုင်ကျောင်း တည်ထောင်ခွင့် / မှတ်ပုံတင်လက်မှတ်",
  },
  {
    key: "buildingDocument",
    fieldName: "buildingDocument",
    title: "ကျောင်းအဆောက်အဦး ပိုင်ဆိုင်မှု / ငှားရမ်းမှု အထောက်အထား",
  },
  {
    key: "landDocument",
    fieldName: "landDocument",
    title: "မြေပိုင်ဆိုင်မှု / အသုံးပြုခွင့် အထောက်အထား",
  },
  {
    key: "ownerApplicationDocument",
    fieldName: "ownerApplicationDocument",
    title: "ကျောင်းပိုင်ရှင် / တာဝန်ခံ လက်မှတ်ထိုးထားသော လျှောက်လွှာ",
  },
];

const defaultValues: SchoolRegistrationFormData = {
  schoolName: "",
  schoolType: "",
  schoolLevel: "",
  gradeFrom: "",
  gradeTo: "",
  region: "",
  shanArea: "",
  township: "",
  address: "",
  latitude: "",
  longitude: "",
  schoolPhone: "",
  schoolEmail: "",
};

const gradeIndex = (grade: string) => gradeOptions.findIndex((option) => option.value === grade);
const primaryMaxGradeIndex = gradeIndex("G-5");
const middleMinGradeIndex = gradeIndex("G-6");
const middleMaxGradeIndex = gradeIndex("G-9");
const highMinGradeIndex = gradeIndex("G-10");
const highMaxGradeIndex = gradeIndex("G-12");

const normalizeSchoolType = (schoolType: SchoolType | ""): NormalizedSchoolOwnership =>
  schoolType === "private" ? "private" : "public";

const normalizeSchoolLevel = (level: string): NormalizedSchoolLevel => {
  if (level === "Primary") return "primary";
  if (level === "Middle") return "middle";
  return "high";
};

const validateGradeRangeForLevel = (level: NormalizedSchoolLevel, gradeFrom: string, gradeTo: string) => {
  const fromIndex = gradeIndex(gradeFrom);
  const toIndex = gradeIndex(gradeTo);

  if (fromIndex < 0 || toIndex < 0 || toIndex < fromIndex) return false;
  if (level === "primary") return fromIndex <= primaryMaxGradeIndex && toIndex <= primaryMaxGradeIndex;
  if (level === "middle") return fromIndex <= middleMaxGradeIndex && toIndex >= middleMinGradeIndex && toIndex <= middleMaxGradeIndex;
  return toIndex >= highMinGradeIndex && toIndex <= highMaxGradeIndex;
};

const getGradeOptionsForLevel = (
  level: string,
  type: "from" | "to",
  selectedGradeFrom = "",
) => {
  if (!level) return [];

  const normalizedLevel = normalizeSchoolLevel(level);
  const selectedFromIndex = gradeIndex(selectedGradeFrom);

  return gradeOptions.filter((option) => {
    const index = gradeIndex(option.value);

    if (normalizedLevel === "primary") {
      return index <= primaryMaxGradeIndex;
    }

    if (normalizedLevel === "middle") {
      if (type === "from") return index <= middleMaxGradeIndex;
      return (
        index >= middleMinGradeIndex &&
        index <= middleMaxGradeIndex &&
        (selectedFromIndex < 0 || index >= selectedFromIndex)
      );
    }

    if (type === "from") return index <= highMaxGradeIndex;
    return (
      index >= highMinGradeIndex &&
      index <= highMaxGradeIndex &&
      (selectedFromIndex < 0 || index >= selectedFromIndex)
    );
  });
};

const isShanRegion = (region?: RegionOption, regionId?: string) => {
  const name = region?.name || "";
  return name.includes("ရှမ်း") || /shan/i.test(name) || Number(regionId) === 13;
};

export function SchoolRegistrationForm({
  personalDraft,
  personalFiles,
  onBack,
}: {
  personalDraft?: SchoolAdminPersonalDraft | null;
  personalFiles?: SchoolAdminPersonalFileDraft | null;
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  const privateDocumentInputRefs = useRef<Record<PrivateDocumentKey, HTMLInputElement | null>>({
    licenseDocument: null,
    buildingDocument: null,
    landDocument: null,
    ownerApplicationDocument: null,
  });
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [townships, setTownships] = useState<TownshipOption[]>([]);
  const [privateDocumentFiles, setPrivateDocumentFiles] = useState<Record<PrivateDocumentKey, File | null>>({
    licenseDocument: null,
    buildingDocument: null,
    landDocument: null,
    ownerApplicationDocument: null,
  });
  const [mapOpen, setMapOpen] = useState(false);
  const [mapSearch, setMapSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successApplication, setSuccessApplication] = useState<{
    id: string;
    submittedAt: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<SchoolRegistrationFormData>({
    defaultValues: {
      ...defaultValues,
      licenseDocument: undefined,
      buildingDocument: undefined,
      landDocument: undefined,
      ownerApplicationDocument: undefined,
    },
  });

  const watchedSchoolType = useWatch({ control, name: "schoolType" }) || "";
  const watchedSchoolLevel = useWatch({ control, name: "schoolLevel" }) || "";
  const watchedGradeFrom = useWatch({ control, name: "gradeFrom" }) || "";
  const watchedGradeTo = useWatch({ control, name: "gradeTo" }) || "";
  const watchedRegion = useWatch({ control, name: "region" }) || "";
  const watchedShanArea = useWatch({ control, name: "shanArea" }) || "";
  const watchedTownship = useWatch({ control, name: "township" }) || "";
  const watchedLatitude = useWatch({ control, name: "latitude" }) || "";
  const watchedLongitude = useWatch({ control, name: "longitude" }) || "";

  const selectedRegion = useMemo(
    () => regions.find((region) => String(region.id) === watchedRegion),
    [regions, watchedRegion],
  );
  const selectedTownship = useMemo(
    () => townships.find((township) => String(township.id) === watchedTownship),
    [townships, watchedTownship],
  );
  const selectedRegionIsShan = isShanRegion(selectedRegion, watchedRegion);

  const regionOptions = useMemo(
    () => regions.map((region) => ({ value: String(region.id), label: region.name })),
    [regions],
  );
  const townshipOptions = useMemo(
    () => townships.map((township) => ({ value: String(township.id), label: township.name })),
    [townships],
  );
  const gradeFromOptions = useMemo(
    () => getGradeOptionsForLevel(watchedSchoolLevel, "from"),
    [watchedSchoolLevel],
  );
  const gradeToOptions = useMemo(
    () => getGradeOptionsForLevel(watchedSchoolLevel, "to", watchedGradeFrom),
    [watchedSchoolLevel, watchedGradeFrom],
  );
  const normalizedWatchedSchoolLevel = watchedSchoolLevel ? normalizeSchoolLevel(watchedSchoolLevel) : null;
  const schoolLevelSummary =
    watchedSchoolLevel && watchedGradeFrom && watchedGradeTo
      ? `${watchedSchoolLevel}: ${watchedGradeFrom} → ${watchedGradeTo}`
      : watchedSchoolLevel
        ? `${watchedSchoolLevel}: Grade range ရွေးချယ်ရန်`
        : "School Level ကို အရင်ရွေးချယ်ရန်";
  const composedAddressPreview = getValues("address")?.trim() || "";
  const hasMap = Boolean(watchedLatitude && watchedLongitude);

  useEffect(() => {
    const fetchRegions = async () => {
      const { data, error } = await supabase
        .from("regions")
        .select("id, name")
        .order("id", { ascending: true });

      if (error) {
        console.error("Error fetching regions:", error);
        return;
      }

      setRegions(data || []);
    };

    fetchRegions();
  }, []);

  useEffect(() => {
    if (!personalDraft) {
      setSubmitError("Step 1 ကို အရင်ဖြည့်သွင်းရန် လိုအပ်ပါသည်။");
    }
  }, [personalDraft]);

  useEffect(() => {
    const fetchTownships = async () => {
      if (!watchedRegion) {
        setTownships([]);
        setValue("township", "");
        setValue("shanArea", "");
        return;
      }

      const regionId = Number(watchedRegion);
      if (!Number.isInteger(regionId)) {
        setTownships([]);
        setValue("township", "");
        return;
      }

      if (selectedRegionIsShan && !watchedShanArea) {
        setTownships([]);
        setValue("township", "");
        return;
      }

      let townshipsQuery = supabase
        .from("townships")
        .select("id, region_id, name, shan_area")
        .eq("region_id", regionId);

      if (selectedRegionIsShan) {
        townshipsQuery = townshipsQuery.eq("shan_area", watchedShanArea);
      }

      const { data, error } = await townshipsQuery.order("name", { ascending: true });

      if (error) {
        console.error("Error fetching school townships:", error);
        setTownships([]);
        return;
      }

      setTownships(data || []);
    };

    fetchTownships();
  }, [watchedRegion, watchedShanArea, selectedRegionIsShan, setValue]);

  const validatePrivateDocument = (files: FileList | undefined, title: string) => {
      if (watchedSchoolType !== "private") return true;
      const file = files?.[0];
      if (!file) return `${title} PDF တင်ရန် လိုအပ်ပါသည်။`;
      if (file.type !== "application/pdf") return "PDF ဖိုင်သာ တင်နိုင်ပါသည်။";
      if (file.size > 20 * 1024 * 1024) return "PDF ဖိုင်အရွယ်အစား 20 MB ထက် မကျော်ရပါ။";
      return true;
  };

  const privateDocumentRegistrations = privateDocumentConfigs.reduce(
    (registrations, config) => ({
      ...registrations,
      [config.key]: register(config.fieldName, {
        validate: (files) => validatePrivateDocument(files, config.title),
      }),
    }),
    {} as Record<PrivateDocumentKey, ReturnType<typeof register>>,
  );

  const applyMapSelection = () => {
    const values = getValues();
    if (!mapSearch.trim()) {
      setMapSearch(values.address);
    }

    if (!getValues("latitude")) setValue("latitude", "21.9162", { shouldDirty: true });
    if (!getValues("longitude")) setValue("longitude", "95.9560", { shouldDirty: true });
    setMapOpen(false);
  };

  const clearPrivateDocumentFile = (key: PrivateDocumentKey, fieldName: keyof SchoolRegistrationFormData) => {
    setPrivateDocumentFiles((current) => ({ ...current, [key]: null }));
    setValue(fieldName, undefined, { shouldValidate: true, shouldDirty: true });
    if (privateDocumentInputRefs.current[key]) privateDocumentInputRefs.current[key]!.value = "";
  };

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    return data.path;
  };

  const onSubmit = async (data: SchoolRegistrationFormData) => {
    try {
      setIsSubmitting(true);
      setSubmitError("");

      const personalData = personalDraft;
      if (!personalData) {
        throw new Error("Step 1 ကို အရင်ဖြည့်သွင်းရန် လိုအပ်ပါသည်။");
      }

      if (!data.schoolLevel) {
        throw new Error("School Level ရွေးချယ်ရန် လိုအပ်ပါသည်။");
      }

      if (!data.gradeFrom || !data.gradeTo) {
        throw new Error("Grade From နှင့် Grade To ရွေးချယ်ရန် လိုအပ်ပါသည်။");
      }

      if (gradeIndex(data.gradeTo) < gradeIndex(data.gradeFrom)) {
        throw new Error("To Grade သည် From Grade ထက် ကြီးသော သို့မဟုတ် တူညီသော အဆင့် ဖြစ်ရပါမည်။");
      }

      const schoolOwnership = normalizeSchoolType(data.schoolType);
      const selectedGrades = { gradeFrom: data.gradeFrom, gradeTo: data.gradeTo };
      const schoolLevel = normalizeSchoolLevel(data.schoolLevel);

      if (!validateGradeRangeForLevel(schoolLevel, selectedGrades.gradeFrom, selectedGrades.gradeTo)) {
        throw new Error("ရွေးချယ်ထားသော School Level နှင့် Grade Range မကိုက်ညီပါ။");
      }

      const applicationId = crypto.randomUUID();
      const timestamp = Date.now();
      const applicationFolder = `registration-requests/${applicationId}`;

      if (!personalFiles?.nrcFrontFile || !personalFiles?.nrcBackFile) {
        throw new Error("Step 1 NRC ဓါတ်ပုံများ မရှိပါ။ Step 1 ကို ပြန်ဖြည့်သွင်းပါ။");
      }

      const [nrcFrontPath, nrcBackPath] = await Promise.all([
        uploadFile(
          personalFiles.nrcFrontFile,
          "application-nrc-docs",
          `${applicationFolder}/nrc-front-${timestamp}-${sanitizeFileName(personalFiles.nrcFrontFile.name)}`,
        ),
        uploadFile(
          personalFiles.nrcBackFile,
          "application-nrc-docs",
          `${applicationFolder}/nrc-back-${timestamp}-${sanitizeFileName(personalFiles.nrcBackFile.name)}`,
        ),
      ]);

      const privateDocumentPaths: Record<PrivateDocumentKey, string | null> = {
        licenseDocument: null,
        buildingDocument: null,
        landDocument: null,
        ownerApplicationDocument: null,
      };

      if (data.schoolType === "private") {
        for (const config of privateDocumentConfigs) {
          const file = data[config.fieldName]?.[0];
          if (!file) {
            throw new Error(`${config.title} PDF တင်ရန် လိုအပ်ပါသည်။`);
          }

          privateDocumentPaths[config.key] = await uploadFile(
            file,
            "application-school-docs",
            `${applicationFolder}/${config.key}-${timestamp}-${sanitizeFileName(file.name)}`,
          );
        }
      }

      const { error: registrationError } = await supabase
        .from("registration_requests")
        .insert({
          id: applicationId,
          request_type: "school_admin",
          status: "pending",

          full_name_mm: personalData.fullNameMm,
          full_name_en: personalData.fullNameEn || null,
          email: personalData.email.trim().toLowerCase(),
          phone: personalData.phone,
          date_of_birth: personalData.dob || null,
          gender: personalData.gender || null,
          nrc_number: personalData.nrcNumber,
          residential_address: personalData.residentialAddress,
          state_region_id: personalData.stateRegionId,
          township_id: personalData.townshipId,
          nrc_front_url: nrcFrontPath,
          nrc_back_url: nrcBackPath,

          school_name: data.schoolName,
          school_type: schoolOwnership,
          school_level: schoolLevel,
          grade_from: selectedGrades.gradeFrom,
          grade_to: selectedGrades.gradeTo,
          region_id: Number(data.region),
          school_township_id: Number(data.township),
          school_address: data.address,
          school_phone: data.schoolPhone || null,
          school_email: data.schoolEmail || null,
          latitude: data.latitude ? Number(data.latitude) : null,
          longitude: data.longitude ? Number(data.longitude) : null,

          license_document_url: privateDocumentPaths.licenseDocument,
          building_document_url: privateDocumentPaths.buildingDocument,
          land_document_url: privateDocumentPaths.landDocument,
          owner_application_document_url: privateDocumentPaths.ownerApplicationDocument,

          approved_profile_id: null,
          approved_school_id: null,
        });

      if (registrationError) throw registrationError;

      setSuccessApplication({
        id: applicationId,
        submittedAt: new Date().toLocaleString("my-MM", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      });
    } catch (err: unknown) {
      console.error("School registration submit error:", err);
      setSubmitError(err instanceof Error ? err.message : "ကျောင်းမှတ်ပုံတင်ရာတွင် အမှားအယွင်းရှိပါသည်။");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="aqua-section-title mb-2 text-xs uppercase tracking-[0.26em]">Step 2 / 2</p>
          <h1 className="text-2xl font-bold glow-text sm:text-3xl">ကျောင်းအချက်အလက် မှတ်ပုံတင်ခြင်း</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            ကျောင်းအမည်၊ တည်နေရာ၊ အတန်းအဆင့်နှင့် လိုအပ်သော စာရွက်စာတမ်းများကို ဖြည့်သွင်းပါ။
          </p>
        </div>
        <div className="glass-panel rounded-2xl px-4 py-3 text-right">
          <span className="block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Progress</span>
          <div className="mt-2 flex gap-1">
            <div className="h-1.5 w-14 rounded-full bg-primary/55" />
            <div className="h-1.5 w-14 rounded-full bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.65)]" />
          </div>
          <span className="mt-1 block text-[10px] text-muted-foreground">အဆင့် ၂ / ၂</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <GlassCard className="space-y-5 rounded-[2rem] p-5 sm:p-6">
          <SectionTitle icon={School} title="School Basic Information" />
          <div className="grid grid-cols-1 gap-5">
            <Field label="ကျောင်းအမည်" error={errors.schoolName?.message}>
              <input
                {...register("schoolName", { required: "ကျောင်းအမည် ဖြည့်သွင်းရန် လိုအပ်ပါသည်။" })}
                className="aqua-input w-full rounded-2xl px-4 py-3"
                placeholder="ကျောင်းအမည်"
              />
            </Field>
          </div>
          <Field label="School Type" error={errors.schoolType?.message}>
            <input type="hidden" {...register("schoolType", { required: "School Type ရွေးချယ်ရန် လိုအပ်ပါသည်။" })} />
            <CustomDropdown
              value={watchedSchoolType}
              options={schoolTypeOptions}
              className="w-full rounded-2xl px-4 py-3"
              onChange={(value) =>
                setValue("schoolType", value as SchoolType, { shouldDirty: true, shouldValidate: true })
              }
            />
          </Field>
        </GlassCard>

        <GlassCard className="space-y-5 rounded-[2rem] p-5 sm:p-6">
          <SectionTitle icon={GraduationCap} title="School Level" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <Field label="School Level" error={errors.schoolLevel?.message}>
              <input
                type="hidden"
                {...register("schoolLevel", {
                  required: "School Level ရွေးချယ်ရန် လိုအပ်ပါသည်။",
                })}
              />
              <CustomDropdown
                value={watchedSchoolLevel}
                options={schoolLevelOptions}
                className="w-full rounded-2xl px-4 py-3"
                onChange={(value) => {
                  setValue("schoolLevel", value, { shouldDirty: true, shouldValidate: true });
                  setValue("gradeFrom", "", { shouldDirty: true, shouldValidate: true });
                  setValue("gradeTo", "", { shouldDirty: true, shouldValidate: true });
                }}
              />
            </Field>
            <Field label="From Grade" error={errors.gradeFrom?.message}>
              <input
                type="hidden"
                {...register("gradeFrom", {
                  validate: (value) => {
                    if (!watchedSchoolLevel) return "School Level ကို အရင်ရွေးချယ်ရန် လိုအပ်ပါသည်။";
                    if (!value) return "From Grade ရွေးချယ်ရန် လိုအပ်ပါသည်။";
                    return (
                      gradeFromOptions.some((option) => option.value === value) ||
                      "ရွေးချယ်ထားသော School Level နှင့် From Grade မကိုက်ညီပါ။"
                    );
                  },
                })}
              />
              <CustomDropdown
                value={watchedGradeFrom}
                options={gradeFromOptions}
                className="w-full rounded-2xl px-4 py-3"
                disabled={!watchedSchoolLevel}
                onChange={(value) => {
                  setValue("gradeFrom", value, { shouldDirty: true, shouldValidate: true });
                  setValue("gradeTo", "", { shouldDirty: true, shouldValidate: true });
                }}
              />
            </Field>
            <Field label="To Grade" error={errors.gradeTo?.message}>
              <input
                type="hidden"
                {...register("gradeTo", {
                  validate: (value) => {
                    if (!watchedSchoolLevel) return "School Level ကို အရင်ရွေးချယ်ရန် လိုအပ်ပါသည်။";
                    if (!watchedGradeFrom) return "From Grade ကို အရင်ရွေးချယ်ရန် လိုအပ်ပါသည်။";
                    if (!value) return "To Grade ရွေးချယ်ရန် လိုအပ်ပါသည်။";
                    return (
                      gradeToOptions.some((option) => option.value === value) ||
                      "To Grade သည် From Grade ထက် ကြီးသော သို့မဟုတ် တူညီပြီး School Level အတွင်းရှိရပါမည်။"
                    );
                  },
                })}
              />
              <CustomDropdown
                value={watchedGradeTo}
                options={gradeToOptions}
                className="w-full rounded-2xl px-4 py-3"
                disabled={!watchedSchoolLevel || !watchedGradeFrom}
                onChange={(value) => setValue("gradeTo", value, { shouldDirty: true, shouldValidate: true })}
              />
            </Field>
          </div>
          <div className="glass-panel flex items-center justify-between rounded-2xl px-4 py-3">
            <span className="text-xs text-muted-foreground">Summary</span>
            <span className="text-sm font-bold text-primary">{schoolLevelSummary}</span>
          </div>
        </GlassCard>

        <GlassCard className="space-y-5 rounded-[2rem] p-5 sm:p-6">
          <SectionTitle icon={MapPin} title="School Location" />
          <div className={cn("grid grid-cols-1 gap-5", selectedRegionIsShan ? "lg:grid-cols-3" : "md:grid-cols-2")}>
            <Field label="State / Region" error={errors.region?.message}>
              <input type="hidden" {...register("region", { required: "State / Region ရွေးချယ်ရန် လိုအပ်ပါသည်။" })} />
              <CustomDropdown
                value={watchedRegion}
                options={regionOptions}
                className="w-full rounded-2xl px-4 py-3"
                onChange={(value) => {
                  setValue("region", value, { shouldDirty: true, shouldValidate: true });
                  setValue("shanArea", "", { shouldDirty: true, shouldValidate: true });
                  setValue("township", "", { shouldDirty: true, shouldValidate: true });
                  setTownships([]);
                }}
              />
            </Field>
            {selectedRegionIsShan && (
              <Field label="ရှမ်းပြည်နယ် ဒေသ" error={errors.shanArea?.message}>
                <input
                  type="hidden"
                  {...register("shanArea", {
                    validate: (value) =>
                      !selectedRegionIsShan || Boolean(value) || "ရှမ်းပြည်နယ် ဒေသ ရွေးချယ်ရန် လိုအပ်ပါသည်။",
                  })}
                />
                <CustomDropdown
                  value={watchedShanArea}
                  options={shanAreaOptions}
                  className="w-full rounded-2xl px-4 py-3"
                  onChange={(value) => {
                    setValue("shanArea", value, { shouldDirty: true, shouldValidate: true });
                    setValue("township", "", { shouldDirty: true, shouldValidate: true });
                    setTownships([]);
                  }}
                />
              </Field>
            )}
            <Field label="Township" error={errors.township?.message}>
              <input type="hidden" {...register("township", { required: "Township ရွေးချယ်ရန် လိုအပ်ပါသည်။" })} />
              <CustomDropdown
                value={watchedTownship}
                options={townshipOptions}
                className="w-full rounded-2xl px-4 py-3"
                disabled={!watchedRegion || (selectedRegionIsShan && !watchedShanArea)}
                onChange={(value) => setValue("township", value, { shouldDirty: true, shouldValidate: true })}
              />
            </Field>
          </div>
          <Field label="Detailed Address" error={errors.address?.message}>
            <textarea
              {...register("address", { required: "Detailed Address ဖြည့်သွင်းရန် လိုအပ်ပါသည်။" })}
              className="aqua-input min-h-28 w-full resize-none rounded-2xl px-4 py-3"
              placeholder="အိမ်အမှတ် / လမ်း / ရပ်ကွက် / အနီးအနားအမှတ်အသား"
            />
          </Field>
          <div className="glass-panel rounded-3xl p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold">ကျောင်းတည်နေရာ</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {composedAddressPreview || selectedTownship?.name || "Address Text *"}
                </p>
                {hasMap && (
                  <p className="mt-2 text-xs font-semibold text-primary">
                    Lat {watchedLatitude}, Lng {watchedLongitude}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="aqua-button inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-primary-foreground"
                onClick={() => {
                  setMapSearch(composedAddressPreview);
                  setMapOpen(true);
                }}
              >
                <Navigation className="h-4 w-4" /> Set Map
              </button>
            </div>
            {hasMap && (
              <div className="mt-4 h-28 rounded-2xl border border-primary/20 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.24),transparent_38%),linear-gradient(135deg,hsl(var(--primary)/0.08),hsl(var(--accent)/0.14))]" />
            )}
          </div>
        </GlassCard>

        {watchedSchoolType === "private" && (
          <GlassCard className="space-y-5 rounded-[2rem] p-5 sm:p-6">
            <SectionTitle icon={ShieldCheck} title="Private School Documents" />
            <div className="space-y-4">
              {privateDocumentConfigs.map((config) => {
                const registration = privateDocumentRegistrations[config.key];
                const error = errors[config.fieldName]?.message;

                return (
                  <div key={config.key} className="space-y-2">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      {...registration}
                      ref={(element) => {
                        registration.ref(element);
                        privateDocumentInputRefs.current[config.key] = element;
                      }}
                      onChange={(event) => {
                        registration.onChange(event);
                        setPrivateDocumentFiles((current) => ({
                          ...current,
                          [config.key]: event.target.files?.[0] || null,
                        }));
                      }}
                    />
                    <UploadBox
                      title={config.title}
                      description="PDF only, maximum 20 MB"
                      icon={FileText}
                      fileName={privateDocumentFiles[config.key]?.name}
                      onChoose={() => privateDocumentInputRefs.current[config.key]?.click()}
                      onRemove={() => clearPrivateDocumentFile(config.key, config.fieldName)}
                    />
                    {error && <p className="text-xs text-destructive">{error}</p>}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        <GlassCard className="space-y-5 rounded-[2rem] p-5 sm:p-6">
          <SectionTitle icon={User} title="School Administrator" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <ReadOnlyInfo icon={User} label="Admin Name" value={personalDraft?.fullNameMm || "Step 1 data မရှိသေးပါ"} />
            <ReadOnlyInfo icon={Mail} label="Email" value={personalDraft?.email || "-"} />
            <ReadOnlyInfo icon={Phone} label="Phone" value={personalDraft?.phone || "-"} />
          </div>
        </GlassCard>

        <GlassCard className="space-y-5 rounded-[2rem] p-5 sm:p-6">
          <SectionTitle icon={Globe} title="Additional Information" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="School Phone">
              <input {...register("schoolPhone")} className="aqua-input w-full rounded-2xl px-4 py-3" />
            </Field>
            <Field label="School Email" error={errors.schoolEmail?.message}>
              <input
                {...register("schoolEmail", {
                  pattern: { value: /^\S+@\S+$/i, message: "မှန်ကန်သော Email ဖြစ်ရပါမည်။" },
                })}
                className="aqua-input w-full rounded-2xl px-4 py-3"
              />
            </Field>
          </div>
        </GlassCard>

        {submitError && (
          <div className="glass-panel rounded-2xl border border-destructive/30 p-4 text-sm text-destructive">
            {submitError}
          </div>
        )}

        <div className="flex flex-col gap-4 pb-12 sm:flex-row">
          {onBack ? (
            <button
              type="button"
              className="glass-panel flex flex-1 items-center justify-center gap-2 rounded-2xl p-4 text-sm font-bold transition-all hover:bg-accent/35 hover:glow-ring"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <Link
              to="/register/school-admin"
              className="glass-panel flex flex-1 items-center justify-center gap-2 rounded-2xl p-4 text-sm font-bold transition-all hover:bg-accent/35 hover:glow-ring"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="aqua-button flex flex-[2] items-center justify-center gap-2 rounded-2xl p-4 text-sm font-bold text-primary-foreground transition-all disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> ခဏစောင့်ပါ...
              </>
            ) : (
              <>
                Submit School Registration <CheckCircle2 className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>ကျောင်းတည်နေရာ သတ်မှတ်ခြင်း</DialogTitle>
            <DialogDescription>
              လိပ်စာရှာဖွေပါ၊ သို့မဟုတ် map area ထဲတွင် marker နေရာရွေးပါ။ Map selection သည် optional ဖြစ်ပါသည်။
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={mapSearch}
                onChange={(event) => setMapSearch(event.target.value)}
                className="aqua-input w-full rounded-2xl py-3 pl-11 pr-4"
                placeholder="Search address"
              />
            </div>
            <div
              className="relative h-72 overflow-hidden rounded-3xl border border-primary/25 bg-[radial-gradient(circle_at_50%_45%,hsl(var(--primary)/0.32),transparent_34%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--accent)/0.45))]"
              onClick={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                const x = (event.clientX - bounds.left) / bounds.width;
                const y = (event.clientY - bounds.top) / bounds.height;
                setValue("latitude", (28 - y * 18).toFixed(6), { shouldDirty: true });
                setValue("longitude", (92 + x * 12).toFixed(6), { shouldDirty: true });
              }}
            >
              <div className="absolute inset-x-8 top-1/3 h-px bg-primary/25" />
              <div className="absolute inset-y-8 left-1/2 w-px bg-primary/20" />
              <div className="absolute bottom-6 left-6 rounded-2xl bg-background/45 px-3 py-2 text-xs backdrop-blur">
                {watchedLatitude && watchedLongitude
                  ? `${watchedLatitude}, ${watchedLongitude}`
                  : "Click map to set marker"}
              </div>
              <MapPin
                className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-full text-primary drop-shadow-[0_0_18px_hsl(var(--primary)/0.8)]"
                draggable
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Latitude">
                <input {...register("latitude")} className="aqua-input w-full rounded-2xl px-4 py-3" />
              </Field>
              <Field label="Longitude">
                <input {...register("longitude")} className="aqua-input w-full rounded-2xl px-4 py-3" />
              </Field>
            </div>
          </div>
          <DialogFooter className="gap-3 sm:space-x-0">
            <button
              type="button"
              className="glass-panel rounded-2xl px-4 py-3 text-sm font-bold"
              onClick={() => setMapOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="aqua-button rounded-2xl px-4 py-3 text-sm font-bold text-primary-foreground"
              onClick={applyMapSelection}
            >
              Save Location
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(successApplication)} onOpenChange={() => undefined}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/15 text-primary shadow-[0_0_28px_hsl(var(--primary)/0.35)]">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <DialogTitle className="text-2xl font-bold glow-text">
              လျှောက်ထားမှု ပေးပို့ပြီးပါပြီ
            </DialogTitle>
            <DialogDescription className="text-base font-semibold text-primary">
              အတည်ပြုချက်ကို စောင့်ဆိုင်းနေသည်
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="glass-panel rounded-3xl p-5 text-center">
              <p className="text-sm leading-7 text-foreground">
                သင့်ကျောင်းမှတ်ပုံတင်လျှောက်ထားမှုကို Super Admin ထံ ပေးပို့ပြီးပါပြီ။
                လျှောက်ထားမှုများကို ပုံမှန်အားဖြင့် ၃ ရက်မှ ၇ ရက်အတွင်း စစ်ဆေးအတည်ပြုပေးပါမည်။
              </p>
              <p className="mt-4 text-sm font-semibold leading-7 text-muted-foreground">
                အတည်ပြုချက်မရမချင်း School Admin Dashboard သို့ ဝင်ရောက်နိုင်မည်မဟုတ်ပါ။
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="glass-panel rounded-2xl p-4">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Application ID
                </span>
                <p className="mt-2 break-all text-sm font-bold">{successApplication?.id}</p>
              </div>
              <div className="glass-panel rounded-2xl p-4">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Submitted Date
                </span>
                <p className="mt-2 text-sm font-bold">{successApplication?.submittedAt}</p>
              </div>
              <div className="glass-panel rounded-2xl p-4">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Status
                </span>
                <span className="mt-2 inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  Pending
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:space-x-0">
            <button
              type="button"
              className="glass-panel rounded-2xl px-4 py-3 text-sm font-bold transition-all hover:bg-accent/35"
              onClick={() => navigate({ to: "/" })}
            >
              ပင်မစာမျက်နှာသို့
            </button>
            <button
              type="button"
              className="glass-panel rounded-2xl px-4 py-3 text-sm font-bold transition-all hover:bg-accent/35"
              onClick={() => navigate({ to: "/register/school-admin/status" })}
            >
              ကျောင်းလျှောက်ထားချက်များ
            </button>
            <button
              type="button"
              className="aqua-button rounded-2xl px-4 py-3 text-sm font-bold text-primary-foreground"
              onClick={() =>
                successApplication &&
                navigate({
                  to: "/register/school-admin/pending",
                  search: { id: successApplication.id },
                })
              }
            >
              အခြေအနေကြည့်ရန်
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof School; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="glass-panel flex h-10 w-10 items-center justify-center rounded-2xl text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="aqua-section-title text-sm font-bold uppercase tracking-[0.22em]">{title}</h2>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="ml-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      {children}
      {error && <span className="ml-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function ReadOnlyInfo({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <p className="mt-1 truncate text-sm font-bold">{value}</p>
    </div>
  );
}

function UploadBox({
  title,
  description,
  icon: Icon,
  fileName,
  onChoose,
  onRemove,
}: {
  title: string;
  description: string;
  icon: typeof Upload;
  fileName?: string;
  onChoose: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="glass-panel rounded-3xl border-2 border-dashed border-primary/20 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-bold">{title}</h3>
            <p className="text-xs text-muted-foreground">{fileName || description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="aqua-button rounded-2xl px-4 py-2 text-sm font-bold text-primary-foreground"
            onClick={onChoose}
          >
            {fileName ? "Replace" : "Upload"}
          </button>
          {fileName && (
            <button
              type="button"
              className="glass-panel rounded-2xl px-3 py-2 text-destructive transition-all hover:bg-destructive/10"
              onClick={onRemove}
              aria-label="Remove file"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

