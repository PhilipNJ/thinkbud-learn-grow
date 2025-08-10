import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZE = 25;

const Questions = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [difficulty, setDifficulty] = useState<"all" | "easy" | "moderate" | "difficult">("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    document.title = "Browse Questions | ThinkBud";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Browse practice questions by difficulty in ThinkBud.");
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) navigate("/auth");
    };
    init();
  }, [navigate]);

  const queryKey = useMemo(() => ["questions", { difficulty, page }], [difficulty, page]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase
        .from("questions")
        .select("id, subject, difficulty, question_text", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (difficulty !== "all") {
        q = q.eq("difficulty", difficulty);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-bold">Questions</h1>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate("/dashboard")}>Dashboard</Button>
          </div>
        </div>
      </header>
      <main className="container py-6 space-y-4">
        <section className="flex items-center gap-3">
          <Select value={difficulty} onValueChange={(v) => { setPage(0); setDifficulty(v as any); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All difficulties</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="difficult">Difficult</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>Refresh</Button>
        </section>

        <section>
          {isLoading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : isError ? (
            <div className="text-destructive">Failed to load questions.</div>
          ) : data && data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Question</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>{q.subject}</TableCell>
                    <TableCell className="capitalize">{q.difficulty}</TableCell>
                    <TableCell className="max-w-[600px] truncate">{q.question_text}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>Showing {data.length} items</TableCaption>
            </Table>
          ) : (
            <div className="text-muted-foreground">No questions found.</div>
          )}
        </section>

        <section className="flex items-center gap-2">
          <Button variant="outline" disabled={page===0} onClick={() => setPage((p) => Math.max(0, p-1))}>Previous</Button>
          <Button variant="outline" onClick={() => setPage((p) => p+1)}>Next</Button>
        </section>
      </main>
    </div>
  );
};

export default Questions;
