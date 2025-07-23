
import { BookingForm } from '@/components/bookings/BookingForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Phone, Clock, BedDouble } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function BookingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary">Make a Reservation</h1>
        <p className="text-muted-foreground">We look forward to welcoming you! Book a table or a room with us.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Reservation Details</CardTitle>
            <CardDescription>Select your preferred reservation type, date, time, and party size.</CardDescription>
          </CardHeader>
          <CardContent>
            <BookingForm />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl">Important Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p><Clock className="inline h-4 w-4 mr-2 text-accent" />Our peak hours for dining are from 7 PM to 9 PM. Booking in advance is highly recommended.</p>
              <p>For parties larger than 10, please contact us directly via phone.</p>
              <p>If you need to cancel or modify your reservation, please let us know at least 2 hours in advance.</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center"><BedDouble className="mr-2 h-5 w-5 text-accent"/>Looking for a Stay?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Enhance your dining experience with a comfortable stay in one of our exclusive rooms.</p>
              <Button asChild className="w-full" variant="outline"><Link href="/rooms">View Our Rooms</Link></Button>
            </CardContent>
          </Card>
          <Alert>
            <Phone className="h-5 w-5 text-primary" />
            <AlertTitle className="font-headline text-lg">Need Assistance?</AlertTitle>
            <AlertDescription>
              Call us at <a href="tel:+1234567890" className="font-semibold text-primary hover:underline">(123) 456-7890</a> for any special requests or urgent bookings.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
