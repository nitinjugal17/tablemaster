
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Employee, AttendanceRecord } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getEmployeeAndTodaysAttendance, requestAndSendAttendanceOtp, verifyOtpAndMarkAttendance } from '@/app/actions/hr-actions';
import { Loader2, UserCheck, UserX, Clock, CalendarClock, ShieldCheck, KeyRound, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslation } from 'react-i18next';

const RESEND_COOLDOWN_SECONDS = 60;

export default function UserAttendancePage() {
  const { t } = useTranslation('attendance');
  const { toast } = useToast();
  const { user, isLoadingAuth } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const fetchStatus = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    const { employee: emp, attendance: att, error: err } = await getEmployeeAndTodaysAttendance(user.id);
    setEmployee(emp);
    setAttendance(att);
    setError(err || null);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (!isLoadingAuth) {
      fetchStatus();
    }
  }, [isLoadingAuth, fetchStatus]);
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRequestOtp = async () => {
    if (!user) return;
    setIsProcessing(true);
    const result = await requestAndSendAttendanceOtp(user.id);
    if (result.success) {
      toast({ title: t('otpSentTitle'), description: result.message });
      setOtpSent(true);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } else {
      toast({ title: t('common:error'), description: result.message, variant: "destructive" });
    }
    setIsProcessing(false);
  };

  const handleVerifyAndMark = async () => {
    if (!user || otp.length !== 6) {
        toast({ title: "Invalid OTP", description: "Please enter a 6-digit OTP.", variant: "destructive"});
        return;
    };
    setIsProcessing(true);
    const result = await verifyOtpAndMarkAttendance(user.id, otp);
    if (result.success) {
        toast({ title: t('successTitle'), description: result.message });
        setOtpSent(false);
        setOtp('');
        await fetchStatus(); // Refresh the status
    } else {
        toast({ title: t('errorVerificationFailedTitle'), description: result.message, variant: "destructive" });
    }
    setIsProcessing(false);
  };

  const getStatusDisplay = () => {
    if (!employee) return null;
    if (!attendance) {
        return <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-center"><p className="text-blue-700">{t('notCheckedIn')}</p></div>;
    }
    return (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md space-y-2 text-green-800" dangerouslySetInnerHTML={{
            __html: `
                ${attendance.checkInTime ? `<p>${t('checkedInAt', { time: `<strong>${format(parseISO(attendance.checkInTime), 'h:mm:ss a')}</strong>` })}</p>` : ''}
                ${attendance.checkOutTime ? `<p>${t('checkedOutAt', { time: `<strong>${format(parseISO(attendance.checkOutTime), 'h:mm:ss a')}</strong>` })}</p>` : ''}
            `
        }} />
    );
  };

  if (isLoading || isLoadingAuth) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Please log in to mark attendance.</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="destructive"><AlertTitle>{t('errorLoadingData')}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

  if (!employee) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader><CardTitle>{t('attendanceNotAvailableTitle')}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <UserX className="h-8 w-8 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-yellow-800">{t('noProfileLinkedTitle')}</h3>
              <p className="text-sm text-yellow-700">{t('noProfileLinkedDescription')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const alreadyCheckedOut = !!attendance?.checkOutTime;
  const buttonText = alreadyCheckedOut 
    ? t('alreadyCheckedOut') 
    : (attendance?.checkInTime ? t('requestOtpToCheckOut') : t('requestOtpToCheckIn'));

  return (
    <div className="max-w-2xl mx-auto space-y-8">
       <div>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <CalendarClock className="mr-3 h-7 w-7" /> {t('pageTitle')}
        </h1>
        <p className="text-muted-foreground">{t('pageDescription')}</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{t('welcomeMessage', { name: employee.name })}</CardTitle>
          <CardDescription>{t('employeeIdLabel', { id: employee.employeeId })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <h3 className="font-semibold">{t('todaysStatusTitle', { date: format(new Date(), 'PPP') })}</h3>
            {getStatusDisplay()}
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t pt-6">
            {!otpSent ? (
                <Button onClick={handleRequestOtp} className="w-full" disabled={isProcessing || alreadyCheckedOut}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4"/>}
                    {buttonText}
                </Button>
            ) : (
                <div className="w-full space-y-4">
                    <Alert>
                        <ShieldCheck className="h-4 w-4"/>
                        <AlertTitle>{t('otpSentTitle')}</AlertTitle>
                        <AlertDescription>{t('otpSentDescription')}</AlertDescription>
                    </Alert>
                    <div className="flex items-center gap-2">
                        <Input 
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            maxLength={6}
                            placeholder={t('otpInputPlaceholder')}
                            disabled={isProcessing}
                        />
                        <Button onClick={handleVerifyAndMark} disabled={isProcessing || otp.length !== 6}>
                           {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} {t('verifyButton')}
                        </Button>
                    </div>
                     <Button 
                        variant="outline" 
                        className="w-full text-xs"
                        onClick={handleRequestOtp} 
                        disabled={isProcessing || resendCooldown > 0}
                    >
                        <RefreshCw className="mr-2 h-3 w-3" />
                        {resendCooldown > 0 ? t('resendOtpCooldown', { cooldown: resendCooldown }) : t('resendOtpButton')}
                    </Button>
                </div>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}
