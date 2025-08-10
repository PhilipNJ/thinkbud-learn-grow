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

  const { data, isLoading, isError } = useDailyQuestions(userId);

  const q = useMemo(() => data?.questions[idx], [data, idx]);

  const onAnswer = async (choice: string) => {
    if (!q || !userId) return;
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
  };

  const onNext = () => {
    setSelected(null);
    setFeedback(null);
    if (data && idx < data.questions.length - 1) setIdx((i) => i + 1);
  };

  if (isLoading || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading…</div>
    );
  }
  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-destructive">Failed to load daily questions.</div>
    );
  }

  // Finished
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
                    disabled={!!feedback}
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
            <Button className="w-full" onClick={onNext} disabled={!feedback}>{idx === data.questions.length - 1 ? "Finish" : "Next"}</Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default Play;
