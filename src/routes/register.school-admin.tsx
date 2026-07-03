import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { SchoolAdminRegistrationForm } from "@/components/layout/SchoolAdminRegistrationForm";
import { SchoolRegistrationForm } from "@/components/layout/SchoolRegistrationForm";
import type { SchoolAdminPersonalDraft, SchoolAdminPersonalFileDraft } from "@/lib/school-admin-application";

export const Route = createFileRoute("/register/school-admin")({
  head: () => ({ meta: [{ title: "ကျောင်းအုပ်ချုပ်ရေးမှူး လျှောက်ထားခြင်း — Myanmar EDU" }] }),
  component: SchoolAdminRegistrationRoute,
});

function SchoolAdminRegistrationRoute() {
  const location = useLocation();

  if (location.pathname !== "/register/school-admin") {
    return <Outlet />;
  }

  return <SchoolAdminRegistrationPage />;
}

function SchoolAdminRegistrationPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [personalDraft, setPersonalDraft] = useState<SchoolAdminPersonalDraft | null>(null);
  const [personalFiles, setPersonalFiles] = useState<SchoolAdminPersonalFileDraft | null>(null);

  return (
    <div className="aqua-page py-12 px-4 sm:px-6">
      {step === 1 ? (
        <SchoolAdminRegistrationForm
          onComplete={(draft, files) => {
            setPersonalDraft(draft);
            setPersonalFiles(files);
            setStep(2);
            window.scrollTo(0, 0);
          }}
        />
      ) : (
        <SchoolRegistrationForm
          personalDraft={personalDraft}
          personalFiles={personalFiles}
          onBack={() => {
            setStep(1);
            window.scrollTo(0, 0);
          }}
        />
      )}
    </div>
  );
}
