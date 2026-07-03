import { createFileRoute } from "@tanstack/react-router";
import { SchoolRegistrationForm } from "@/components/layout/SchoolRegistrationForm";

export const Route = createFileRoute("/register/school")({
  head: () => ({
    meta: [{ title: "ကျောင်းအချက်အလက် မှတ်ပုံတင်ခြင်း — Myanmar EDU" }],
  }),
  component: SchoolRegistrationPage,
});

function SchoolRegistrationPage() {
  return (
    <div className="aqua-page px-4 py-12 sm:px-6">
      <SchoolRegistrationForm />
    </div>
  );
}
