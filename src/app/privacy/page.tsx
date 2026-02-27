import LegalPolicyPage from "@/components/legal/LegalPolicyPage";
import { getPolicyMetadata } from "@/lib/legal/site-config";

export const metadata = getPolicyMetadata("privacy");

export default function PrivacyPage() {
  return <LegalPolicyPage policyId="privacy" />;
}
