
"use client";

import { useState, useEffect } from "react";
import { Bell, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Notification } from "@/lib/types";
import { formatDistanceToNow } from 'date-fns';
import { markNotificationsAsRead } from "@/lib/firestore";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface AdminNotificationsProps {
  initialNotifications: Notification[];
}

export function AdminNotifications({ initialNotifications }: AdminNotificationsProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleOpenChange = async (open: boolean) => {
    // When the dropdown is closed and there are unread notifications
    if (!open && unreadCount > 0) {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      try {
        await markNotificationsAsRead(unreadIds);
        // Update the state to reflect that notifications are now read
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } catch (error) {
        console.error("Failed to mark notifications as read:", error);
      }
    }
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
           <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-96">
            <DropdownMenuGroup>
                {notifications.length > 0 ? (
                    notifications.map(notification => (
                        <DropdownMenuItem key={notification.id} asChild>
                            <Link href={`/dashboard/admin/history/${notification.userId}`} className="flex items-start gap-3 w-full cursor-pointer">
                                <div className="p-2 bg-primary/10 rounded-full mt-1">
                                    <UserPlus className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium leading-tight">{notification.message}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                                    </p>
                                </div>
                            </Link>
                        </DropdownMenuItem>
                    ))
                ) : (
                    <div className="text-center text-sm text-muted-foreground p-4">
                        You have no notifications.
                    </div>
                )}
            </DropdownMenuGroup>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
