import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base: pill shape, vlyr.io morph interaction, shared transitions
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Black pill → rectangle morph (vlyr.io primary CTA)
        default:
          'bg-[#0A0A0A] text-white shadow-sm hover:bg-[#1F1F1F] hover:rounded-2xl',
        // Yellow pill → rectangle morph (vlyr.io yellow CTA)
        yellow:
          'bg-[#FFE100] text-[#0A0A0A] shadow-sm hover:bg-[#F5D800] hover:rounded-2xl',
        // Outlined pill → rectangle morph (vlyr.io secondary CTA)
        outline:
          'border border-[#E5E5E5] bg-white text-[#0A0A0A] hover:border-[#0A0A0A] hover:rounded-2xl',
        // Subtle secondary
        secondary:
          'bg-[#F0F0F0] text-[#0A0A0A] hover:bg-[#E5E5E5] hover:rounded-2xl',
        destructive:
          'bg-[#C4841D] text-white hover:bg-[#b37519] hover:rounded-2xl',
        ghost:
          'hover:bg-[#F0F0F0] text-[#0A0A0A] hover:rounded-2xl',
        link: 'text-[#0A0A0A] underline-offset-4 hover:underline rounded-none',
      },
      size: {
        default: 'h-10 px-6 py-2.5 has-[>svg]:px-4',
        sm: 'h-8 px-4 text-xs has-[>svg]:px-3',
        lg: 'h-12 px-8 text-base has-[>svg]:px-6',
        xl: 'h-14 px-10 text-base has-[>svg]:px-8',
        icon: 'size-10',
        'icon-sm': 'size-8',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
