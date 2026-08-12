import { createRoot } from "react-dom/client";
import { Toaster } from "@/frontend/components/ui/sonner";
import { DashboardPage } from "@/frontend/pages/DashboardPage";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <>
    <DashboardPage />
    <Toaster />
  </>,
);
