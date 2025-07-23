
import type { ComponentProps } from 'react';

export function Logo(props: Omit<ComponentProps<'svg'>, 'children'>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 300 100"
      width={280}
      height={100}
      {...props}
    >
      <text
        x="10"
        y="65"
        fontFamily="Verdana, sans-serif"
        fontSize="50"
        fill="#FFC700"
        fontStyle="italic"
      >
        Anjal
      </text>
      <text
        x="135"
        y="65"
        fontFamily="Verdana, sans-serif"
        fontSize="50"
        fill="hsl(var(--primary))"
      >
        karan
      </text>
    </svg>
  );
}
