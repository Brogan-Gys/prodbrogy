import { HomeClient } from "./HomeClient";
import { getSounds } from "@/lib/sanity/queries";

export default async function Home() {
  const sounds = await getSounds();

  return <HomeClient sounds={sounds} />;
}
