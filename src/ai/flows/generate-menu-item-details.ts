'use server';
/**
 * @fileOverview Generates menu item details including description, recipe, and preparation method.
 *
 * - generateMenuItemDetails - A function that generates menu item details.
 * - GenerateMenuItemDetailsInput - The input type for the generateMenuItemDetails function.
 * - GenerateMenuItemDetailsOutput - The return type for the generateMenuItemDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMenuItemDetailsInputSchema = z.object({
  name: z.string().describe('The name of the menu item.'),
  cuisine: z.string().describe('The cuisine of the menu item, e.g., Italian, Chinese, etc.'),
  ingredients: z.string().describe('A comma-separated list of the main ingredients.'),
  dietaryRestrictions: z
    .string()
    .optional()
    .describe('Any dietary restrictions, e.g., vegetarian, gluten-free, etc.'),
});
export type GenerateMenuItemDetailsInput = z.infer<typeof GenerateMenuItemDetailsInputSchema>;

const GenerateMenuItemDetailsOutputSchema = z.object({
  description: z.string().describe('A short, enticing description of the menu item.'),
  recipe: z.string().describe('A detailed recipe for preparing the menu item.'),
  preparationMethod: z
    .string()
    .describe('A description of the preparation method for the menu item.'),
});
export type GenerateMenuItemDetailsOutput = z.infer<typeof GenerateMenuItemDetailsOutputSchema>;

export async function generateMenuItemDetails(
  input: GenerateMenuItemDetailsInput
): Promise<GenerateMenuItemDetailsOutput> {
  return generateMenuItemDetailsFlow(input);
}

const generateMenuItemDetailsPrompt = ai.definePrompt({
  name: 'generateMenuItemDetailsPrompt',
  input: {schema: GenerateMenuItemDetailsInputSchema},
  output: {schema: GenerateMenuItemDetailsOutputSchema},
  prompt: `You are a culinary expert tasked with creating compelling menu item details.

  Based on the following information, generate a description, recipe, and preparation method for the menu item.

  Name: {{{name}}}
  Cuisine: {{{cuisine}}}
  Ingredients: {{{ingredients}}}
  Dietary Restrictions: {{{dietaryRestrictions}}}

  Description:
  Recipe:
  Preparation Method:`,
});

const generateMenuItemDetailsFlow = ai.defineFlow(
  {
    name: 'generateMenuItemDetailsFlow',
    inputSchema: GenerateMenuItemDetailsInputSchema,
    outputSchema: GenerateMenuItemDetailsOutputSchema,
  },
  async input => {
    const {output} = await generateMenuItemDetailsPrompt(input);
    return output!;
  }
);
