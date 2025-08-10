import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useDailyQuestions } from "@/hooks/useDailyQuestions";
import { supabase } from "@/integrations/supabase/client";

const Play = () => {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [answersToday, setAnswersToday] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Play | ThinkBud";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Answer your 10 daily practice questions in ThinkBud.");
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return navigate("/auth");
      setUserId(data.session.user.id);
    };
    init();
  }, [navigate]);

  // Load today's answer count to lock the session after 10
  useEffect(() => {
    const loadCount = async () => {
      if (!userId) return;
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const { count } = await supabase
        .from("user_answers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("answered_at", start.toISOString())
        .lte("answered_at", end.toISOString());
      setAnswersToday(typeof count === "number" ? count : 0);
    };
    loadCount();
  }, [userId]);

  const { data, isLoading, isError } = useDailyQuestions(userId);

  const q = useMemo(() => data?.questions[idx], [data, idx]);

  const onAnswer = async (choice: string) => {
    if (!q || !userId) return;
    // Prevent answering if daily limit reached
    if ((answersToday ?? 0) >= 10) return;
    setSelected(choice);
    const correct = q.correct_answer?.toLowerCase() === choice.toLowerCase();
    setFeedback(correct ? "correct" : "wrong");
    // Persist answer
    await supabase.from("user_answers").insert({
      user_id: userId,
      question_id: q.id,
      chosen_answer: choice,
      correct,
    });
    // Optimistically bump today's count
    setAnswersToday((c) => (c ?? 0) + 1);
  };

  const onNext = () => {
    setSelected(null);
    setFeedback(null);
    if (!data) return;
    // If not last question, go to next
    if (idx < data.questions.length - 1) {
      setIdx((i) => i + 1);
      return;
    }
    // On last question, finalize session and navigate to dashboard
    const finalize = async () => {
      try {
        if (!userId) return navigate("/dashboard");
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const today = start.toISOString().slice(0, 10);

        // Fetch today answers to compute rollup
        const { data: answers } = await supabase
          .from("user_answers")
          .select("correct, answered_at")
          .eq("user_id", userId)
          .gte("answered_at", start.toISOString())
          .lte("answered_at", end.toISOString());

        const attempted = answers?.length ?? 0;
        const correct = answers?.filter((a) => a.correct).length ?? 0;
        const accuracy = attempted > 0 ? Math.round((correct / attempted) * 10000) / 100 : 0;

        // Check existing daily_stats to update streak once per day on completion
        const { data: existingStats } = await supabase
          .from("daily_stats")
          .select("questions_attempted")
          .eq("user_id", userId)
          .eq("date", today)
          .maybeSingle();

        // Upsert daily rollup
        await supabase
          .from("daily_stats")
          .upsert(
            {
              user_id: userId,
              date: today,
              questions_attempted: attempted,
              questions_correct: correct,
              accuracy,
            },
            { onConflict: "user_id,date" }
          );

        // Increment streak only when crossing the completion threshold today
        if ((existingStats?.questions_attempted ?? 0) < 10 && attempted >= 10) {
          // Simple increment: read current streak then set streak+1
          const { data: prof } = await supabase
            .from("profiles")
            .select("streak")
            .eq("id", userId)
            .maybeSingle();
          if (prof) {
            await supabase
              .from("profiles")
              .update({ streak: (prof.streak ?? 0) + 1 })
              .eq("id", userId);
          }
        }

        // Log activity
        await supabase
          .from("activity_log")
          .insert({
            user_id: userId,
            event_type: "session_finished",
            details: { attempted, correct, accuracy },
          });
      } catch (e) {
        // Non-blocking errors; still navigate
        console.error("Failed to finalize session", e);
      } finally {
        navigate("/dashboard");
      }
    };
    finalize();
  };

  if (isLoading || !userId || answersToday === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading…</div>
    );
  }
  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-destructive">Failed to load daily questions.</div>
    );
  }

  // If already completed 10 today, show finished screen and block more answers until midnight
  if ((answersToday ?? 0) >= 10) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container py-10">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Nice work!</CardTitle>
              <CardDescription>You've completed today's 10 questions. Come back after midnight.</CardDescription>
            </CardHeader>
            <CardFooter className="flex gap-2">
              <Button className="w-full" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  // Finished via progressing through the session
  if (idx >= data.questions.length) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container py-10">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Nice work!</CardTitle>
              <CardDescription>You finished today's session.</CardDescription>
            </CardHeader>
            <CardFooter className="flex gap-2">
              <Button className="w-full" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex items-center justify-between py-4">
          <div className="font-bold text-xl">Play</div>
          <Button variant="secondary" onClick={() => navigate("/dashboard")}>Dashboard</Button>
        </div>
      </header>
      <main className="container py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Question {idx + 1} of {data.questions.length}</CardTitle>
            <CardDescription className="capitalize">{q?.subject} • {q?.difficulty}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-base">{q?.question_text}</div>
            <div className="grid gap-2">
              {(["a","b","c","d"] as const).map((key) => {
                const text = (q as any)[`option_${key}`] as string;
                return (
                  <Button
                    key={key}
                    variant={selected === key ? "secondary" : "outline"}
        disabled={!!feedback || (answersToday ?? 0) >= 10}
                    onClick={() => onAnswer(key)}
                  >
                    {key.toUpperCase()}. {text}
                  </Button>
                );
              })}
            </div>
            {feedback && (
              <div className={feedback === "correct" ? "text-green-600" : "text-red-600"}>
                {feedback === "correct" ? "Correct!" : `Incorrect. Correct answer is ${(q?.correct_answer || "").toUpperCase()}.`}
                {q?.reasoning && (
                  <div className="mt-2 text-sm text-muted-foreground">{q.reasoning}</div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
      <Button className="w-full" onClick={onNext} disabled={!feedback || (answersToday ?? 0) >= 10}>{idx === data.questions.length - 1 ? "Finish" : "Next"}</Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default Play;
