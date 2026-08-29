import { AccountsClient } from "./AccountsClient";

export const metadata = {
  title: "Accounts | ProdBrogy",
  robots: {
    index: false,
    follow: false
  }
};

export default function AccountsPage() {
  return <AccountsClient />;
}
