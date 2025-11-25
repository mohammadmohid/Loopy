"use client";

import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export const Hero = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section className="relative">
      <div
        className="absolute -z-10 w-[750px] h-[750px] rounded-full bg-gradient-mesh pointer-events-none transition-all duration-1500 ease-out blur-3xl"
        style={{ left: mousePosition.x - 650, top: mousePosition.y - 350 }}
      />

      <div className="px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card backdrop-blur-xl shadow-soft animate-fade-in">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-sm text-muted-foreground font-medium">
                AI-Powered Collaboration Platform
              </span>
            </div>

            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight animate-fade-in-up">
              <span className="block text-foreground">Stop Drowning in</span>
              <span className="block gradient-text leading-[1.2]">
                Meetings & Chaos.
              </span>
            </h1>
          </div>

          <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
            Loopy turns fragmented conversations into actionable insights.
            Record, transcribe, and auto-generate tasks from every meeting—all
            in one unified workspace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-400">
            <Button
              size="lg"
              className="group text-lg rounded-2xl shadow-primary hover:shadow-glow transition-all duration-300 hover:scale-105"
            >
              Start building
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="group text-lg rounded-2xl bg-card/60 backdrop-blur-xl border-border hover:bg-card-foreground/5 transition-all duration-300"
            >
              <Play className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
              Watch Demo
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 pt-8 animate-fade-in animation-delay-600">
            <div className="glass-card px-6 py-3 rounded-xl">
              <p className="text-sm text-muted-foreground">
                <span className="text-2xl font-bold gradient-text">87%</span>
                <br />
                Less Meetings
              </p>
            </div>
            <div className="glass-card px-6 py-3 rounded-xl">
              <p className="text-sm text-muted-foreground">
                <span className="text-2xl font-bold gradient-text">3.5hrs</span>
                <br />
                Saved Daily
              </p>
            </div>
            <div className="glass-card px-6 py-3 rounded-xl">
              <p className="text-sm text-muted-foreground">
                <span className="text-2xl font-bold gradient-text">100%</span>
                <br />
                Task Capture
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
