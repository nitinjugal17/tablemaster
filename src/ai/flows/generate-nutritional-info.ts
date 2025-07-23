
'use server';
/**
 * @fileOverview Generates nutritional information for a menu item using AI.
 *
 * - generateNutritionalInfo - A function that estimates nutritional values.
 * - GenerateNutritionalInfoInput - The input type for the function.
 * - GenerateNutritionalInfoOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNutritionalInfoInputSchema = z.object({
  menuItemName: z.string().describe('The name of the menu item.'),
  ingredients: z.string().describe('A comma-separated list of the main ingredients.'),
  recipe: z.string().optional().describe('Detailed recipe for the menu item, if available.'),
  preparationMethod: z.string().optional().describe('How the item is prepared (e.g., fried, baked).'),
  portionSize: z.string().optional().default('1 standard serving').describe("Description of the portion size, e.g., '1 serving', '250g', '1 bowl'. Defaults to '1 standard serving'."),
});
export type GenerateNutritionalInfoInput = z.infer<typeof GenerateNutritionalInfoInputSchema>;

const GenerateNutritionalInfoOutputSchema = z.object({
  calories: z.number().describe("Estimated calories in kcal per serving."),
  carbs: z.number().describe("Estimated carbohydrates in grams per serving."),
  protein: z.number().describe("Estimated protein in grams per serving."),
  fat: z.number().describe("Estimated fat in grams per serving."),
  energyKJ: z.number().optional().describe("Estimated energy in kilojoules (kJ) per serving, if determinable."),
  servingSizeSuggestion: z.string().optional().describe("The serving size used for this estimation, e.g., 'per 100g' or 'per serving (approx 250g)'.")
});
export type GenerateNutritionalInfoOutput = z.infer<typeof GenerateNutritionalInfoOutputSchema>;

export async function generateNutritionalInfo(
  input: GenerateNutritionalInfoInput
): Promise<GenerateNutritionalInfoOutput> {
  return generateNutritionalInfoFlow(input);
}

const generateNutritionalInfoPrompt = ai.definePrompt({
  name: 'generateNutritionalInfoPrompt',
  input: {schema: GenerateNutritionalInfoInputSchema},
  output: {schema: GenerateNutritionalInfoOutputSchema},
  prompt: `You are a nutritional expert. Based on the menu item name, ingredients, and optionally the recipe, preparation method, and portion size, estimate the typical nutritional values for one serving.
Provide estimates for: calories (in kcal), carbohydrates (in grams), protein (in grams), and fat (in grams).
If possible, also provide an estimate for energy in kilojoules (kJ).
Specify the serving size basis for your estimation (e.g., "per 100g", "per serving (approx 250g)").
Focus on common preparations and average values. If portion size is not explicitly given, assume a standard single serving appropriate for the dish described.

Menu Item Name: {{{menuItemName}}}
Ingredients: {{{ingredients}}}
{{#if recipe}}Recipe: {{{recipe}}}{{/if}}
{{#if preparationMethod}}Preparation Method: {{{preparationMethod}}}{{/if}}
Portion Size Input: {{{portionSize}}}

Estimated Nutritional Information:`,
});

const generateNutritionalInfoFlow = ai.defineFlow(
  {
    name: 'generateNutritionalInfoFlow',
    inputSchema: GenerateNutritionalInfoInputSchema,
    outputSchema: GenerateNutritionalInfoOutputSchema,
  },
  async input => {
    const {output} = await generateNutritionalInfoPrompt(input);
    return output!;
  }
);
