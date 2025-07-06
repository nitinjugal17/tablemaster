// src/app/actions/data-management/_csv-headers.ts

export const MENU_ITEMS_HEADERS = 'id,name,description,category,imageUrl,cuisine,ingredients,dietaryRestrictions,recipe,preparationMethod,aiHint,synonyms,isAvailable,isSignatureDish,isTodaysSpecial,isMinibarItem,portionDetails,calculatedCost,calories,carbs,protein,fat,energyKJ,servingSizeSuggestion,addonGroups\n';
export const ORDERS_HEADERS = 'id,userId,items,total,status,orderType,customerName,phone,email,orderTime,createdAt,bookingId,tableNumber,paymentType,paymentId\n';
export const USERS_HEADERS = 'id,email,password,role,name,phone,accountStatus,loyaltyPoints\n'; 
export const CONVERSION_RATES_HEADERS = 'targetCurrencyCode,rate\n';
export const GENERAL_SETTINGS_HEADERS = 'companyName,companyAddress,companyPhone,companyLogoUrl,invoiceHeaderText,panNumber,gstNumber,fssaiNumber,scanForOrderQRUrl,scanForPayQRUrl,invoiceFooterText1,invoiceFooterText2,currencyCode,currencySymbol,gstPercentage,vatPercentage,cessPercentage,printElements,websiteHeaderLogoUrl,heroBackgroundMediaUrl,welcomeMediaUrl,orderTakeawayMediaUrl,bookATableMediaUrl,signatureDishBackgroundMediaUrl,operatingHours,defaultThermalPrinterId,autoGenerateInvoiceFooterQuote,invoiceFooterQuoteLanguage,idCardAddressLine,idCardDefaultSignatory,idCardReturnInstructions,idCardPropertyOfLine,autoLogoutTimeoutMinutes,dailyOrderLimitsByRole,globalDisplayLanguage,homepageLayoutConfig,invoiceSectionOrder,enableAutomatedExpenseInventoryReport,automatedReportFrequency,automatedReportRecipientEmail,availableThemes,activeThemeId,footerAboutText,footerContactAddress,footerContactEmail,footerCopyrightText,footerFacebookUrl,footerInstagramUrl,footerTwitterUrl,termsAndConditionsContent,disclaimerContent,userGuideContent,faqContent,menuCategoryEnhancements,showCalculatedCostOnInvoiceAdmin,showNutritionalInfoOnInvoice,dailyRevenueThreshold,employeeBonusAmount,bonusPercentageAboveThreshold,autoApproveNewOrders,autoApproveTableBookings,autoApproveRoomBookings,roomBookingMediaUrl,loyaltyProgramEnabled,pointsPerCurrencyUnit,pointValueInCurrency\n';
export const PRINTER_SETTINGS_HEADERS = 'id,name,connectionType,ipAddress,port,paperWidth,autoCut,linesBeforeCut,openCashDrawer,dpi\n';
export const BOOKINGS_HEADERS = 'id,userId,bookingType,date,time,partySize,customerName,phone,email,items,status,requestedResourceId,assignedResourceId,notes\n';
export const RESTAURANT_TABLES_HEADERS = 'id,name,capacity,status,notes\n';
export const ROOMS_HEADERS = 'id,name,description,capacity,pricePerNight,amenities,imageUrls\n';
export const ROOM_STOCK_ITEMS_HEADERS = 'id,roomId,menuItemId,stockQuantity\n';
export const ROLE_PERMISSIONS_HEADERS = 'roleName,allowedRouteIds\n';
export const DISCOUNTS_HEADERS = 'id,code,type,value,validFrom,validTo,usageLimit,timesUsed,minOrderAmount,isActive,description,imageUrl,aiHint\n';
export const OFFERS_HEADERS = 'id,title,description,type,details,imageUrl,aiHint,validFrom,validTo,isActive,linkedMenuItemIds\n';
export const BANNERS_HEADERS = 'id,title,imageUrl,aiHint,linkUrl,displayOrder,isActive,validFrom,validTo\n';
export const MANAGED_IMAGES_HEADERS = 'id,context,entityId,imageUrl,aiPromptUsed,aiHint,altText,uploadedAt\n';
export const STOCK_ITEMS_HEADERS = 'id,name,category,unit,currentStock,reorderLevel,supplier,purchasePrice,lastPurchaseDate\n';
export const EXPENSES_HEADERS = 'id,date,description,category,amount,notes,receiptUrl,isRecurring,recurrenceType,recurrenceEndDate\n';
export const STOCK_MENU_MAPPINGS_HEADERS = 'id,stockItemId,menuItemId,quantityUsedPerServing,unitUsed\n';
export const RATE_LIMIT_CONFIG_HEADERS = 'otpRequestsPerHour,otpRequestsPerDay,signupAttemptsPerHour,signupAttemptsPerDay\n';
export const EMPLOYEES_HEADERS = 'id,employeeId,name,designation,department,dateOfJoining,mappedUserId,baseSalary,salaryCalculationType\n';
export const ATTENDANCE_HEADERS = 'id,employeeId,date,checkInTime,checkOutTime,status,notes\n';
export const SALARY_PAYMENTS_HEADERS = 'id,paymentDate,periodFrom,periodTo,employeeId,employeeName,baseSalaryForPeriod,bonusForPeriod,deductions,netPay\n';
export const MENUS_HEADERS = 'id,name,description,isActive,menuItemIds\n';
export const ADDON_GROUPS_HEADERS = 'id,name,description,addons\n';
export const FEEDBACK_HEADERS = 'id,rating,category,comments,customerName,contactInfo,createdAt,source\n';
export const FEEDBACK_CATEGORIES_HEADERS = 'id,name,description\n';
