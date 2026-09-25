import HirlevelMuvelet from "../hirlevel-muvelet";
export const metadata = { robots: { index: false, follow: false } };
export default async function HirlevelLeiratkozas({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const { token } = await searchParams; return <HirlevelMuvelet token={token ?? ""} tipus="leiratkozas" />; }
