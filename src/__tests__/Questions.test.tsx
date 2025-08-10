import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Questions from "@/pages/Questions";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) },
    from: () => ({
      select: () => ({ order: () => ({ range: async () => ({ data: [
        { id: "1", subject: "Algebra", difficulty: "easy", question_text: "1+1?" },
        { id: "2", subject: "Biology", difficulty: "moderate", question_text: "Cell?" },
      ] }) }) })
    })
  }
}));

function renderWithClient(ui: React.ReactNode) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("Questions page", () => {
  it("renders rows from data", async () => {
    const utils = renderWithClient(<Questions />);
    expect(await utils.findByText(/Algebra/)).toBeInTheDocument();
    expect(await utils.findByText(/Biology/)).toBeInTheDocument();
  });
});
