import { PipelineFilterProvider } from "@/contexts/PipelineFilterContext";
import AppShell from "@/components/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PipelineFilterProvider>
      <AppShell>{children}</AppShell>
    </PipelineFilterProvider>
  );
}
