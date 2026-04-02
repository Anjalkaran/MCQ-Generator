
"use client";

import React from 'react';
import { Instagram, Facebook, Send, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const socialLinks = [
  {
    name: 'WhatsApp',
    icon: WhatsAppIcon,
    handle: 'Join Group',
    url: 'https://chat.whatsapp.com/Grvj9hhwAu101gv40xns2v',
    color: 'hover:bg-[#25D366] hover:text-white',
    iconColor: 'text-[#25D366]',
    shadow: 'hover:shadow-[0_0_15px_rgba(37,211,102,0.4)]',
  },
  {
    name: 'Instagram',
    icon: Instagram,
    handle: '@anjalkaran2.0',
    url: 'https://www.instagram.com/anjalkaran2.0',
    color: 'hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:text-white',
    iconColor: 'text-[#bc1888]',
    shadow: 'hover:shadow-[0_0_15px_rgba(220,39,67,0.4)]',
  },
  {
    name: 'Facebook',
    icon: Facebook,
    handle: '@anjalkaran2.0',
    url: 'https://www.facebook.com/anjalkaran2.0',
    color: 'hover:bg-[#1877F2] hover:text-white',
    iconColor: 'text-[#1877F2]',
    shadow: 'hover:shadow-[0_0_15px_rgba(24,119,242,0.4)]',
  },
  {
    name: 'Telegram',
    icon: Send,
    handle: '@anjalkaran',
    url: 'https://t.me/anjalkaran',
    color: 'hover:bg-[#0088cc] hover:text-white',
    iconColor: 'text-[#0088cc]',
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
            "pointer-events-auto flex items-center gap-3 p-2.5 rounded-l-2xl sm:rounded-2xl transition-all duration-500 ease-out",
            "bg-white/90 backdrop-blur-md border border-slate-200 shadow-lg",
            "translate-x-[calc(100%-48px)] hover:translate-x-0",
            social.color,
            social.shadow,
            "group"
          )}
          style={{ 
            transitionDelay: `${index * 50}ms`
          }}
        >
          <div className="flex items-center gap-3 min-w-[48px] justify-center">
             <social.icon className={cn("h-5 w-5 shrink-0 transition-colors duration-300", social.iconColor, "group-hover:text-white")} />
             <span className="text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pr-2">
               {social.handle}
             </span>
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
