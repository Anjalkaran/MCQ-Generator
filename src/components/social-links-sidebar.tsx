
"use client";

import React from 'react';
import { Instagram, Facebook, Send, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const socialLinks = [
  {
    name: 'Instagram',
    icon: Instagram,
    handle: '@anjalkaran2.0',
    url: 'https://www.instagram.com/anjalkaran2.0',
    color: 'hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:text-white',
    shadow: 'hover:shadow-[0_0_15px_rgba(220,39,67,0.4)]',
  },
  {
    name: 'Facebook',
    icon: Facebook,
    handle: '@anjalkaran2.0',
    url: 'https://www.facebook.com/anjalkaran2.0',
    color: 'hover:bg-[#1877F2] hover:text-white',
    shadow: 'hover:shadow-[0_0_15px_rgba(24,119,242,0.4)]',
  },
  {
    name: 'Telegram',
    icon: Send,
    handle: '@anjalkaran',
    url: 'https://t.me/anjalkaran',
    color: 'hover:bg-[#0088cc] hover:text-white',
    shadow: 'hover:shadow-[0_0_15px_rgba(0,136,204,0.4)]',
  },
];

export function SocialLinksSidebar() {
  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-2 items-end pointer-events-none group/container sm:pr-2">
      {socialLinks.map((social, index) => (
        <a
          key={social.name}
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "pointer-events-auto flex items-center gap-3 pr-3 p-2.5 rounded-l-2xl sm:rounded-2xl transition-all duration-500 ease-out",
            "bg-white/80 backdrop-blur-md border border-slate-200 shadow-lg",
            "translate-x-[calc(100%-48px)] hover:translate-x-0",
            social.color,
            social.shadow,
            "group"
          )}
          style={{ 
            transitionDelay: `${index * 50}ms`
          }}
        >
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
             <span className="text-xs font-bold pl-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
               {social.handle}
             </span>
             <social.icon className="h-5 w-5 shrink-0" />
          </div>
        </a>
      ))}
      
      {/* Scroll Hint / Tag Label */}
      <div className="pointer-events-none flex items-center gap-2 transform rotate-90 origin-right mt-14 opacity-40 group-hover/container:opacity-10 transition-opacity">
         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">Follow Us</span>
         <div className="h-0.5 w-8 bg-slate-300" />
      </div>
    </div>
  );
}
