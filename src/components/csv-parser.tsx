"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { z } from "zod";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define the Zod schema for each row
const RowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  number: z.string().regex(/^\d+$/, "Number must contain only digits"),
  email: z.string().email("Invalid email address"),
});

// Define the type for a valid row
type ValidRow = z.infer<typeof RowSchema>;

export function CSVParser() {
  const [parsedData, setParsedData] = useState<ValidRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    Papa.parse(file, {
      complete: (results) => {
        const validRows: ValidRow[] = [];
        const errors: string[] = [];
        results.data.forEach((row: any, index: number) => {
          if (index === 0) return; // Skip header row
          try {
            const validRow = RowSchema.parse({
              name: row[0],
              number: row[1],
              email: row[2],
            });
            validRows.push(validRow);
          } catch (err) {
            if (err instanceof z.ZodError) {
              errors.push(
                `Row ${index + 1}: ${err.errors
                  .map((e) => e.message)
                  .join(", ")}`
              );
            }
          }
        });

        if (errors.length > 0) {
          setError(errors.join("\n"));
        } else {
          setError(null);
          setParsedData(validRows);
        }
      },
      header: false,
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>CSV Parser</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
              isDragActive ? "border-primary bg-primary/10" : "border-gray-300"
            }`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the CSV file here ...</p>
            ) : (
              <p>Drag and drop a CSV file here, or click to select a file</p>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-4 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap">{error}</pre>
          </CardContent>
        </Card>
      )}

      {parsedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parsed Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.number}</TableCell>
                    <TableCell>{row.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
