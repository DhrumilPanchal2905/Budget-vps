// Angel for visitors on the public pages (no account): money questions, calculators and web answers.
// Mount once inside the public layout (it renders only the floating launcher + panel).
import { AngelProvider } from "./angel-provider";

export function GuestAngel() {
  return <AngelProvider guest>{null}</AngelProvider>;
}

export default GuestAngel;
