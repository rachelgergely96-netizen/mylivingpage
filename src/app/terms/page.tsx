import LegalPolicyPage from "@/components/legal/LegalPolicyPage";
import { getPolicyMetadata } from "@/lib/legal/site-config";

export const metadata = getPolicyMetadata("terms");

export default function TermsPage() {
  return <LegalPolicyPage policyId="terms" />;
}
