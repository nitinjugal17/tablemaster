
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Room } from "@/lib/types";
import { BASE_CURRENCY_CODE } from "@/lib/types";
import { DialogFooter } from "@/components/ui/dialog";

const roomEditorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Room name is required."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1."),
  pricePerNight: z.coerce.number().min(0, "Price cannot be negative."),
  amenities: z.string().min(1, "Please list at least one amenity."),
  imageUrls: z.string().min(1, "At least one image URL is required."),
});
type RoomEditorValues = z.infer<typeof roomEditorSchema>;

interface RoomEditorProps {
  room?: Partial<Room>;
  onSave: (data: Room) => void;
  onClose: () => void;
}

export const RoomEditor: React.FC<RoomEditorProps> = ({ room, onSave, onClose }) => {
  const form = useForm<RoomEditorValues>({
    resolver: zodResolver(roomEditorSchema),
    defaultValues: {
      id: room?.id || "",
      name: room?.name || "",
      description: room?.description || "",
      capacity: room?.capacity || 1,
      pricePerNight: room?.pricePerNight || 0,
      amenities: room?.amenities || "",
      imageUrls: room?.imageUrls || "",
    },
  });

  function onSubmit(data: RoomEditorValues) {
    const finalData: Room = {
      id: data.id || crypto.randomUUID(),
      ...data
    };
    onSave(finalData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
        <FormField control={form.control} name="id" render={({ field }) => ( <FormItem><FormLabel className="sr-only">ID</FormLabel><FormControl><Input type="hidden" {...field} /></FormControl></FormItem>)} />
        
        <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Room Name *</FormLabel><FormControl><Input placeholder="e.g., Deluxe King Suite" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Description *</FormLabel><FormControl><Textarea placeholder="Describe the room and its features..." {...field} rows={4} /></FormControl><FormMessage /></FormItem>
        )}/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="capacity" render={({ field }) => (
                <FormItem><FormLabel>Capacity *</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="pricePerNight" render={({ field }) => (
                <FormItem><FormLabel>Price / Night ({BASE_CURRENCY_CODE}) *</FormLabel><FormControl><Input type="number" step="100" placeholder="e.g., 5000" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>
        <FormField control={form.control} name="amenities" render={({ field }) => (
            <FormItem><FormLabel>Amenities *</FormLabel><FormControl><Textarea placeholder="e.g., King Bed, Balcony, Free Wi-Fi" {...field} rows={2} /></FormControl><FormDescription>Comma-separated list of amenities.</FormDescription><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="imageUrls" render={({ field }) => (
            <FormItem><FormLabel>Image URLs *</FormLabel><FormControl><Textarea placeholder="https://.../image1.png, https://.../image2.png" {...field} rows={3} /></FormControl><FormDescription>Comma-separated list of public image URLs.</FormDescription><FormMessage /></FormItem>
        )}/>

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">{room?.id ? "Save Changes" : "Add Room"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
