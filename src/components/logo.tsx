
import Image from 'next/image';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Logo({ className, height = 40, width = 120, ...props }: Omit<ComponentProps<'div'>, 'children'> & { height?: number; width?: number }) {
  return (
    <div className={cn("relative h-10 w-auto", className)} style={{ height: `${height}px`, width: `${width}px` }} {...props}>
      <Image
        src="/header-logo.png"
        alt="AnjalKaran Logo"
        width={width * 3} // Maintain crispness
        height={height * 3}
        priority
        className="h-full w-auto object-contain"
      />
    </div>
  );
}
