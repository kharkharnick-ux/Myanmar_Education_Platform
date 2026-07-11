import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Mail,
  MapPin,
  Percent,
  Phone,
  School as SchoolIcon,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  REGIONS,
  fetchSchoolDetail,
  fetchSchools,
  hasFreshApprovedSchoolsCache,
  type School,
  type SchoolDetail,
} from "@/lib/site-data";

export function SchoolDiscovery({ limit }: { limit?: number }) {
  const [active, setActive] = useState<string>(REGIONS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [schoolDetail, setSchoolDetail] = useState<SchoolDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const slotCount = typeof limit === "number" ? Math.max(0, limit) : undefined;
  const emptySlotCount = slotCount === undefined ? 0 : Math.max(slotCount - schools.length, 0);
  const schoolGridClass =
    slotCount === undefined
      ? "mt-8 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,220px),340px))] justify-center gap-[clamp(12px,2vw,28px)] overflow-visible"
      : "no-scrollbar -mx-4 mt-8 flex min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-[clamp(12px,1.8vw,22px)] md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4";

  useEffect(() => {
    let cancelled = false;
    const showSkeleton = !hasFreshApprovedSchoolsCache();
    if (showSkeleton) setLoading(true);
    setError(null);

    fetchSchools(active)
      .then((rows) => {
        if (!cancelled) setSchools(typeof limit === "number" ? rows.slice(0, limit) : rows);
      })
      .catch((error) => {
        if (!cancelled) setError(error?.message ?? "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, limit]);

  const openSchoolDetail = (school: School) => {
    setSelectedSchool(school);
    setSchoolDetail(null);
    setDetailError(null);
    setDetailLoading(true);

    fetchSchoolDetail(school.id)
      .then((detail) => {
        setSchoolDetail(detail);
      })
      .catch((error) => {
        setDetailError(error instanceof Error ? error.message : "Failed to load school details");
      })
      .finally(() => {
        setDetailLoading(false);
      });
  };

  const handleDetailOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedSchool(null);
      setSchoolDetail(null);
      setDetailError(null);
      setDetailLoading(false);
    }
  };

  return (
    <section id="schools" className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          ကျောင်းများကို ရှာဖွေပါ
        </h2>
      </div>

      <div className="no-scrollbar -mx-2 flex gap-2 overflow-x-auto px-2 pb-2">
        {REGIONS.map((region) => {
          const isActive = active === region;
          return (
            <button
              key={region}
              type="button"
              onClick={() => setActive(region)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "glass-panel text-foreground/80 hover:bg-accent/40"
              }`}
            >
              {region}
            </button>
          );
        })}
      </div>

      <div className={schoolGridClass}>
        {loading && Array.from({ length: slotCount ?? 4 }).map((_, index) => <SkeletonCard key={index} />)}

        {!loading && error && (
          <div className="col-span-full aqua-card p-8 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && schools.length === 0 && slotCount === undefined && (
          <div className="col-span-full aqua-card p-12 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full glass-panel">
              <SchoolIcon className="h-6 w-6 text-primary" />
            </div>
            <p className="text-base font-semibold text-foreground">ကျောင်းများ မရှိသေးပါ</p>
            <p className="mt-1 text-sm text-muted-foreground">
              အတည်ပြုပြီးသော ကျောင်းများ ရှိလာပါက ဤနေရာတွင် ပြသပါမည်။
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          schools.map((school) => (
            <ShowcaseSchoolCard key={school.id} school={school} onOpen={() => openSchoolDetail(school)} />
          ))}

        {!loading &&
          !error &&
          Array.from({ length: emptySlotCount }).map((_, index) => <EmptySchoolCard key={`empty-${index}`} />)}
      </div>

      <SchoolDetailDialog
        school={selectedSchool}
        detail={schoolDetail}
        loading={detailLoading}
        error={detailError}
        onOpenChange={handleDetailOpenChange}
      />
    </section>
  );
}

function SkeletonCard() {
  return (
    <div className="relative aspect-[16/11] w-[min(86vw,340px)] max-w-[calc(100vw-2rem)] min-w-0 flex-none snap-center overflow-hidden rounded-[clamp(16px,1.8vw,24px)] border border-sky-200/80 bg-white/35 shadow-[0_0_0_1px_rgb(186_230_253_/_0.48),0_16px_44px_rgb(14_165_233_/_0.13),inset_0_1px_0_rgb(255_255_255_/_0.78)] backdrop-blur-[30px] md:w-full md:max-w-none dark:border-cyan-300/35 dark:bg-slate-950/35 dark:shadow-[0_0_0_1px_rgb(103_232_249_/_0.22),0_0_28px_rgb(34_211_238_/_0.20),0_20px_56px_rgb(8_47_73_/_0.38),inset_0_1px_0_rgb(255_255_255_/_0.16)]">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-sky-100/80 via-cyan-200/45 to-blue-200/35 dark:from-cyan-300/35 dark:via-blue-500/25 dark:to-slate-950/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/8 via-slate-900/8 to-slate-950/48 dark:from-transparent dark:via-black/25 dark:to-black/75" />
      <div className="relative z-10 flex h-full flex-col justify-end p-[clamp(10px,1.2vw,18px)]">
        <div className="mb-[clamp(8px,1vw,12px)] size-[clamp(34px,4vw,54px)] rounded-full border-2 border-white/80 bg-white/35 shadow-[0_0_20px_rgb(125_211_252_/_0.20)] dark:bg-white/20" />
        <div className="rounded-[clamp(12px,1.4vw,18px)] border border-white/35 bg-white/24 p-[clamp(8px,1vw,12px)] backdrop-blur-[26px] dark:border-white/25 dark:bg-white/14">
          <div className="h-4 w-4/5 animate-pulse rounded-full bg-white/30" />
          <div className="mt-2 h-3 w-2/3 animate-pulse rounded-full bg-white/20" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="h-11 animate-pulse rounded-[14px] bg-white/26 backdrop-blur-xl dark:bg-white/18" />
          <div className="h-11 animate-pulse rounded-[14px] bg-white/26 backdrop-blur-xl dark:bg-white/18" />
        </div>
      </div>
    </div>
  );
}

function EmptySchoolCard() {
  return (
    <article
      aria-hidden="true"
      className="school-led-frame relative aspect-[16/11] w-[min(86vw,340px)] max-w-[calc(100vw-2rem)] min-w-0 flex-none snap-center overflow-visible rounded-[clamp(16px,1.8vw,24px)] bg-white/32 shadow-[0_16px_38px_rgb(15_23_42_/_0.12),inset_0_1px_0_rgb(255_255_255_/_0.72)] backdrop-blur-[30px] md:w-full md:max-w-none dark:bg-slate-950/24 dark:shadow-[0_20px_48px_rgb(0_0_0_/_0.34),inset_0_1px_0_rgb(255_255_255_/_0.10)]"
    >
      <div className="absolute inset-0 z-[1] overflow-hidden rounded-[inherit]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(125,211,252,0.34),transparent_34%),linear-gradient(135deg,rgba(240,249,255,0.72),rgba(186,230,253,0.38)_54%,rgba(56,189,248,0.16))] dark:bg-[radial-gradient(circle_at_24%_18%,rgba(125,211,252,0.22),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.44),rgba(30,58,138,0.24)_54%,rgba(56,189,248,0.18))]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-sky-950/5 to-sky-950/18 dark:from-transparent dark:via-black/10 dark:to-black/35" />
        <div className="pointer-events-none absolute inset-x-7 top-4 h-px bg-gradient-to-r from-transparent via-sky-100/80 to-transparent opacity-80 dark:via-white/42 dark:opacity-70" />
      </div>
    </article>
  );
}

const formatStatNumber = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);

const formatOptionalStat = (value: number | null | undefined, maximumFractionDigits = 0) =>
  value === undefined || value === null ? "-" : formatStatNumber(value, maximumFractionDigits);

function ShowcaseSchoolCard({ school, onOpen }: { school: School; onOpen: () => void }) {
  const location = [school.region, school.township].filter(Boolean).join(" / ") || "-";
  const ratingText = formatOptionalStat(school.rating_average, 1);
  const passRate =
    school.pass_rate === undefined || school.pass_rate === null
      ? "-"
      : `${formatStatNumber(school.pass_rate, 1)}%`;

  return (
    <article
      aria-label={school.name}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="school-led-frame group relative aspect-[16/11] w-[min(86vw,340px)] max-w-[calc(100vw-2rem)] min-w-0 flex-none snap-center cursor-pointer overflow-visible rounded-[clamp(16px,1.8vw,24px)] bg-white/20 shadow-[0_16px_38px_rgb(15_23_42_/_0.14),inset_0_1px_0_rgb(255_255_255_/_0.76)] backdrop-blur-[30px] md:w-full md:max-w-none [&_svg]:size-[clamp(12px,1.2vw,16px)] dark:bg-slate-950/35 dark:shadow-[0_22px_52px_rgb(0_0_0_/_0.42),inset_0_1px_0_rgb(255_255_255_/_0.14)]"
    >
      <div className="absolute inset-0 z-[1] overflow-hidden rounded-[inherit]">
        {school.coverUrl ? (
          <img
            src={school.coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(125,211,252,0.78),transparent_34%),linear-gradient(135deg,#0f172a,#1e3a8a_54%,#38bdf8)]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-slate-950/10 to-slate-950/74 dark:from-black/28 dark:via-black/24 dark:to-black/[0.88]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(186,230,253,0.20),transparent_32%)] dark:bg-[radial-gradient(circle_at_14%_16%,rgba(125,211,252,0.16),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-x-7 top-4 h-px bg-gradient-to-r from-transparent via-sky-100/85 to-transparent opacity-90 dark:via-white/80 dark:opacity-80" />

        <div className="relative z-10 flex h-full min-w-0 flex-col justify-between p-[clamp(10px,1.2vw,18px)]">
          <div className="flex min-w-0 items-start justify-between gap-[clamp(4px,0.7vw,8px)]">
            <div className="flex min-w-0 max-w-[68%] items-center gap-[clamp(3px,0.5vw,6px)] truncate text-[clamp(8px,0.9vw,12px)] font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              <Sparkles className="h-3 w-3 shrink-0 text-amber-200 drop-shadow" />
              <span className="truncate">{school.highlight_badge || "Top Performing School"}</span>
            </div>
            <div className="shrink-0 text-[clamp(8px,0.9vw,12px)] font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              <span className="text-amber-200">★</span> {ratingText}
            </div>
          </div>

          <div className="space-y-[clamp(5px,0.8vw,9px)]">
            <div className="grid size-[clamp(34px,4vw,54px)] place-items-center overflow-hidden rounded-full border-2 border-white/90 shadow-[0_10px_26px_rgba(15,23,42,0.26),0_0_18px_rgb(186_230_253_/_0.30)] dark:border-white/85 dark:shadow-[0_10px_26px_rgba(0,0,0,0.35),0_0_18px_rgb(125_211_252_/_0.24)]">
              <div className="grid h-full w-full place-items-center rounded-full">
                {school.logoUrl ? (
                  <img src={school.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <SchoolIcon className="h-6 w-6 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]" />
                )}
              </div>
            </div>

            <div className="grid gap-[clamp(4px,0.6vw,7px)]">
              <div>
                <h3 className="line-clamp-2 min-h-[2.3em] text-[clamp(15px,1.5vw,21px)] font-bold leading-[1.15] tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.90)]">
                  {school.name}
                </h3>
                <div className="mt-[clamp(2px,0.4vw,5px)] flex flex-wrap gap-x-[clamp(5px,0.8vw,9px)] gap-y-0.5 text-[clamp(8px,0.9vw,12px)] font-semibold text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                  <span>
                    {school.schoolType}
                  </span>
                  <span>
                    {school.gradeFrom} to {school.gradeTo}
                  </span>
                </div>
                <div className="mt-[clamp(2px,0.4vw,5px)] flex min-w-0 items-center gap-[clamp(3px,0.5vw,6px)] text-[clamp(9px,0.9vw,12px)] font-medium text-white/82 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-100" />
                  <span className="truncate">{location}</span>
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-4 gap-[clamp(4px,0.8vw,9px)] border-t border-white/34 pt-[clamp(4px,0.6vw,7px)] dark:border-white/24">
                <ShowcaseStatTile
                  icon={<Star className="h-3 w-3 fill-cyan-100/25 text-cyan-100" />}
                  value={ratingText}
                  label="Rating"
                />
                <ShowcaseStatTile
                  icon={<Users className="h-3 w-3 text-cyan-100" />}
                  value={formatOptionalStat(school.rating_count)}
                  label="Reviews"
                />
                <ShowcaseStatTile
                  icon={<Percent className="h-3 w-3 text-cyan-100" />}
                  value={passRate}
                  label="Pass Rate"
                />
                <ShowcaseStatTile
                  icon={<Trophy className="h-3 w-3 text-cyan-100" />}
                  value={formatOptionalStat(school.distinction_count)}
                  label="Distinctions"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function ShowcaseStatTile({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="min-w-0 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.90)]">
      <div className="mb-0.5 flex min-w-0 items-center gap-1">
        {icon}
        <div className="min-w-0 truncate text-[clamp(8px,0.85vw,11px)] font-bold leading-none tracking-tight">{value}</div>
      </div>
      <div className="truncate text-[clamp(6px,0.65vw,9px)] font-medium leading-none text-white/76">{label}</div>
    </div>
  );
}

function SchoolDetailDialog({
  school,
  detail,
  loading,
  error,
  onOpenChange,
}: {
  school: School | null;
  detail: SchoolDetail | null;
  loading: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!school) return null;

  const displaySchool = detail ?? school;
  const location = [displaySchool.region, displaySchool.township].filter(Boolean).join(" / ") || "-";
  const gradeRange = `${displaySchool.gradeFrom} to ${displaySchool.gradeTo}`;
  const contactEmail = detail?.email ?? school.email;
  const contactPhone = detail?.phone ?? school.phone;
  const websiteHref = displaySchool.website
    ? displaySchool.website.startsWith("http")
      ? displaySchool.website
      : `https://${displaySchool.website}`
    : "";
  const ratingText = formatOptionalStat(detail?.rating_average ?? school.rating_average, 1);
  const passRate =
    (detail?.pass_rate ?? school.pass_rate) === undefined || (detail?.pass_rate ?? school.pass_rate) === null
      ? "-"
      : `${formatStatNumber((detail?.pass_rate ?? school.pass_rate) as number, 1)}%`;
  const acceptingStudents = detail?.acceptingStudents ?? false;
  const applySubject = encodeURIComponent(`Admission inquiry - ${displaySchool.name}`);
  const applyHref = contactEmail ? `mailto:${contactEmail}?subject=${applySubject}` : contactPhone ? `tel:${contactPhone}` : "";
  const canApply = acceptingStudents && Boolean(applyHref) && !loading;

  return (
    <Dialog open={Boolean(school)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto p-0">
        <div className="relative min-h-[230px] overflow-hidden rounded-t-3xl bg-slate-950">
          {displaySchool.coverUrl ? (
            <img src={displaySchool.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(125,211,252,0.65),transparent_34%),linear-gradient(135deg,#0f172a,#1e3a8a_55%,#0891b2)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/34 to-black/82" />
          <div className="relative z-10 flex min-h-[230px] flex-col justify-end gap-4 p-6 pr-14 text-white sm:p-8 sm:pr-16">
            <div className="flex flex-wrap items-end gap-4">
              <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border-2 border-white/90 bg-white/18 shadow-[0_12px_34px_rgba(0,0,0,0.30)]">
                {displaySchool.logoUrl ? (
                  <img src={displaySchool.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <SchoolIcon className="h-8 w-8" />
                )}
              </div>
              <DialogHeader className="min-w-0 flex-1 space-y-2 text-left">
                <DialogTitle className="line-clamp-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
                  {displaySchool.name}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium text-white/84">
                  <span>{displaySchool.schoolType}</span>
                  <span>{gradeRange}</span>
                  <span>{location}</span>
                </DialogDescription>
              </DialogHeader>
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  acceptingStudents
                    ? "border-emerald-200/70 bg-emerald-400/18 text-emerald-50"
                    : "border-rose-200/60 bg-rose-500/18 text-rose-50"
                }`}
              >
                {acceptingStudents ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {acceptingStudents ? "ကျောင်းသားအသစ် လက်ခံနေသည်" : "လက်ရှိ လက်မခံသေးပါ"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-6 sm:p-8">
          {loading && (
            <div className="rounded-2xl border border-border/70 bg-muted/35 p-4 text-sm text-muted-foreground">
              အသေးစိတ်အချက်အလက်များ ရယူနေသည်...
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SchoolDetailMetric
              icon={<GraduationCap className="h-4 w-4" />}
              label="Students"
              value={loading ? "..." : formatOptionalStat(detail?.studentCount)}
            />
            <SchoolDetailMetric
              icon={<Users className="h-4 w-4" />}
              label="Teachers"
              value={loading ? "..." : formatOptionalStat(detail?.teacherCount)}
            />
            <SchoolDetailMetric icon={<Star className="h-4 w-4" />} label="Rating" value={ratingText} />
            <SchoolDetailMetric icon={<Percent className="h-4 w-4" />} label="Pass Rate" value={passRate} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-5">
              <h3 className="mb-4 text-base font-semibold text-foreground">ကျောင်းအချက်အလက်</h3>
              <div className="grid gap-3">
                <SchoolDetailInfoRow
                  icon={<UserRound className="h-4 w-4" />}
                  label="ကျောင်းအုပ်"
                  value={loading ? "..." : detail?.principalName || "-"}
                />
                <SchoolDetailInfoRow
                  icon={<BookOpen className="h-4 w-4" />}
                  label="သင်တန်းအဆင့်"
                  value={gradeRange}
                />
                <SchoolDetailInfoRow
                  icon={<Trophy className="h-4 w-4" />}
                  label="Distinctions"
                  value={formatOptionalStat(detail?.distinction_count ?? school.distinction_count)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/70 p-5">
              <h3 className="mb-4 text-base font-semibold text-foreground">ဆက်သွယ်ရန်</h3>
              <div className="grid gap-3">
                <SchoolDetailInfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={contactPhone || "-"} />
                <SchoolDetailInfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={contactEmail || "-"} />
                <SchoolDetailInfoRow
                  icon={<ExternalLink className="h-4 w-4" />}
                  label="Website"
                  value={
                    websiteHref ? (
                      <a
                        href={websiteHref}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate font-medium text-primary hover:underline"
                      >
                        {displaySchool.website}
                      </a>
                    ) : (
                      "-"
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/70 p-5">
            <h3 className="mb-4 text-base font-semibold text-foreground">တည်နေရာ</h3>
            <SchoolDetailInfoRow
              icon={<MapPin className="h-4 w-4" />}
              label={location}
              value={displaySchool.address || "-"}
            />
          </div>
        </div>

        <DialogFooter className="gap-3 border-t border-border/70 px-6 py-5 sm:px-8">
          {canApply ? (
            <a
              href={applyHref}
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:bg-primary/90"
            >
              ကျောင်းလျှောက်ရန်
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex h-11 items-center justify-center rounded-full bg-muted px-6 text-sm font-semibold text-muted-foreground"
            >
              {acceptingStudents ? "ဆက်သွယ်ရန် မရှိသေးပါ" : "လက်ရှိ လျှောက်ထားမရပါ"}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SchoolDetailMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="text-xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

function SchoolDetailInfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[32px_minmax(0,0.42fr)_minmax(0,0.58fr)] items-center gap-3 text-sm">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</div>
      <div className="min-w-0 truncate font-medium text-muted-foreground">{label}</div>
      <div className="min-w-0 truncate text-right font-semibold text-foreground">{value}</div>
    </div>
  );
}
