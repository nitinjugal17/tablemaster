"use client";

import type { Order, OrderItem } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import React from 'react';

interface ConsolidatedKOTPreviewProps {
  orders: Order[];
}

export const ConsolidatedKOTPreview: React.FC<ConsolidatedKOTPreviewProps> = ({ orders }) => {
  const formattedTime = React.useMemo(() => {
    return format(new Date(), "HH:mm:ss");
  }, []);

  const totalItemCount = React.useMemo(() => {
    return orders.reduce((total, order) => {
      const orderItemsArray: OrderItem[] = Array.isArray(order.items)
        ? order.items
        : typeof order.items === 'string'
        ? JSON.parse(order.items)
        : [];
      return total + orderItemsArray.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
  }, [orders]);

  return (
    <div id="consolidated-kot-preview-content" className="p-2 font-sans bg-white text-black text-sm">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold">CONSOLIDATED KOT</h2>
        <p className="font-semibold">All Preparing Orders</p>
      </div>
      <div className="flex justify-between mb-2 text-xs">
        <span>Time: {formattedTime}</span>
        <span className="font-bold">Total Items: {totalItemCount}</span>
      </div>
      <hr className="border-t-2 border-dashed border-black my-1" />

      {orders.map(order => {
        const orderItemsArray: OrderItem[] = Array.isArray(order.items)
          ? order.items
          : typeof order.items === 'string'
          ? JSON.parse(order.items)
          : [];

        return (
          <div key={order.id} className="my-2">
            <h3 className="font-bold text-base">
              Order #{String(order.id).substring(0, 8)} ({order.tableNumber || order.orderType})
            </h3>
            <ul className="space-y-1 mt-1">
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
             <hr className="border-t border-dashed border-black my-2 opacity-50 last:hidden" />
          </div>
        )
      })}
    </div>
  );
};
