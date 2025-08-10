
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

// Update this page to require auth and show a friendly dashboard
const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [answersToday, setAnswersToday] = useState<number>(0);
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        navigate("/auth");
        return;
      }

      const user = session.user;
      setUserEmail(user.email ?? null);

      // Load profile info
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("name, streak")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[Index] Failed to load profile:", error);
      }
      if (profile) {
        setDisplayName(profile.name ?? null);
        setStreak(profile.streak ?? 0);
      } else {
        setDisplayName((user.user_metadata as any)?.name ?? null);
      }

      // Load progress for today
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const { count: answersCount, error: answersError } = await supabase
        .from("user_answers")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("answered_at", start.toISOString())
        .lte("answered_at", end.toISOString());

      if (answersError) {
        console.error("[Index] Failed to load today's answers count:", answersError);
      }
      if (typeof answersCount === "number") {
        setAnswersToday(answersCount);
      }

      if (mounted) setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out", description: "See you tomorrow!" });
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex items-center justify-between py-4">
          <div className="font-bold text-xl">ThinkBud</div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">{userEmail}</div>
            <Button variant="secondary" onClick={handleSignOut}>Sign out</Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Welcome back{displayName ? `, ${displayName}` : ""}!</CardTitle>
            <CardDescription>
              You have 10 questions to keep your streak alive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Current streak</div>
              <div className="text-lg font-semibold">{streak} days</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Questions Today</div>
              <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(answersToday, 10) * 10}%` }}
                />
              </div>
              <div className="text-right text-sm text-muted-foreground">{Math.min(answersToday, 10)} / 10</div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button className="w-full" onClick={() => navigate("/play")}>
              Start today’s session
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default Index;
