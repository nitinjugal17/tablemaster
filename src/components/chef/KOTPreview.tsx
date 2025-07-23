"use client";

import type { Order, OrderItem } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import React from 'react';

interface KOTPreviewProps {
  order: Order;
}

export const KOTPreview: React.FC<KOTPreviewProps> = ({ order }) => {
  const orderItemsArray: OrderItem[] = Array.isArray(order.items)
    ? order.items
    : typeof order.items === 'string'
    ? JSON.parse(order.items)
    : [];

  // Safely format the date, handling both string and Date object cases
  const formattedTime = React.useMemo(() => {
    if (!order.createdAt) return 'N/A';
    try {
      const dateObject = typeof order.createdAt === 'string' ? parseISO(order.createdAt) : order.createdAt;
      return format(dateObject, "HH:mm:ss");
    } catch (e) {
      console.error("Failed to parse date in KOTPreview:", order.createdAt, e);
      return 'Invalid Time';
    }
  }, [order.createdAt]);


  return (
    <div id="kot-preview-content" className="p-2 font-sans bg-white text-black text-sm">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold">KITCHEN ORDER TICKET</h2>
        <p className="font-semibold">Order #{String(order.id).substring(0, 8)}</p>
      </div>
      <div className="flex justify-between mb-2 text-xs">
        <span>Time: {formattedTime}</span>
        <span className="font-bold text-base">
          {order.orderType === 'Dine-in' && order.tableNumber
            ? `Table: ${order.tableNumber}`
            : order.orderType}
        </span>
      </div>
      <hr className="border-t-2 border-dashed border-black my-1" />
      
      {order.notes && (
        <>
            <div className="mt-2 text-xs">
                <p className="font-bold">Order Notes:</p>
                <p className="whitespace-pre-wrap">{order.notes}</p>
            </div>
            <hr className="border-t-2 border-dashed border-black my-1" />
        </>
      )}

      <ul className="space-y-1">
        {orderItemsArray.map((item, index) => {
          const itemDisplayName = item.selectedPortion && item.selectedPortion !== "fixed"
            ? `${item.name} (${item.selectedPortion})`
            : item.name;
          return (
            <li key={`${item.menuItemId}-${index}`} className="break-words">
              <div className="flex text-base">
                <span className="font-bold mr-2">{item.quantity}x</span>
                <span className="font-semibold">{itemDisplayName}</span>
              </div>
              {item.note && (
                <p className="pl-6 text-xs font-semibold italic text-gray-800">
                  - NOTE: {item.note}
                </p>
              )}
            </li>
          );
        })}
      </ul>
       <hr className="border-t-2 border-dashed border-black mt-2" />
       <div className="text-center text-xs mt-1">
         Items: {orderItemsArray.reduce((acc, item) => acc + item.quantity, 0)}
       </div>
    </div>
  );
};
