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
import {
  useCSVStore,
  RowSchema,
  type ParsedData,
} from "@/lib/stores/csv-store";
import { z } from "zod";

export function CSVParser() {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string[]>([]);
  const { parsedData, setParsedData, deleteEntry } = useCSVStore();

  function handleParse() {
    const errors: string[] = [];
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

    const emailCounts = new Map<string, number>();
    const phoneCounts = new Map<string, number>();

    dataRows.forEach((row, index) => {
      const rowNumber = isHeader ? index + 2 : index + 1; // Add 1 for 0-based index, add 2 if header exists
      const fields = row.split("\t");

      if (fields.length !== 3) {
        errors.push(`Invalid number of fields at Row ${rowNumber}`);
        return;
      }

      // Store original values before processing
      const originalValues = {
        name: "",
        email: "",
        phone: "",
      };

      // First pass: categorize fields while keeping original values
      fields.forEach((field) => {
        const trimmedField = field.trim();
        if (trimmedField.includes("@")) {
          originalValues.email = trimmedField;
        } else if (/^\+?[0-9]{10,14}$/.test(trimmedField)) {
          originalValues.phone = trimmedField;
        } else {
          originalValues.name = trimmedField;
        }
      });

      const rowData: Partial<ParsedData> = {
        id: uuidv4(),
        name: originalValues.name,
        email: originalValues.email,
        phone: originalValues.phone,
      };

      try {
        const validatedRow = RowSchema.parse(rowData);

        const duplicateDetails = [];
        const emailLower = validatedRow.email.toLowerCase();
        const phone = validatedRow.phone;

        // Update counts
        emailCounts.set(emailLower, (emailCounts.get(emailLower) || 0) + 1);
        phoneCounts.set(phone, (phoneCounts.get(phone) || 0) + 1);

        // Show errors starting from the first duplicate (second occurrence)
        if (emailCounts.get(emailLower)! > 1) {
          duplicateDetails.push("email");
        }
        if (phoneCounts.get(phone)! > 1) {
          duplicateDetails.push("phone");
        }

        if (duplicateDetails.length > 0) {
          errors.push(
            `Duplicate ${duplicateDetails.join(" and ")} at Row ${rowNumber}`
          );
          return;
        }

        // Only add to parsed data if it's the first occurrence
        if (
          emailCounts.get(emailLower)! === 1 &&
          phoneCounts.get(phone)! === 1
        ) {
          seenEmails.add(emailLower);
          seenPhones.add(phone);
          parsed.push(validatedRow);
        }
      } catch (err) {
        if (err instanceof z.ZodError) {
          err.errors.forEach((error) => {
            const fieldName = error.path[0];
            errors.push(`Invalid ${fieldName} at Row ${rowNumber}`);
          });
        }
      }
    });

    // Update the global state with valid entries
    if (parsed.length > 0) {
      setParsedData(parsed);
    }

    // Set all collected errors
    if (errors.length > 0) {
      setError(errors);
    } else {
      setError([]);
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">CSV Data Parser</h1>
      <div className="space-y-2">
        <label
          htmlFor="data-input"
          className="block text-sm font-medium text-gray-700"
        >
          Paste your data here (from your sheets):
        </label>
        <Textarea
          id="data-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="name&#9;phone&#9;email"
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
