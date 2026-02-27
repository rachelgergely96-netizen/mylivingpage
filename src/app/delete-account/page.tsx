import LegalPolicyPage from "@/components/legal/LegalPolicyPage";
import { getPolicyMetadata } from "@/lib/legal/site-config";

export const metadata = getPolicyMetadata("delete-account");

export default function DeleteAccountPage() {
  return <LegalPolicyPage policyId="delete-account" />;
}
