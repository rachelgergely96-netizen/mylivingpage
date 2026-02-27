import LegalPolicyPage from "@/components/legal/LegalPolicyPage";
import { getPolicyMetadata } from "@/lib/legal/site-config";

export const metadata = getPolicyMetadata("dmca");

export default function DmcaPage() {
  return <LegalPolicyPage policyId="dmca" />;
}
