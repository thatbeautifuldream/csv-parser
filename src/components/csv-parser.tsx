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
  const [error, setError] = useState<string[]>([]);
  const { parsedData, setParsedData, deleteEntry } = useCSVStore();

  const handleParse = () => {
    setError([]);
    const rows = input.trim().split("\n");

    if (rows.length === 0) {
      setError(["No data provided"]);
      return;
    }

    // Check if first row is a header
    const firstRow = rows[0].toLowerCase();

    const headerPatterns = {
      name: /(^|\b)(name|full\s*name|customer|client|contact|person)($|\b)/i,
      email:
        /(^|\b)(email|e-mail|mail|address|contact|electronic\s*mail)($|\b)/i,
      phone: /(^|\b)(phone|tel|telephone|mobile|cell|contact|number)($|\b)/i,
    };

    const isHeader = Object.values(headerPatterns).some((pattern) =>
      pattern.test(firstRow)
    );

    // Start from index 1 if header is detected, otherwise start from 0
    const dataRows = isHeader ? rows.slice(1) : rows;
    const parsed: ParsedData[] = [];
    const seenEmails = new Set(
      parsedData.map((entry) => entry.email.toLowerCase())
    );
    const seenPhones = new Set(parsedData.map((entry) => entry.phone));
    const duplicateErrors: string[] = [];

    for (const row of dataRows) {
      const fields = row.split("\t");
      if (fields.length !== 3) {
        setError([`Invalid row: ${row}. Expected 3 fields.`]);
        return;
      }

      const rowData: Partial<ParsedData> = {
        id: uuidv4(),
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

        // Check and record duplicates with more detailed error messages
        const duplicateDetails = [];

        if (seenEmails.has(validatedRow.email.toLowerCase())) {
          duplicateDetails.push(`email: ${validatedRow.email}`);
        }
        if (seenPhones.has(validatedRow.phone)) {
          duplicateDetails.push(`phone: ${validatedRow.phone}`);
        }

        if (duplicateDetails.length > 0) {
          duplicateErrors.push(
            `Duplicate entry found (${duplicateDetails.join(
              ", "
            )}) for contact: ${validatedRow.name}`
          );
          continue;
        }

        // Add to seen sets
        seenEmails.add(validatedRow.email.toLowerCase());
        seenPhones.add(validatedRow.phone);
        parsed.push(validatedRow);
      } catch (err) {
        if (err instanceof z.ZodError) {
          setError([
            `Validation error in row: ${row}. ${err.errors
              .map((e) => e.message)
              .join(", ")}`,
          ]);
          return;
        }
      }
    }

    // Only set error if we have duplicates but also have valid entries
    if (duplicateErrors.length > 0) {
      setError(duplicateErrors);
    }

    // Still update the data if we have any valid entries
    if (parsed.length > 0) {
      setParsedData([...parsedData, ...parsed]);
    }
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
      {error.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Errors Found</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {error.map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
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
