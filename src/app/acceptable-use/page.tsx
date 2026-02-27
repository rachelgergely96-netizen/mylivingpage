import LegalPolicyPage from "@/components/legal/LegalPolicyPage";
import { getPolicyMetadata } from "@/lib/legal/site-config";

export const metadata = getPolicyMetadata("acceptable-use");

export default function AcceptableUsePage() {
  return <LegalPolicyPage policyId="acceptable-use" />;
}
