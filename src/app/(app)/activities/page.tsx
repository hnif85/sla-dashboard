import { Suspense } from "react";
import ActivitiesClient from "./ActivitiesClient";

export default function ActivitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
        </div>
      }
    >
      <ActivitiesClient />
    </Suspense>
  );
}

