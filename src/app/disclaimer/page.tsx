import LegalPolicyPage from "@/components/legal/LegalPolicyPage";
import { getPolicyMetadata } from "@/lib/legal/site-config";

export const metadata = getPolicyMetadata("disclaimer");

export default function DisclaimerPage() {
  return <LegalPolicyPage policyId="disclaimer" />;
}
