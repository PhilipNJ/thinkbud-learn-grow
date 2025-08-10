import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Home = () => {
  const navigate = useNavigate();

  // If a user is already signed in, send them straight to their dashboard
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate("/dashboard");
    };
    init();

    document.title = "ThinkBud — 11+ Exam Prep";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "ThinkBud is an AI‑based affordable learning app for 11+ exam prep.");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex items-center justify-between py-4">
          <div className="font-bold text-xl">ThinkBud</div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/auth")}>Sign in</Button>
            <Button onClick={() => navigate("/auth")}>Start free</Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container py-16 md:py-24">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Master the 11+ with daily, bite‑sized practice
              </h1>
              <p className="text-muted-foreground text-lg">
                ThinkBud is an AI‑based affordable learning app for 11+ exam prep. Get 10 tailored questions a day, track your progress, and build strong habits.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" onClick={() => navigate("/auth")}>Start learning</Button>
                <Button size="lg" variant="outline" onClick={() => {
                  const el = document.getElementById("features");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}>See features</Button>
              </div>
              <div className="text-xs text-muted-foreground">No credit card required</div>
            </div>
            <div className="relative">
              <div className="aspect-[16/10] w-full rounded-xl border bg-gradient-to-br from-primary/10 via-transparent to-primary/20" />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-muted/30 border-y">
          <div className="container py-16 md:py-20">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="space-y-2">
                <h3 className="font-semibold">Daily 10</h3>
                <p className="text-sm text-muted-foreground">Practice 10 focused questions each day to build consistent momentum without overwhelm.</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">AI‑guided practice</h3>
                <p className="text-sm text-muted-foreground">Smart question selection across Maths, English, Verbal and Non‑Verbal Reasoning.</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Affordable for families</h3>
                <p className="text-sm text-muted-foreground">Accessible pricing designed to support every learner preparing for the 11+.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="container py-16 md:py-20">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold">How ThinkBud works</h2>
            <p className="text-muted-foreground">Three simple steps to build a winning routine.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border p-6">
              <div className="text-sm font-semibold mb-1">1. Create your account</div>
              <div className="text-sm text-muted-foreground">Sign up in seconds—no payment needed to get started.</div>
            </div>
            <div className="rounded-lg border p-6">
              <div className="text-sm font-semibold mb-1">2. Practice 10 a day</div>
              <div className="text-sm text-muted-foreground">Short, daily sessions keep learners engaged and improving.</div>
            </div>
            <div className="rounded-lg border p-6">
              <div className="text-sm font-semibold mb-1">3. Track your progress</div>
              <div className="text-sm text-muted-foreground">See streaks and growth over time to stay motivated.</div>
            </div>
          </div>
          <div className="mt-10 text-center">
            <Button size="lg" onClick={() => navigate("/auth")}>Get started free</Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container py-6 text-xs text-muted-foreground flex items-center justify-between">
          <div>© {new Date().getFullYear()} ThinkBud</div>
          <a className="hover:underline" href="/auth">Sign in</a>
        </div>
      </footer>
    </div>
  );
};

export default Home;
