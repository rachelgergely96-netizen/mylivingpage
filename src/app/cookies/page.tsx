import LegalPolicyPage from "@/components/legal/LegalPolicyPage";
import { getPolicyMetadata } from "@/lib/legal/site-config";

export const metadata = getPolicyMetadata("cookies");

export default function CookiesPage() {
  return <LegalPolicyPage policyId="cookies" />;
}
