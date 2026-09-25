import type { Metadata } from "next";
import "./megjelenes.css";
import "./termek-kepek.css";
import "./katalogus.css";
import "./kosar.css";

export const metadata: Metadata = {
  title: "HC Home Fitness | Otthoni edzés",
  description: "Fedezd fel az otthoni edzéshez készült fitneszeszközöket a HC Home Fitness kínálatában.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="hu"><body>{children}</body></html>;
}
