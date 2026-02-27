import LegalIndexPage from "@/components/legal/LegalIndexPage";
import { getLegalIndexMetadata } from "@/lib/legal/site-config";

export const metadata = getLegalIndexMetadata();

export default function LegalPage() {
  return <LegalIndexPage />;
}
