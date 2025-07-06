// This file is machine-generated - edit with care!

'use server';

/**
 * @fileOverview AI-powered menu item information updater.
 *
 * - updateMenuItemInfo - A function that updates the information or recipe of a menu item using AI.
 * - UpdateMenuItemInfoInput - The input type for the updateMenuItemInfo function.
 * - UpdateMenuItemInfoOutput - The return type for the updateMenuItemInfo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const UpdateMenuItemInfoInputSchema = z.object({
  menuItemName: z.string().describe('The name of the menu item to update.'),
  existingInformation: z.string().describe('The current information or recipe of the menu item.'),
  updateInstructions: z.string().describe('Instructions on what information to update or change in the recipe.'),
});
export type UpdateMenuItemInfoInput = z.infer<typeof UpdateMenuItemInfoInputSchema>;

const UpdateMenuItemInfoOutputSchema = z.object({
  updatedInformation: z.string().describe('The updated information or recipe of the menu item.'),
});
export type UpdateMenuItemInfoOutput = z.infer<typeof UpdateMenuItemInfoOutputSchema>;

export async function updateMenuItemInfo(input: UpdateMenuItemInfoInput): Promise<UpdateMenuItemInfoOutput> {
  return updateMenuItemInfoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'updateMenuItemInfoPrompt',
  input: {schema: UpdateMenuItemInfoInputSchema},
  output: {schema: UpdateMenuItemInfoOutputSchema},
  prompt: `You are an AI assistant specialized in updating menu item information and recipes for restaurants.

  You will receive the current information for a menu item, along with instructions on what to update.
  Follow the instructions carefully and provide the updated information. Retain all important information not being updated.
  Avoid hallucinating information.

  Menu Item Name: {{{menuItemName}}}
  Existing Information: {{{existingInformation}}}
  Update Instructions: {{{updateInstructions}}}

  Updated Information:`, 
});

const updateMenuItemInfoFlow = ai.defineFlow(
  {
    name: 'updateMenuItemInfoFlow',
    inputSchema: UpdateMenuItemInfoInputSchema,
    outputSchema: UpdateMenuItemInfoOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {
      updatedInformation: output!.updatedInformation,
    };
  }
);
