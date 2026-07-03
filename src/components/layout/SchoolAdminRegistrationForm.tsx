import { useState, useEffect, useMemo, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { createPortal } from "react-dom";
import { 
  User, Mail, Phone, Calendar, Home,
  Upload, ArrowRight, Save, 
  CheckCircle2, ChevronDown, Info, Loader2
} from "lucide-react"; // This line was already fixed in the previous turn.
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { SchoolAdminPersonalDraft, SchoolAdminPersonalFileDraft } from "@/lib/school-admin-application";

interface RegistrationFormData {
  fullNameMm: string;
  fullNameEn: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  nrcState: string;
  nrcTownship: string;
  nrcType: string;
  nrcNumber: string;
  region: string;
  shanArea: string;
  township: string;
  addressDetail: string;
  nrcFront: FileList;
  nrcBack: FileList;
}

interface DropdownOption {
  value: string;
  label: string;
}

interface RegionOption {
  id: number;
  name: string;
}

interface TownshipOption {
  id: number;
  region_id: number;
  name: string;
  nrc_code?: string | null;
  shan_area?: "north" | "south" | "east" | null;
}

const nrcTypeOptions: DropdownOption[] = [
  { value: "နိုင်", label: "နိုင်" },
  { value: "ဧည့်", label: "ဧည့်" },
  { value: "ပြု", label: "ပြု" },
];

const shanAreaOptions: DropdownOption[] = [
  { value: "south", label: "တောင်ပိုင်း" },
  { value: "north", label: "မြောက်ပိုင်း" },
  { value: "east", label: "အရှေ့ပိုင်း" },
];

const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

const toNumericId = (value: string, fieldName: string) => {
  const numericId = Number(value);

  if (!value || !Number.isInteger(numericId)) {
    debugLog(`${fieldName} is not a valid integer id`, value);
    return null;
  }

  return numericId;
};

const sanitizeNrcNumber = (value: string) =>
  value.replace(/[^0-9၀-၉]/g, "").slice(0, 6);

const sanitizeMyanmarName = (value: string) =>
  value.replace(/[^\u1000-\u109f\uaa60-\uaa7f\s]/gu, "");

const sanitizeEnglishName = (value: string) =>
  value.replace(/[^A-Za-z\s.'-]/g, "");

const validateImageFile = (file?: File, required = false) => {
  if (!file) return required ? "ဓါတ်ပုံဖိုင် တင်ရန် လိုအပ်ပါသည်။" : true;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "JPG, PNG, WEBP ဓါတ်ပုံဖိုင်များသာ တင်နိုင်ပါသည်။";
  }
  if (file.size > 5 * 1024 * 1024) {
    return "ဓါတ်ပုံဖိုင်အရွယ်အစား 5 MB ထက် မကျော်ရပါ။";
  }
  return true;
};

const isMyanmarName = (value: string) =>
  /^[\u1000-\u109f\uaa60-\uaa7f\s]+$/u.test(value.trim());

const isEnglishName = (value: string) =>
  /^[A-Za-z][A-Za-z\s.'-]*$/u.test(value.trim());

const isAtLeastAge = (dateValue: string, minimumAge: number) => {
  const birthDate = new Date(`${dateValue}T00:00:00`);

  if (!dateValue || Number.isNaN(birthDate.getTime())) {
    return false;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  const isBeforeBirthday =
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate());

  if (isBeforeBirthday) {
    age -= 1;
  }

  return age >= minimumAge;
};

export function CustomDropdown({
  value,
  options,
  placeholder = "ရွေးချယ်ရန်",
  disabled = false,
  className,
  debugName,
  onChange,
}: {
  value: string;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  debugName?: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value);

  const updateMenuRect = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    setMenuRect({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => {
    if (debugName) {
      debugLog(`${debugName} CustomDropdown options`, options);
    }
  }, [debugName, options]);

  useEffect(() => {
    if (!isOpen) return;

    updateMenuRect();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    window.addEventListener("resize", updateMenuRect);
    window.addEventListener("scroll", updateMenuRect, true);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("resize", updateMenuRect);
      window.removeEventListener("scroll", updateMenuRect, true);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  const dropdownMenu =
    isOpen && !disabled && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            className="aqua-dropdown fixed z-[9999] max-h-60 overflow-y-auto rounded-2xl p-1 text-popover-foreground custom-scrollbar"
            style={{
              top: menuRect.top,
              left: menuRect.left,
              width: menuRect.width,
            }}
          >
            {options.length ? (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={cn(
                    "w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    "hover:bg-primary/10 focus:bg-primary/10 focus:outline-none",
                    option.value === value && "bg-primary/20 text-primary glow-ring"
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                ရွေးချယ်ရန် မရှိသေးပါ
              </div>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "glass-panel flex items-center justify-between gap-2 text-left transition-all focus:ring-2 ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onClick={() => {
          updateMenuRect();
          setIsOpen((current) => !current);
        }}
      >
        <span className={cn("min-w-0 truncate", !selectedOption && "text-muted-foreground")}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </button>

      {dropdownMenu}
    </div>
  );
}

export function SchoolAdminRegistrationForm({
  onComplete,
}: {
  onComplete: (draft: SchoolAdminPersonalDraft, files: SchoolAdminPersonalFileDraft) => void;
}) {
  const [step, setStep] = useState(1);
  const [previews, setPreviews] = useState<{ [key: string]: string }>({});
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [townships, setTownships] = useState<TownshipOption[]>([]);
  const [nrcTownships, setNrcTownships] = useState<TownshipOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  
  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<RegistrationFormData>({
    defaultValues: {
      nrcState: "",
      nrcTownship: "",
      nrcType: "",
      nrcNumber: "",
      region: "",
      shanArea: "",
      township: "",
    }
  });

  const watchedNrcState = useWatch({ control, name: "nrcState" }) || "";
  const watchedNrcTownship = useWatch({ control, name: "nrcTownship" }) || "";
  const watchedNrcType = useWatch({ control, name: "nrcType" }) || "";
  const watchedNrcNumber = useWatch({ control, name: "nrcNumber" }) || "";
  const watchedEmail = useWatch({ control, name: "email" }) || "";
  const watchedRegion = useWatch({ control, name: "region" }) || "";
  const watchedShanArea = useWatch({ control, name: "shanArea" }) || "";
  const watchedTownship = useWatch({ control, name: "township" }) || "";
  const selectedNrcTownship = nrcTownships.find(
    (t) => t.name === watchedNrcTownship
  );
  const regionOptions = useMemo(
    () =>
      regions.map((region) => ({
        value: String(region.id),
        label: region.name,
      })),
    [regions]
  );
  const nrcTownshipOptions = useMemo(
    () =>
      nrcTownships.map((township) => ({
        value: township.name,
        label: township.name,
      })),
    [nrcTownships]
  );
  const townshipOptions = useMemo(
    () =>
      townships.map((township) => ({
        value: String(township.id),
        label: township.name,
      })),
    [townships]
  );
  const selectedAddressRegion = useMemo(
    () => regions.find((region) => String(region.id) === watchedRegion),
    [regions, watchedRegion]
  );
  const isSelectedAddressRegionShan = useMemo(() => {
    const regionName = selectedAddressRegion?.name || "";

    return (
      regionName.includes("ရှမ်း") ||
      /shan/i.test(regionName) ||
      Number(watchedRegion) === 13
    );
  }, [selectedAddressRegion?.name, watchedRegion]);
  const addressGridClassName = cn(
    "grid grid-cols-1 gap-6",
    isSelectedAddressRegionShan ? "md:grid-cols-3" : "md:grid-cols-2"
  );

  useEffect(() => {
    debugLog("watchedNrcState", watchedNrcState);
  }, [watchedNrcState]);

  useEffect(() => {
    debugLog("watchedRegion", watchedRegion);
  }, [watchedRegion]);

  useEffect(() => {
    debugLog("watchedShanArea", watchedShanArea);
  }, [watchedShanArea]);

  useEffect(() => {
    debugLog("nrcTownships state", nrcTownships);
  }, [nrcTownships]);

  useEffect(() => {
    debugLog("townships state", townships);
  }, [townships]);

  // Fetch regions from database
  useEffect(() => {
    const fetchRegions = async () => {
      const { data, error } = await supabase
        .from("regions")
        .select("id, name")
        .order("id", { ascending: true });

      if (error) {
        console.error("Error fetching regions:", error);
      } else if (data) {
        setRegions(data);
      }
    };
    fetchRegions();
  }, []);

  useEffect(() => {
    const fetchNrcTownships = async () => {
      debugLog("fetchNrcTownships useEffect", watchedNrcState);

      if (!watchedNrcState) {
        setNrcTownships([]);
        return;
      }

      const selectedRegionId = toNumericId(watchedNrcState, "nrcState");
      debugLog("selected NRC region_id before query", selectedRegionId);

      if (selectedRegionId === null) {
        setNrcTownships([]);
        return;
      }

      const { data, error, count } = await supabase
        .from("townships")
        .select("id, region_id, name, nrc_code", { count: "exact" })
        .eq("region_id", selectedRegionId)
        .order("name", { ascending: true });

      debugLog("townships query result", data);
      debugLog("townships query error", error);
      debugLog("townships visible count", count);

      if (error) {
        console.error("Error fetching NRC townships:", error);
        setNrcTownships([]);
        return;
      }

      if (data?.length === 0) {
        console.warn(
          "No NRC townships are visible for this region_id. If Supabase Dashboard has rows, check the townships SELECT RLS policy and the active Supabase project URL.",
          { region_id: selectedRegionId }
        );
      }

      setNrcTownships(data || []);
    };

    fetchNrcTownships();
  }, [watchedNrcState]);

  // Fetch townships based on selected region
  useEffect(() => {
    const fetchTownships = async () => {
      debugLog("fetchTownships useEffect", watchedRegion);

      if (!watchedRegion) {
        setTownships([]);
        setValue("township", "");
        setValue("shanArea", "");
        return;
      }

      const selectedRegionId = toNumericId(watchedRegion, "region");
      debugLog("selected address region_id before query", selectedRegionId);

      if (selectedRegionId === null) {
        setTownships([]);
        setValue("township", "");
        return;
      }

      if (isSelectedAddressRegionShan && !watchedShanArea) {
        debugLog("Shan State selected without shanArea; skipping township query", {
          region_id: selectedRegionId,
        });
        setTownships([]);
        setValue("township", "");
        return;
      }

      let townshipsQuery = supabase
        .from("townships")
        .select("id, region_id, name, nrc_code, shan_area", { count: "exact" })
        .eq("region_id", selectedRegionId);

      if (isSelectedAddressRegionShan) {
        townshipsQuery = townshipsQuery.eq("shan_area", watchedShanArea);
      }

      const { data, error, count } = await townshipsQuery.order("name", {
        ascending: true,
      });

      debugLog("address townships query result", data);
      debugLog("address townships query error", error);
      debugLog("address townships visible count", count);

      if (error) {
        console.error("Error fetching townships:", error);
      } else if (data) {
        if (data.length === 0) {
          console.warn(
            "No address townships are visible for this region_id. If Supabase Dashboard has rows, check the townships SELECT RLS policy and the active Supabase project URL.",
            { region_id: selectedRegionId, shan_area: watchedShanArea || null }
          );
        }

        setTownships(data);
      }
    };
    fetchTownships();
  }, [watchedRegion, watchedShanArea, isSelectedAddressRegionShan, setValue]);

  // Utility to convert Myanmar digits to English digits
  const toEnDigit = (str: string = "") => {
    const mmDigits = "၀၁၂၃၄၅၆၇၈၉";
    return str.replace(/[၀-၉]/g, (d) => mmDigits.indexOf(d).toString());
  };

  const emailSuggestions = ["@gmail.com", "@outlook.com", "@yahoo.com"];

  const fullNameMmRegistration = register("fullNameMm", {
    required: "အမည် (မြန်မာ) ဖြည့်သွင်းရန် လိုအပ်ပါသည်။",
    validate: (value) =>
      isMyanmarName(value) || "အမည် (မြန်မာ) တွင် မြန်မာစာလုံးများသာ ထည့်သွင်းပါ။",
  });

  const fullNameEnRegistration = register("fullNameEn", {
    required: "အင်္ဂလိပ်အမည် အပြည့်အစုံ ဖြည့်သွင်းရန် လိုအပ်ပါသည်။",
    validate: (value) =>
      isEnglishName(value) || "Full Name (English) တွင် အင်္ဂလိပ်စာလုံးများသာ ထည့်သွင်းပါ။",
  });

  const nrcNumberRegistration = register("nrcNumber", {
    required: "မှတ်ပုံတင်နံပါတ် ဖြည့်စွက်ပါ",
    minLength: { value: 6, message: "နံပါတ် ၆ လုံး ပြည့်အောင် ဖြည့်သွင်းပေးပါ။" },
    maxLength: { value: 6, message: "နံပါတ် ၆ လုံးသာ ဖြည့်သွင်းနိုင်ပါသည်။" },
    pattern: {
      value: /^[0-9၀-၉]{6}$/,
      message: "နံပါတ် ၆ လုံး တိကျစွာ ဖြည့်သွင်းပေးပါ။",
    },
  });

  const nrcFrontRegistration = register("nrcFront", {
    validate: (files) => validateImageFile(files?.[0], true),
  });

  const nrcBackRegistration = register("nrcBack", {
    validate: (files) => validateImageFile(files?.[0], true),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, name: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [name]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      setIsSubmitting(true);
      setSubmitError("");

      const nrcTownshipCode = nrcTownships.find(t => t.name === data.nrcTownship)?.nrc_code || data.nrcTownship;
      const fullNrc = `${toEnDigit(data.nrcState)}/${nrcTownshipCode}(${data.nrcType})${toEnDigit(data.nrcNumber)}`;

      // Township belongs to State validation (Logic check for NRC)
  const validTownship = nrcTownships.find(
    t => t.name === data.nrcTownship
  );

  if (!validTownship) {
    throw new Error(
      "ရွေးချယ်ထားသော မြို့နယ်သည် သက်ဆိုင်ရာ ပြည်နယ်/တိုင်းတွင် မရှိပါ။"
    );
  }

      const applicationId = crypto.randomUUID();
      const nrcFrontFile = data.nrcFront?.[0];
      const nrcBackFile = data.nrcBack?.[0];

      if (!nrcFrontFile || !nrcBackFile) {
        throw new Error("NRC ရှေ့/နောက် ဓါတ်ပုံ နှစ်ခုလုံး တင်ရန် လိုအပ်ပါသည်။");
      }

      onComplete(
        {
          applicationId,
          fullNameMm: data.fullNameMm,
          fullNameEn: data.fullNameEn,
          email: data.email,
          phone: data.phone,
          dob: data.dob,
          gender: data.gender,
          nrcNumber: fullNrc,
          residentialAddress: data.addressDetail,
          stateRegionId: data.region ? Number(data.region) : null,
          townshipId: data.township ? Number(data.township) : null,
          nrcState: data.nrcState,
          nrcTownship: data.nrcTownship,
          nrcType: data.nrcType,
          nrcNumberRaw: data.nrcNumber,
        },
        {
          nrcFrontFile,
          nrcBackFile,
        },
      );

    } catch (err: any) {
      console.error("Submission Error:", err);
      setSubmitError(err.message || "အချက်အလက်သိမ်းဆည်းရာတွင် အမှားအယွင်းရှိပါသည်။");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Step Indicator */}
      <div className="mb-8 flex items-center justify-between px-2">
        <div>
          <h1 className="text-2xl font-bold glow-text mb-1">ကျောင်းအုပ်ချုပ်ရေးအကောင့် လျှောက်ထားခြင်း</h1>
          <p className="text-sm text-muted-foreground">အဆင့် ၁ - ကိုယ်ရေးအချက်အလက်များ</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-medium mb-2 uppercase tracking-wider">တိုးတက်မှုအခြေအနေ</span>
          <div className="flex gap-1">
            <div className="h-1.5 w-12 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
            <div className="h-1.5 w-12 rounded-full bg-muted" />
          </div>
          <span className="text-[10px] mt-1 text-muted-foreground">အဆင့် ၁ / ၂</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Main Info Card */}
        <div className="glass-strong p-6 rounded-[2rem] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-bold text-primary block mb-1">ဖြည့်စွက်ရန် လမ်းညွှန်ချက်</span>
              ကိုယ်ပိုင်ကျောင်းဖြစ်ပါက ကိုယ်ပိုင်ကျောင်းတည်ထောင်ခွင့်မိန့်တွင်ရှိသော အမည်အတိုင်း အပြည့်အစုံ ဖြည့်စွက်ရမည်ဖြစ်ပြီး၊ အတိုကောက်များ သုံးစွဲခြင်း မပြုရန် သတိပြုပေးပါ။
            </p>
          </div>

          {/* Section: Basic Identity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium ml-1">အမည် (မြန်မာ)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  {...fullNameMmRegistration}
                  className="glass-panel w-full pl-10 pr-4 py-3.5 rounded-2xl outline-none focus:ring-2 ring-primary/20 transition-all"
                  placeholder="အမည်အပြည့်အစုံ"
                  onChange={(event) => {
                    const sanitizedValue = sanitizeMyanmarName(event.target.value);
                    event.target.value = sanitizedValue;
                    setValue("fullNameMm", sanitizedValue, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                  }}
                />
              </div>
              {errors.fullNameMm && <p className="text-[11px] text-destructive ml-1">{errors.fullNameMm.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium ml-1">Full Name (English)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  {...fullNameEnRegistration}
                  className="glass-panel w-full pl-10 pr-4 py-3.5 rounded-2xl outline-none focus:ring-2 ring-primary/20 transition-all"
                  placeholder="Full Name"
                  onChange={(event) => {
                    const sanitizedValue = sanitizeEnglishName(event.target.value);
                    event.target.value = sanitizedValue;
                    setValue("fullNameEn", sanitizedValue, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                  }}
                />
              </div>
              {errors.fullNameEn && <p className="text-[11px] text-destructive ml-1">{errors.fullNameEn.message}</p>}
            </div>
          </div>

          {/* Section: Contact & DOB */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 relative">
              <label className="text-sm font-medium ml-1">Email လိပ်စာ</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  {...register("email", { 
                    required: "Email လိပ်စာ ဖြည့်သွင်းရန် လိုအပ်ပါသည်။",
                    pattern: { value: /^\S+@\S+$/i, message: "မှန်ကန်သော Email ဖြစ်ရပါမည်။" }
                  })}
                  className="glass-panel w-full pl-10 pr-4 py-3.5 rounded-2xl outline-none focus:ring-2 ring-primary/20 transition-all"
                  placeholder="example@mail.com"
                />
              </div>
              {watchedEmail && !watchedEmail.includes("@") && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 flex gap-2 p-1">
                  {emailSuggestions.map(ext => (
                    <button 
                      key={ext}
                      type="button"
                      onClick={() => setValue("email", watchedEmail + ext)}
                      className="glass px-3 py-1.5 rounded-lg text-[10px] hover:bg-primary/20 transition-colors"
                    >
                      {ext}
                    </button>
                  ))}
                </div>
              )}
              {errors.email && <p className="text-[11px] text-destructive ml-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium ml-1">ဖုန်းနံပါတ်</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none border-r border-border pr-2 my-2">
                  <span className="text-sm font-bold text-primary">+959</span>
                </div>
                <input
                  {...register("phone", { 
                    required: "ဖုန်းနံပါတ် ဖြည့်သွင်းရန် လိုအပ်ပါသည်။",
                    minLength: { value: 9, message: "နံပါတ် အနည်းဆုံး 9 လုံးရှိရပါမည်။" }
                  })}
                  className="glass-panel w-full pl-[4.5rem] pr-4 py-3.5 rounded-2xl outline-none focus:ring-2 ring-primary/20 transition-all font-mono"
                  placeholder="798765432"
                />
              </div>
              {errors.phone && <p className="text-[11px] text-destructive ml-1">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium ml-1">မွေးသက္ကရာဇ်</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="date"
                  {...register("dob", {
                    required: "မွေးသက္ကရာဇ် ရွေးချယ်ပေးပါ။",
                    validate: (value) =>
                      isAtLeastAge(value, 25) || "School Admin ဖြစ်ရန် အသက် ၂၅ နှစ်နှင့်အထက် ဖြစ်ရပါမည်။",
                  })}
                  className="glass-panel w-full pl-10 pr-4 py-3.5 rounded-2xl outline-none focus:ring-2 ring-primary/20 transition-all"
                />
              </div>
              {errors.dob && <p className="text-[11px] text-destructive ml-1">{errors.dob.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium ml-1">လိင်</label>
              <div className="flex gap-4 p-1">
                {[
                  { label: "ကျား", value: "male" },
                  { label: "မ", value: "female" },
                  { label: "အခြား", value: "other" }
                ].map((g) => (
                  <label key={g.value} className="flex-1 cursor-pointer">
                    <input type="radio" {...register("gender", { required: "လိင် ရွေးချယ်ပေးပါ။" })} value={g.value} className="peer hidden" />
                    <div className="glass-panel py-3 rounded-xl text-center text-sm transition-all peer-checked:bg-primary/20 peer-checked:border-primary/50 peer-checked:ring-1 ring-primary/30">
                      {g.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Smart NRC */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">မှတ်ပုံတင်အချက်အလက်</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase ml-1 opacity-60">ပြည်နယ်/တိုင်း</span>
                <input type="hidden" {...register("nrcState")} />
                <CustomDropdown
                  value={watchedNrcState}
                  options={regionOptions}
                  className="w-full px-3 py-3 rounded-xl outline-none"
                  onChange={(selectedState) => {
                    setValue("nrcState", selectedState, { shouldDirty: true, shouldValidate: true });
                    setValue("nrcTownship", "", { shouldDirty: true, shouldValidate: true }); // Reset township when state changes
                    setNrcTownships([]);
                  }}
                />
              </div>
              <div className="space-y-1.5 col-span-1">
                <span className="text-[10px] uppercase ml-1 opacity-60">မြို့နယ်</span>
                <input
                  type="hidden"
                  {...register("nrcTownship", { required: "မြို့နယ် ရွေးချယ်ရန် လိုအပ်ပါသည်။" })}
                />
                <CustomDropdown
                  value={watchedNrcTownship}
                  debugName="nrcTownship"
                  options={nrcTownshipOptions}
                  className="w-full px-3 py-3 rounded-xl outline-none"
                  disabled={!watchedNrcState}
                  onChange={(value) =>
                    setValue("nrcTownship", value, { shouldDirty: true, shouldValidate: true })
                  }
                />
                {/*
                      : "ရွေးချယ်ပါ"}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", showTownshipDropdown && "rotate-180")} />
                </div>

                <input type="hidden" {...register("nrcTownship", { required: "မြို့နယ် ရွေးချယ်ရန် လိုအပ်ပါသည်။" })} />

                {showTownshipDropdown && (
                  <div className="absolute z-20 top-[calc(100%+8px)] left-0 right-0 glass-strong rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 border-b border-border">
                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input 
                          autoFocus
                          className="w-full bg-background border border-border/50 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-1 ring-primary/30 placeholder:text-muted-foreground/50"
                          placeholder="မြို့နယ်အမည် သို့မဟုတ် ကုဒ်ဖြင့်ရှာပါ..."
                          value={townshipSearch}
                          onChange={(e) => setTownshipSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto p-1 custom-scrollbar">
                      {filteredTownships.length > 0 ? (
                        filteredTownships.map(t => (
                          <button
                            key={t.id}
                            type="button"
                            className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-primary/10 transition-colors text-sm flex justify-between items-center group"
                            onClick={(e) => {
                              e.stopPropagation();
                              setValue("nrcTownship", t.nrc_code, { shouldValidate: true });
                              setShowTownshipDropdown(false);
                              setTownshipSearch("");
                            }}
                          >
                            <span className="font-medium">{t.name}</span>
                            <span className="text-[10px] font-mono opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all">{t.nrc_code}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-6 text-center text-xs text-muted-foreground italic">ရှာမတွေ့ပါ</div>
                      )}
                    </div>
                  </div>
                )}
                */}
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase ml-1 opacity-60">အမျိုးအစား</span>
                <input
                  type="hidden"
                  {...register("nrcType", { required: "NRC အမျိုးအစား ရွေးချယ်ရန် လိုအပ်ပါသည်။" })}
                />
                <CustomDropdown
                  value={watchedNrcType}
                  options={nrcTypeOptions}
                  className="w-full px-3 py-3 rounded-xl outline-none"
                  onChange={(value) =>
                    setValue("nrcType", value, { shouldDirty: true, shouldValidate: true })
                  }
                />
                {errors.nrcType && <p className="text-[11px] text-destructive ml-1">{errors.nrcType.message}</p>}
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase ml-1 opacity-60">နံပါတ် (၆ လုံး)</span>
                <input
                  {...nrcNumberRegistration}
                  maxLength={6}
                  className="glass-panel w-full px-3 py-3 rounded-xl outline-none font-mono"
                  placeholder="123456"
                  onChange={(event) => {
                    const sanitizedValue = sanitizeNrcNumber(event.target.value);
                    event.target.value = sanitizedValue;
                    setValue("nrcNumber", sanitizedValue, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                />
                {errors.nrcNumber ? (
                  <p className="text-[11px] text-destructive ml-1">{errors.nrcNumber.message}</p>
                ) : watchedNrcNumber && watchedNrcNumber.length < 6 ? (
                  <p className="text-[11px] text-destructive ml-1">နံပါတ် ၆ လုံး ပြည့်အောင် ဖြည့်သွင်းပေးပါ။</p>
                ) : null}
              </div>
            </div>
            
            {/* NRC Preview */}
            <div className="glass p-3 rounded-2xl flex items-center justify-between border border-primary/10">
              <span className="text-[10px] text-muted-foreground ml-2">NRC Preview:</span>
              <div className="text-sm font-bold tracking-widest text-primary px-3 py-1 bg-primary/10 rounded-lg">
                {toEnDigit(watchedNrcState) || "?"}/
                {selectedNrcTownship?.nrc_code || selectedNrcTownship?.name || "???"}
                ({watchedNrcType || "?"})
                {toEnDigit(watchedNrcNumber || "000000")}
              </div>
            </div>
          </div>

          {/* Section: Address */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                နေရပ်လိပ်စာအချက်အလက်
              </h3>
              <p className="text-xs text-muted-foreground">
                လက်ရှိနေထိုင်ရာ တိုင်း/ပြည်နယ်၊ မြို့နယ်နှင့် အသေးစိတ်လိပ်စာကို ဖြည့်သွင်းပါ။
              </p>
            </div>

            <div className={addressGridClassName}>
              <div className="space-y-2">
                <label className="text-sm font-medium ml-1">တိုင်းဒေသကြီး / ပြည်နယ်</label>
                <input
                  type="hidden"
                  {...register("region", { required: "တိုင်းဒေသကြီး/ပြည်နယ် ရွေးချယ်ရန် လိုအပ်ပါသည်။" })}
                />
                <CustomDropdown
                  value={watchedRegion}
                  options={regionOptions}
                  className="w-full px-4 py-3.5 rounded-2xl outline-none"
                  onChange={(value) => {
                    setValue("region", value, { shouldDirty: true, shouldValidate: true });
                    setValue("shanArea", "", { shouldDirty: true, shouldValidate: true });
                    setValue("township", "", { shouldDirty: true, shouldValidate: true });
                    setTownships([]);
                  }}
                />
              </div>
              {isSelectedAddressRegionShan && (
                <div className="space-y-2">
                  <label className="text-sm font-medium ml-1">ရှမ်းပြည်နယ် ဒေသ</label>
                  <input
                    type="hidden"
                    {...register("shanArea", { required: "ရှမ်းပြည်နယ် ဒေသ ရွေးချယ်ရန် လိုအပ်ပါသည်။" })}
                  />
                  <CustomDropdown
                    value={watchedShanArea}
                    options={shanAreaOptions}
                    className="w-full px-4 py-3.5 rounded-2xl outline-none"
                    onChange={(value) => {
                      setValue("shanArea", value, { shouldDirty: true, shouldValidate: true });
                      setValue("township", "", { shouldDirty: true, shouldValidate: true });
                      setTownships([]);
                    }}
                  />
                  {errors.shanArea && <p className="text-[11px] text-destructive ml-1">{errors.shanArea.message}</p>}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium ml-1">မြို့နယ်</label>
                <input
                  type="hidden"
                  {...register("township", { required: "မြို့နယ် ရွေးချယ်ရန် လိုအပ်ပါသည်။" })}
                />
                <CustomDropdown
                  value={watchedTownship}
                  debugName="addressTownship"
                  options={townshipOptions}
                  className="w-full px-4 py-3.5 rounded-2xl outline-none"
                  disabled={!watchedRegion || (isSelectedAddressRegionShan && !watchedShanArea)}
                  onChange={(value) => setValue("township", value, { shouldDirty: true, shouldValidate: true })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium ml-1">အိမ်အမှတ် / လမ်း / ရပ်ကွက်</label>
              <textarea 
                {...register("addressDetail")}
                className="glass-panel w-full px-4 py-3 rounded-2xl outline-none min-h-[100px] resize-none"
                placeholder="အသေးစိတ်လိပ်စာ ဖြည့်သွင်းပါ..."
              />
            </div>
          </div>
        </div>

        {/* Photo Upload Section */}
        <div className="grid grid-cols-1 gap-6">
          {/* NRC Front */}
          <div className="glass-strong p-6 rounded-[2rem]">
            <label className="text-sm font-bold mb-4 block">မှတ်ပုံတင် (ရှေ့/နောက်) ဓါတ်ပုံ</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Front Photo */}
              <div className="relative h-40 glass-panel rounded-2xl border-2 border-dashed border-border overflow-hidden group hover:border-primary/50 transition-all">
                {previews.nrcFront ? (
                  <img src={previews.nrcFront} className="h-full w-full object-cover" alt="NRC Front" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-[11px] font-medium opacity-60">ရှေ့ဖက်ပုံတင်ရန်</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept=".jpg,.jpeg,.png,.webp"
                  {...nrcFrontRegistration}
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => {
                    nrcFrontRegistration.onChange(e);
                    handleFileChange(e, "nrcFront");
                  }}
                />
              </div>

              {/* Back Photo */}
              <div className="relative h-40 glass-panel rounded-2xl border-2 border-dashed border-border overflow-hidden group hover:border-primary/50 transition-all">
                {previews.nrcBack ? (
                  <img src={previews.nrcBack} className="h-full w-full object-cover" alt="NRC Back" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-[11px] font-medium opacity-60">နောက်ဖက်ပုံတင်ရန်</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept=".jpg,.jpeg,.png,.webp"
                  {...nrcBackRegistration}
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => {
                    nrcBackRegistration.onChange(e);
                    handleFileChange(e, "nrcBack");
                  }}
                />
              </div>
            </div>
            {(errors.nrcFront || errors.nrcBack) && (
              <div className="mt-3 space-y-1 text-[11px] text-destructive">
                {errors.nrcFront && <p>{errors.nrcFront.message}</p>}
                {errors.nrcBack && <p>{errors.nrcBack.message}</p>}
              </div>
            )}
            <div className="mt-4 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-[10px] text-muted-foreground">
                ပုံများသည် ကြည်လင်ပြတ်သားရမည်ဖြစ်ပြီး စာသားများအားလုံးကို ဖတ်ရှု၍ ရရပါမည်။ ဖိုင်ဆိုဒ် အများဆုံး 5MB ထိသာ ခွင့်ပြုပါသည်။
              </p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        {submitError && (
          <div className="glass-panel rounded-2xl border border-destructive/30 p-4 text-sm text-destructive">
            {submitError}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-12">
          <Link 
            to="/" // Navigate to the home page
            className="flex-1 glass-panel p-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold hover:bg-accent/35 hover:glow-ring transition-all order-1 sm:order-1"
          >
            <Home className="h-4 w-4" /> ပင်မစာမျက်နှာသို့
          </Link>
          <button 
            type="button" 
            className="flex-1 glass-panel p-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold hover:bg-accent/35 hover:glow-ring transition-all order-2 sm:order-2"
          >
            <Save className="h-4 w-4" /> မူကြမ်းသိမ်းဆည်းမည်
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting}
            // Adjusted order for submit button to be last on small screens, but still wider on larger screens
            className="aqua-button flex-[2] p-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold hover:brightness-105 transition-all order-3 sm:order-3"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> ခဏစောင့်ပါ...</>
            ) : (
              <>ဆက်လက်လုပ်ဆောင်မည် <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/** 
 * Data Dictionary for Smart Dropdowns 
 * Note: In a real app, these should be fetched or imported from a constant file.
 */
