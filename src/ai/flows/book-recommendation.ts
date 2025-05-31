'use server';

/**
 * @fileOverview A book recommendation AI agent.
 *
 * - generateBookRecommendations - A function that generates book recommendations for a user.
 * - BookRecommendationInput - The input type for the generateBookRecommendations function.
 * - BookRecommendationOutput - The return type for the generateBookRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BookRecommendationInputSchema = z.object({
  readingHistory: z
    .string()
    .describe('A summary of the user reading history and preferences.'),
});

export type BookRecommendationInput = z.infer<typeof BookRecommendationInputSchema>;

const BookRecommendationOutputSchema = z.object({
  recommendations: z
    .array(z.string())
    .describe('A list of book recommendations based on the user reading history and preferences.'),
});

export type BookRecommendationOutput = z.infer<typeof BookRecommendationOutputSchema>;

const GetAvailableBooksOutputSchema = z.array(z.string());

const getAvailableBooks = ai.defineTool({
  name: 'getAvailableBooks',
  description: 'Returns a list of books currently in stock.',
  inputSchema: z.object({}),
  outputSchema: GetAvailableBooksOutputSchema,
},
async () => {
  // TODO: Replace with actual implementation to fetch available books.
  return [
    'The Lord of the Rings',
    'Pride and Prejudice',
    '1984',
  ];
});

export async function generateBookRecommendations(
  input: BookRecommendationInput
): Promise<BookRecommendationOutput> {
  return bookRecommendationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'bookRecommendationPrompt',
  input: {schema: BookRecommendationInputSchema},
  output: {schema: BookRecommendationOutputSchema},
  tools: [getAvailableBooks],
  prompt: `You are a book recommendation expert. Based on the user's reading history and preferences, you will provide a list of book recommendations.

  Consider only books currently in stock, use the getAvailableBooks tool to filter your result to only books that it returns.

  Reading History and Preferences: {{{readingHistory}}}

  Please provide a list of book recommendations:`,
});

const bookRecommendationFlow = ai.defineFlow(
  {
    name: 'bookRecommendationFlow',
    inputSchema: BookRecommendationInputSchema,
    outputSchema: BookRecommendationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
