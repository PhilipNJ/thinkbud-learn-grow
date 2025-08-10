import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

afterEach(() => {
  cleanup();
});

// Silence Supabase URL warnings in tests if any
vi.stubGlobal("__SUPABASE_TEST__", true);
