import { Hero } from "@/components/Hero";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <div className="flex min-h-screen overflow-clip items-center justify-center">
      <Navbar />
      <main className="mt-8">
        <Hero />
      </main>
    </div>
  );
}
