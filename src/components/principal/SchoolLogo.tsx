import { useEffect, useState } from "react";
import { School } from "lucide-react";
import { getSchoolImageUrl } from "@/lib/school-images";
import { cn } from "@/lib/utils";

const SCHOOL_LOGO_STORAGE_PREFIX = "/storage/v1/object/public/application-school-logos/";

const normalizePrincipalSchoolLogoPath = (path?: string | null) => {
  const value = path?.trim() || "";
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const storageIndex = value.indexOf(SCHOOL_LOGO_STORAGE_PREFIX);
  if (storageIndex >= 0) {
    return decodeURIComponent(value.slice(storageIndex + SCHOOL_LOGO_STORAGE_PREFIX.length));
  }
  return value;
};

export function SchoolLogo({
  path,
  schoolName,
  className,
  iconClassName,
}: {
  path?: string | null;
  schoolName: string;
  className?: string;
  iconClassName?: string;
}) {
  const [resolvedUrl, setResolvedUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    setResolvedUrl("");
    void getSchoolImageUrl(normalizePrincipalSchoolLogoPath(path)).then((url) => {
      if (active) setResolvedUrl(url);
    });
    return () => {
      active = false;
    };
  }, [path]);

  return (
    <div
      className={cn(
        "theme-icon-tile-strong grid shrink-0 place-items-center overflow-hidden rounded-2xl",
        className,
      )}
    >
      {resolvedUrl && !failed ? (
        <img
          src={resolvedUrl}
          alt={`${schoolName} ကျောင်းအမှတ်တံဆိပ်`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <School className={cn("h-5 w-5", iconClassName)} aria-hidden="true" />
      )}
    </div>
  );
}
