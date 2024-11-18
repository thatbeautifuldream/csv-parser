import { create } from "zustand";
import { z } from "zod";

export const RowSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().regex(/^\+?[0-9]{10,14}$/, "Invalid phone number"),
  email: z.string().email("Invalid email address"),
});

export type ParsedData = z.infer<typeof RowSchema>;

interface CSVStore {
  parsedData: ParsedData[];
  setParsedData: (data: ParsedData[]) => void;
  deleteEntry: (id: string) => void;
}

export const useCSVStore = create<CSVStore>((set) => ({
  parsedData: [],
  setParsedData: (data) => set({ parsedData: data }),
  deleteEntry: (id) =>
    set((state) => ({
      parsedData: state.parsedData.filter((item) => item.id !== id),
    })),
}));
