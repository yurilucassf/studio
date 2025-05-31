// src/ai/flows/catalog-summary.ts
'use server';

/**
 * @fileOverview Summarizes the book catalog based on applied filters using GenAI.
 *
 * - summarizeCatalog - A function to generate a summary of the book catalog.
 * - CatalogSummaryInput - The input type for the summarizeCatalog function.
 * - CatalogSummaryOutput - The return type for the summarizeCatalog function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CatalogSummaryInputSchema = z.object({
  filters: z
    .string()
    .describe(
      'A description of the filters applied to the catalog, e.g., \'fantasy novels\'.' // Ensure proper escaping
    ),
});
export type CatalogSummaryInput = z.infer<typeof CatalogSummaryInputSchema>;

const CatalogSummaryOutputSchema = z.object({
  summary: z.string().describe('A summary of the book catalog based on the filters.'),
});
export type CatalogSummaryOutput = z.infer<typeof CatalogSummaryOutputSchema>;

export async function summarizeCatalog(input: CatalogSummaryInput): Promise<CatalogSummaryOutput> {
  return summarizeCatalogFlow(input);
}

const prompt = ai.definePrompt({
  name: 'catalogSummaryPrompt',
  input: {schema: CatalogSummaryInputSchema},
  output: {schema: CatalogSummaryOutputSchema},
  prompt: `You are a librarian tasked with summarizing the library\'s catalog based on specific filters.

  Filters: {{{filters}}}

  Provide a concise summary of the books matching the provided filter. The summary should be no more than 200 words.`,
});

const summarizeCatalogFlow = ai.defineFlow(
  {
    name: 'summarizeCatalogFlow',
    inputSchema: CatalogSummaryInputSchema,
    outputSchema: CatalogSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
