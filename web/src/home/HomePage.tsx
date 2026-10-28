import { Hero } from "./Hero.tsx";
import { PrinciplesSection } from "./PrinciplesSection.tsx";
import { WorkSection } from "./WorkSection.tsx";

/** Home: the hero, "What I build", then "How I develop" (R1.1). */
export function HomePage() {
  return (
    <>
      <Hero />
      <WorkSection />
      <PrinciplesSection />
    </>
  );
}
