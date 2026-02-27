import LegalPolicyPage from "@/components/legal/LegalPolicyPage";
import { getPolicyMetadata } from "@/lib/legal/site-config";

export const metadata = getPolicyMetadata("security");

export default function SecurityPage() {
  return <LegalPolicyPage policyId="security" />;
}
