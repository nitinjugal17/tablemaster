
"use client";

import React from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export interface EmployeeIdCardData {
  employeeName?: string;
  designation?: string;
  department?: string;
  employeePhotoUrl?: string | null; 
  companyLogoUrl?: string | null;
  expiryDate?: Date | null;
  authorizedSignatoryName?: string;
  signatoryImageUrl?: string | null;
  bloodType?: string;
  nationalId?: string;
  companyName?: string; 
  companyAddress?: string; 
  // New fields from general settings
  idCardAddressLine?: string; 
  idCardReturnInstructions?: string;
  idCardPropertyOfLine?: string;
}

interface EmployeeIdCardPreviewProps {
  data: EmployeeIdCardData | null;
}

const EmployeeIdCardPreview: React.FC<EmployeeIdCardPreviewProps> = ({ data }) => {
  if (!data || !data.employeeName) {
    return (
      <Card className="mt-6 border-dashed">
        <CardContent className="p-6 text-center text-muted-foreground">
          <p className="mb-2 text-lg">No ID Card Data Provided</p>
          <p>Fill the form to see a preview of the ID card here.</p>
        </CardContent>
      </Card>
    );
  }

  const cardWidthMm = 85.6;
  const cardHeightMm = 53.98;
  const previewScale = 1.5;
  const previewWidthPx = Math.round(cardWidthMm / 25.4 * 96 * previewScale); 
  const previewHeightPx = Math.round(cardHeightMm / 25.4 * 96 * previewScale); 
  
  const photoPlaceholderWidth = Math.round(previewWidthPx * 0.28); 
  const photoPlaceholderHeight = Math.round(photoPlaceholderWidth / (3/4));

  const displayAddress = data.idCardAddressLine || data.companyAddress || "Address not set";
  const displayReturnInstructions = data.idCardReturnInstructions?.replace('[Your Company Name]', data.companyName || "Our Company").replace('[Your Phone Number]', data.companyAddress || "contact details not set") 
                                    || `If found, please return to ${data.companyName || "Our Company"} or call phone.`;
  const displayPropertyOfLine = data.idCardPropertyOfLine?.replace('[Your Company Name LLC]', `${data.companyName || "Our Company"} LLC`) 
                                || `This card is the property of ${data.companyName || "Our Company"} LLC.`;


  return (
    <Card className="mt-6 shadow-xl">
      <CardContent className="p-6 overflow-x-auto">
        <p className="text-sm text-muted-foreground mb-4 text-center">
          CR80 Landscape ID Card Preview (approx. 85.6mm x 53.98mm per side). Scroll if needed.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-start">
          {/* Front Side */}
          <div
            className="id-card-preview-container bg-white border border-gray-300 rounded-lg shadow-md overflow-hidden relative text-black"
            style={{ width: `${previewWidthPx}px`, height: `${previewHeightPx}px`, fontFamily: 'Arial, sans-serif' }}
          >
            <div className="p-3 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                {data.companyLogoUrl ? (
                  <Image 
                    src={data.companyLogoUrl} 
                    alt="Company Logo" 
                    width={Math.round(previewWidthPx * 0.25)} 
                    height={Math.round(previewHeightPx * 0.15)} 
                    className="object-contain"
                    data-ai-hint="company logo" 
                  />
                ) : (
                  <div className="w-1/4 h-8 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">Logo</div>
                )}
                <Badge variant="secondary" className="text-xs">EMPLOYEE</Badge>
              </div>

              {/* Main Content */}
              <div className="flex flex-grow items-center gap-3 mt-1">
                {/* Photo */}
                <div className="relative flex-shrink-0 border border-gray-200 rounded" style={{width: `${photoPlaceholderWidth}px`, height: `${photoPlaceholderHeight}px`}}>
                  {data.employeePhotoUrl ? (
                    <Image
                      src={data.employeePhotoUrl}
                      alt={data.employeeName || "Employee Photo"}
                      fill
                      sizes={`${photoPlaceholderWidth}px`}
                      className="object-cover rounded"
                      data-ai-hint="employee portrait"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                      Photo
                    </div>
                  )}
                </div>
                {/* Details */}
                <div className="flex-grow space-y-px">
                  <h2 className="font-bold text-primary" style={{ fontSize: `${Math.max(12, previewWidthPx * 0.035)}px` }}>
                    {data.employeeName || "John Doe"}
                  </h2>
                  <p className="text-gray-700" style={{ fontSize: `${Math.max(10, previewWidthPx * 0.028)}px` }}>
                    {data.designation || "Software Engineer"}
                  </p>
                  {data.department && (
                    <p className="text-gray-600" style={{ fontSize: `${Math.max(9, previewWidthPx * 0.025)}px` }}>
                      Dept: {data.department}
                    </p>
                  )}
                   <p className="text-gray-500 text-xs" style={{ fontSize: `${Math.max(8, previewWidthPx * 0.022)}px` }}>
                     Emp ID: {(data.nationalId || "N/A").slice(-4) || "XXXX"} 
                   </p>
                </div>
              </div>
              
              {/* Footer */}
              <div className="mt-auto pt-1 border-t border-gray-200 flex justify-between items-end">
                <p className="text-xs text-gray-500" style={{ fontSize: `${Math.max(8, previewWidthPx * 0.020)}px` }}>
                  {data.companyName || "Your Company Name"}
                </p>
                {data.expiryDate && (
                  <p className="text-xs text-gray-500" style={{ fontSize: `${Math.max(8, previewWidthPx * 0.020)}px` }}>
                    Expires: {format(data.expiryDate, 'MM/yyyy')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Back Side */}
          <div
            className="id-card-preview-container bg-white border border-gray-300 rounded-lg shadow-md overflow-hidden relative text-black"
            style={{ width: `${previewWidthPx}px`, height: `${previewHeightPx}px`, fontFamily: 'Arial, sans-serif' }}
          >
            <div className="p-3 h-full flex flex-col text-xs">
              <h3 className="text-center font-semibold text-sm mb-3 border-b pb-1">Employee Information</h3>
              <div className="space-y-1 mb-2 text-[0.65rem] leading-snug">
                <p><strong>Name:</strong> {data.employeeName || "N/A"}</p>
                <p><strong>Designation:</strong> {data.designation || "N/A"}</p>
                {data.department && <p><strong>Department:</strong> {data.department}</p>}
                {data.nationalId && <p><strong>National ID:</strong> {data.nationalId}</p>}
                {data.bloodType && <p><strong>Blood Group:</strong> {data.bloodType}</p>}
              </div>
              
              <div className="mt-auto text-center space-y-1">
                {displayAddress && <p className="text-[0.6rem] text-gray-600">{displayAddress}</p>}
                {displayReturnInstructions && <p className="text-[0.6rem] text-gray-500 mt-1">{displayReturnInstructions}</p>}
                
                <div className="flex flex-col items-center mt-2">
                    {data.signatoryImageUrl ? (
                        <Image src={data.signatoryImageUrl} alt="Signatory" width={60} height={25} className="object-contain my-0.5" data-ai-hint="signature"/>
                    ) : (
                        <div className="h-5 w-16 border-b border-gray-400 my-1"></div>
                    )}
                    <p className="font-semibold border-t border-gray-300 pt-0.5 w-3/4 text-[0.65rem]">
                        {data.authorizedSignatoryName || "Authorized Signatory"}
                    </p>
                </div>
                 {displayPropertyOfLine && <p className="text-[0.55rem] text-gray-400 mt-1">{displayPropertyOfLine}</p>}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeIdCardPreview;
