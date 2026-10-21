import { RequirePerm } from "@/components/guard";
import { FinancePage } from "@/components/finance-manager";

export default function Page() {
  return (
    <RequirePerm perm={["finance.read", "goal.view"]}>
      <FinancePage resource="goal" />
    </RequirePerm>
  );
}
