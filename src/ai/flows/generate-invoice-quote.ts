
'use server';
/**
 * @fileOverview Generates a short, positive, or inspiring quote for an invoice footer.
 *
 * - generateInvoiceQuote - A function that generates an invoice quote.
 * - GenerateInvoiceQuoteInput - The input type for the generateInvoiceQuote function.
 * - GenerateInvoiceQuoteOutput - The return type for the generateInvoiceQuote function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInvoiceQuoteInputSchema = z.object({
  language: z
    .string()
    .optional()
    .default('en')
    .describe('The desired language for the quote (e.g., en, es, hi). Defaults to English.'),
  restaurantName: z
    .string()
    .optional()
    .describe('Optional name of the restaurant to potentially personalize the quote.'),
});
export type GenerateInvoiceQuoteInput = z.infer<typeof GenerateInvoiceQuoteInputSchema>;

const GenerateInvoiceQuoteOutputSchema = z.object({
  quote: z.string().describe('A short, positive, or inspiring quote suitable for an invoice footer.'),
});
export type GenerateInvoiceQuoteOutput = z.infer<typeof GenerateInvoiceQuoteOutputSchema>;

export async function generateInvoiceQuote(
  input: GenerateInvoiceQuoteInput
): Promise<GenerateInvoiceQuoteOutput> {
  return generateInvoiceQuoteFlow(input);
}

const generateQuotePrompt = ai.definePrompt({
  name: 'generateInvoiceQuotePrompt',
  input: {schema: GenerateInvoiceQuoteInputSchema},
  output: {schema: GenerateInvoiceQuoteOutputSchema},
  prompt: `Generate a very short, positive, or inspiring quote suitable for the footer of a restaurant invoice.
  The quote should be appropriate for a general audience and create a pleasant closing impression.
  Language: {{{language}}}
  {{#if restaurantName}}
  Optionally, you can subtly incorporate the theme or feeling of a restaurant named "{{{restaurantName}}}", but the quote should still be general.
  {{/if}}
  The quote must be brief, ideally one sentence. Avoid anything controversial or overly specific.
  Examples of tone: "Savor the flavor of life.", "Good food, good mood.", "Every meal is a celebration."

  Quote:`,
});

const generateInvoiceQuoteFlow = ai.defineFlow(
  {
    name: 'generateInvoiceQuoteFlow',
    inputSchema: GenerateInvoiceQuoteInputSchema,
    outputSchema: GenerateInvoiceQuoteOutputSchema,
  },
  async (input) => {
    const {output} = await generateQuotePrompt(input);
    return output!;
  }
);
