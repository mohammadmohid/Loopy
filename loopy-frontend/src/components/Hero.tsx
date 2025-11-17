"use client";

import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

export const Hero = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, i) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(204, 41, 54, ${particle.opacity})`;
        ctx.fill();

        particles.forEach((particle2, j) => {
          if (i === j) return;
          const dx = particle.x - particle2.x;
          const dy = particle.y - particle2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particle2.x, particle2.y);
            ctx.strokeStyle = `rgba(204, 41, 54, ${
              0.1 * (1 - distance / 100)
            })`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh opacity-60"></div>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none opacity-40"
      />

      <div
        className="absolute w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-blob"
        style={{ top: "20%", left: "10%" }}
      />
      <div
        className="absolute w-96 h-96 rounded-full bg-accent/20 blur-3xl animate-blob animation-delay-2000"
        style={{ top: "40%", right: "10%" }}
      />

      <div
        className="absolute w-[600px] h-[600px] rounded-full bg-gradient-blur pointer-events-none transition-all duration-1000 ease-out blur-3xl"
        style={{ left: mousePosition.x - 300, top: mousePosition.y - 300 }}
      />

      <div className="container px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 backdrop-blur-xl border border-border/50 shadow-soft animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <span className="text-sm text-muted-foreground font-medium">
              AI-Powered Collaboration Platform
            </span>
          </div>

          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[1.1] animate-fade-in-up">
            <span className="block text-foreground">Stop Drowning in</span>
            <span className="block gradient-text">Meetings & Chaos</span>
          </h1>

          <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
            Loopy turns fragmented conversations into actionable insights.
            Record, transcribe, and auto-generate tasks from every meeting—all
            in one unified workspace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-400">
            <Button
              size="lg"
              className="group text-lg px-8 py-6 rounded-2xl shadow-primary hover:shadow-glow transition-all duration-300 hover:scale-105"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="group text-lg px-8 py-6 rounded-2xl bg-card/60 backdrop-blur-xl border-border/50 hover:bg-card/80 transition-all duration-300"
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

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 rounded-full bg-primary animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};
