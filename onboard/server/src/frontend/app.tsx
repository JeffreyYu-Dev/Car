import { createRoot } from "react-dom/client";
import { Toaster } from "@/frontend/components/ui/sonner";
import { HomePage } from "@/frontend/pages/HomePage";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <>
    <HomePage />
    <Toaster />
  </>,
);
