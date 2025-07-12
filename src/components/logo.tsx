
import type { ComponentProps } from 'react';
import Image from 'next/image';

export function Logo(props: Omit<ComponentProps<typeof Image>, 'src' | 'alt'>) {
  return (
    <Image
      src="/logo.png"
      alt="Anjalkaran Logo"
      width={280}
      height={100}
      priority
      {...props}
    />
  );
}
