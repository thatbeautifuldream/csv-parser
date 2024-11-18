"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCSVStore, RowSchema, ParsedData } from "@/lib/stores/csv-store";
import { z } from "zod";

export function CSVParser() {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { parsedData, setParsedData, deleteEntry } = useCSVStore();

  const handleParse = () => {
    setError(null);
    const rows = input.trim().split("\n");

    if (rows.length === 0) {
      setError("No data provided");
      return;
    }

    // Check if first row is a header
    const firstRow = rows[0].toLowerCase();
    const isHeader =
      firstRow.includes("name") ||
      firstRow.includes("email") ||
      firstRow.includes("phone");

    // Start from index 1 if header is detected, otherwise start from 0
    const dataRows = isHeader ? rows.slice(1) : rows;
    const parsed: ParsedData[] = [];

    for (const row of dataRows) {
      const fields = row.split("\t");
      if (fields.length !== 3) {
        setError(`Invalid row: ${row}. Expected 3 fields.`);
        return;
      }

      const rowData: Partial<ParsedData> = {
        id: uuidv4(), // Add unique ID for each row
      };

      // Process each field in the row
      fields.forEach((field) => {
        if (field.includes("@")) {
          rowData.email = field.trim();
        } else if (/^\+?[0-9]{10,14}$/.test(field.trim())) {
          rowData.phone = field.trim();
        } else {
          rowData.name = field.trim();
        }
      });

      try {
        const validatedRow = RowSchema.parse(rowData);
        parsed.push(validatedRow);
      } catch (err) {
        if (err instanceof z.ZodError) {
          setError(
            `Validation error in row: ${row}. ${err.errors
              .map((e) => e.message)
              .join(", ")}`
          );
          return;
        }
      }
    }

    setParsedData(parsed);
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">CSV Data Parser</h1>
      <div className="space-y-2">
        <label
          htmlFor="data-input"
          className="block text-sm font-medium text-gray-700"
        >
          Paste your data here (tab-separated values):
        </label>
        <Textarea
          id="data-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Name&#9;Phone&#9;Email"
          rows={5}
          className="w-full"
        />
      </div>
      <Button onClick={handleParse}>Parse Data</Button>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {parsedData.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parsedData.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.phone}</TableCell>
                <TableCell>{item.email}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteEntry(item.id)}
                    className="hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
