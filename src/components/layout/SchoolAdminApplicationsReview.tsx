import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  MapPin,
  School,
  User,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { reviewSchoolAdminApplication } from "@/lib/api/school-admin-account.functions";
import { GlassCard } from "@/components/ui-kit/GlassCard";
import { FilterBar, FilterSelect } from "@/components/ui-kit/FilterBar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ApplicationRecord {
  id: string;
  status: "pending" | "approved" | "rejected";
  full_name_mm: string;
  full_name_en: string | null;
  email: string;
  phone: string;
  date_of_birth: string | null;
  gender: string | null;
  nrc_number: string;
  residential_address: string | null;
  nrc_front_url: string | null;
  nrc_back_url: string | null;
  school_name: string;
  school_type: string;
  school_level: string | null;
  grade_from: string | null;
  grade_to: string | null;
  region_id: number | null;
  school_township_id: number | null;
  school_address: string;
  latitude: number | null;
  longitude: number | null;
  license_document_url: string | null;
  building_document_url: string | null;
  land_document_url: string | null;
  owner_application_document_url: string | null;
  logo_url?: string | null;
  school_phone: string | null;
  school_email: string | null;
  approved_profile_id: string | null;
  approved_school_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface TownshipRecord {
  id: number;
  name: string;
}

interface RegionRecord {
  id: number;
  name: string;
}

export function SchoolAdminApplicationsReview() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [townships, setTownships] = useState<TownshipRecord[]>([]);
  const [regions, setRegions] = useState<RegionRecord[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const townshipNameById = useMemo(
    () => new Map(townships.map((township) => [township.id, township.name])),
    [townships],
  );
  const regionNameById = useMemo(
    () => new Map(regions.map((region) => [region.id, region.name])),
    [regions],
  );

  const fetchApplications = async () => {
    setLoading(true);
    setErrorMessage("");

    const [
      { data: applicationData, error: applicationError },
      { data: townshipData },
      { data: regionData },
    ] = await Promise.all([
      supabase
        .from("registration_requests")
        .select("*")
        .eq("request_type", "school_admin")
        .order("created_at", { ascending: false }),
      supabase.from("townships").select("id, name"),
      supabase.from("regions").select("id, name"),
    ]);

    if (applicationError) {
      setErrorMessage(applicationError.message);
      setApplications([]);
    } else {
      setApplications((applicationData || []) as ApplicationRecord[]);
    }

    setTownships((townshipData || []) as TownshipRecord[]);
    setRegions((regionData || []) as RegionRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const filteredApplications = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return applications.filter((application) => {
      const searchable = [
        application.full_name_mm,
        application.full_name_en,
        application.email,
        application.phone,
        application.nrc_number,
        application.school_name,
        application.school_type,
        application.status,
        application.region_id ? regionNameById.get(application.region_id) : "",
        application.school_township_id ? townshipNameById.get(application.school_township_id) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesStatus = !statusFilter || application.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, regionNameById, search, statusFilter, townshipNameById]);

  const updateApplicationStatus = async (status: "approved" | "rejected") => {
    if (!selectedApplication) return;
    if (status === "rejected" && !rejectionReason.trim()) {
      setErrorMessage("ငြင်းပယ်ရန် အကြောင်းပြချက် ဖြည့်သွင်းပါ။");
      return;
    }

    setActionLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      setErrorMessage(sessionError.message);
      setActionLoading(false);
      return;
    }

    if (!session?.user?.id) {
      setErrorMessage("Super admin login session မရှိပါ။");
      setActionLoading(false);
      return;
    }

    try {
      const result = await reviewSchoolAdminApplication({
        data: {
          applicationId: selectedApplication.id,
          status,
          rejectionReason: status === "rejected" ? rejectionReason.trim() : undefined,
          accessToken: session.access_token,
        },
      });

      setSelectedApplication(null);
      setRejectionReason("");
      if (status === "approved" && "message" in result && result.message) {
        setSuccessMessage(result.message);
      }
      await fetchApplications();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Application review ပြုလုပ်ရာတွင် အမှားရှိပါသည်။");
    }

    setActionLoading(false);
  };

  const openDocument = async (document: UploadedDocument) => {
    if (!document.path) return;

    setErrorMessage("");

    const { data, error } = await supabase.storage
      .from(document.bucket)
      .createSignedUrl(document.path, 60 * 5);

    if (error || !data?.signedUrl) {
      setErrorMessage(
        error?.message || `${document.label} ဖိုင်ကို ဖွင့်၍မရပါ။ Storage permission ကို စစ်ဆေးပါ။`,
      );
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="aqua-section-title mb-2 text-xs uppercase tracking-[0.24em]">Super Admin Review</p>
          <h1 className="text-2xl font-bold glow-text">School Admin Applications</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Pending application တစ်ခုချင်းစီတွင် applicant personal data, school data နှင့် documents အားလုံးကို တစ်စုတစ်စည်းတည်း စစ်ဆေးနိုင်သည်။
          </p>
        </div>
        <div className="glass-panel rounded-2xl px-4 py-3 text-sm font-bold text-primary">
          registration_requests data
        </div>
      </div>

      <FilterBar
        searchPlaceholder="Applicant, email, NRC, school name ဖြင့်ရှာရန်..."
        searchValue={search}
        onSearchChange={setSearch}
      >
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={["pending", "approved", "rejected"]}
        />
      </FilterBar>

      {errorMessage && (
        <div className="glass-panel rounded-2xl border border-destructive/30 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="glass-panel rounded-2xl border border-emerald-500/30 p-4 text-sm font-medium text-emerald-600 dark:text-emerald-300">
          {successMessage}
        </div>
      )}

      <GlassCard className="overflow-hidden rounded-[2rem] p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="border-b border-border/60 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="px-4 py-4">Application Date</th>
                <th className="px-4 py-4">Applicant Name</th>
                <th className="px-4 py-4">Email</th>
                <th className="px-4 py-4">Phone</th>
                <th className="px-4 py-4">NRC</th>
                <th className="px-4 py-4">School Name</th>
                <th className="px-4 py-4">School Type</th>
                <th className="px-4 py-4">Region / Township</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-10 text-center text-muted-foreground" colSpan={10}>
                    Loading applications...
                  </td>
                </tr>
              ) : filteredApplications.length ? (
                filteredApplications.map((application) => (
                  <tr key={application.id} className="border-b border-border/40 hover:bg-primary/5">
                    <td className="px-4 py-4">{new Date(application.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-4 font-semibold">{application.full_name_mm}</td>
                    <td className="px-4 py-4">{application.email}</td>
                    <td className="px-4 py-4">{application.phone}</td>
                    <td className="px-4 py-4">{application.nrc_number}</td>
                    <td className="px-4 py-4">{application.school_name}</td>
                    <td className="px-4 py-4">{application.school_type}</td>
                    <td className="px-4 py-4">
                      <span className="block font-medium">
                        {application.region_id
                          ? regionNameById.get(application.region_id) || application.region_id
                          : "-"}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {application.school_township_id
                          ? townshipNameById.get(application.school_township_id) || application.school_township_id
                          : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={application.status} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        className="glass-panel inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold hover:glow-ring"
                        onClick={() => {
                          setSelectedApplication(application);
                          setRejectionReason(application.rejection_reason || "");
                        }}
                      >
                        <Eye className="h-4 w-4" /> View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-muted-foreground" colSpan={10}>
                    Matching application မရှိသေးပါ။
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Dialog open={Boolean(selectedApplication)} onOpenChange={(open) => !open && setSelectedApplication(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          {selectedApplication && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Application Detail
                </DialogTitle>
                <DialogDescription>{selectedApplication.id}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <DetailSection
                  icon={User}
                  title="Personal Information"
                  items={[
                    ["Myanmar Name", selectedApplication.full_name_mm],
                    ["English Name", selectedApplication.full_name_en || "-"],
                    ["Email", selectedApplication.email],
                    ["Phone", selectedApplication.phone],
                    ["Date of Birth", selectedApplication.date_of_birth || "-"],
                    ["Gender", selectedApplication.gender || "-"],
                    ["NRC", selectedApplication.nrc_number],
                    ["Residential Address", selectedApplication.residential_address || "-"],
                  ]}
                />
                <DetailSection
                  icon={School}
                  title="School Information"
                  items={[
                    ["School Name", selectedApplication.school_name],
                    ["School Type", selectedApplication.school_type],
                    ["School Level", selectedApplication.school_level || "-"],
                    ["Grade From", selectedApplication.grade_from || "-"],
                    ["Grade To", selectedApplication.grade_to || "-"],
                    [
                      "Region / Township",
                      `${selectedApplication.region_id ? regionNameById.get(selectedApplication.region_id) || selectedApplication.region_id : "-"} / ${
                        selectedApplication.school_township_id
                          ? townshipNameById.get(selectedApplication.school_township_id) || selectedApplication.school_township_id
                          : "-"
                      }`,
                    ],
                    ["Address", selectedApplication.school_address],
                  ]}
                />
                <DocumentSection
                  documents={getUploadedDocuments(selectedApplication)}
                  onOpenDocument={openDocument}
                />
                <DetailSection
                  icon={MapPin}
                  title="Map / Status"
                  items={[
                    ["Latitude", selectedApplication.latitude?.toString() || "-"],
                    ["Longitude", selectedApplication.longitude?.toString() || "-"],
                    ["Status", selectedApplication.status],
                    ["Reviewed At", selectedApplication.reviewed_at || "-"],
                    ["Rejection Reason", selectedApplication.rejection_reason || "-"],
                  ]}
                />
              </div>

              {selectedApplication.status === "pending" && (
                <div className="glass-panel rounded-2xl p-4">
                  <label className="space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground">Rejection Reason</span>
                    <textarea
                      value={rejectionReason}
                      onChange={(event) => setRejectionReason(event.target.value)}
                      className="aqua-input min-h-24 w-full resize-none rounded-2xl px-4 py-3"
                      placeholder="Reject လုပ်မည်ဆိုပါက အကြောင်းပြချက်ရေးပါ"
                    />
                  </label>
                </div>
              )}

              <DialogFooter className="gap-3 sm:space-x-0">
                {selectedApplication.status === "pending" && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      className="glass-panel inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-destructive"
                      onClick={() => updateApplicationStatus("rejected")}
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      className="aqua-button inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-primary-foreground"
                      onClick={() => updateApplicationStatus("approved")}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold capitalize",
        status === "approved" && "bg-emerald-500/15 text-emerald-500",
        status === "rejected" && "bg-destructive/15 text-destructive",
        status === "pending" && "bg-primary/15 text-primary",
      )}
    >
      <Clock3 className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

type UploadedDocument = {
  label: string;
  bucket: "application-nrc-docs" | "application-school-docs" | "application-school-logos";
  path: string | null | undefined;
  buttonLabel: string;
  optional?: boolean;
};

const getUploadedDocuments = (application: ApplicationRecord): UploadedDocument[] =>
  [
    {
      label: "NRC Front",
      bucket: "application-nrc-docs",
      path: application.nrc_front_url,
      buttonLabel: "View",
    },
    {
      label: "NRC Back",
      bucket: "application-nrc-docs",
      path: application.nrc_back_url,
      buttonLabel: "View",
    },
    {
      label: "School License",
      bucket: "application-school-docs",
      path: application.license_document_url,
      buttonLabel: "Open PDF",
    },
    {
      label: "Building Document",
      bucket: "application-school-docs",
      path: application.building_document_url,
      buttonLabel: "Open PDF",
    },
    {
      label: "Land Document",
      bucket: "application-school-docs",
      path: application.land_document_url,
      buttonLabel: "Open PDF",
    },
    {
      label: "Owner Application Letter",
      bucket: "application-school-docs",
      path: application.owner_application_document_url,
      buttonLabel: "Open PDF",
    },
    {
      label: "School Logo",
      bucket: "application-school-logos",
      path: application.logo_url,
      buttonLabel: "View",
      optional: true,
    },
  ].filter((document) => !document.optional || document.path);

function DocumentSection({
  documents,
  onOpenDocument,
}: {
  documents: UploadedDocument[];
  onOpenDocument: (document: UploadedDocument) => void;
}) {
  return (
    <div className="glass-panel rounded-2xl p-4">
      <h3 className="mb-4 flex items-center gap-2 font-bold">
        <FileText className="h-4 w-4 text-primary" />
        Uploaded Documents
      </h3>
      <div className="space-y-3">
        {documents.map((document) => (
          <div
            key={document.label}
            className="flex flex-col gap-3 rounded-2xl border border-border/45 bg-background/20 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Document Name</p>
              <p className="mt-1 text-sm font-semibold">{document.label}</p>
            </div>
            {document.path ? (
              <button
                type="button"
                className="glass-panel inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-primary transition-all hover:glow-ring"
                onClick={() => onOpenDocument(document)}
              >
                <Eye className="h-4 w-4" />
                {document.buttonLabel}
              </button>
            ) : (
              <span className="rounded-xl border border-border/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                Not uploaded
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailSection({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof User;
  title: string;
  items: Array<[string, string]>;
}) {
  return (
    <div className="glass-panel rounded-2xl p-4">
      <h3 className="mb-4 flex items-center gap-2 font-bold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h3>
      <div className="space-y-3">
        {items.map(([label, value]) => (
          <div key={label}>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
            <p className="mt-1 break-words text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
