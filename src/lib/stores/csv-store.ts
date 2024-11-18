import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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

export const useCSVStore = create<CSVStore>()(
  persist(
    (set, get) => ({
      parsedData: [],
      setParsedData: (data) => {
        const currentData = get().parsedData;
        const newEntries = data.filter(
          (newItem) =>
            !currentData.some(
              (existingItem) =>
                existingItem.name === newItem.name ||
                existingItem.phone === newItem.phone ||
                existingItem.email === newItem.email
            )
        );
        set({ parsedData: [...currentData, ...newEntries] });
      },
      deleteEntry: (id) =>
        set((state) => ({
          parsedData: state.parsedData.filter((item) => item.id !== id),
        })),
    }),
    {
      name: "csv-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
