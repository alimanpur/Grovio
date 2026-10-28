import { Toaster as SonnerToaster } from 'sonner'

const Toaster = ({ ...props }) => (
  <SonnerToaster
    theme="system"
    closeButton
    richColors
    expand={false}
    toastOptions={{
      classNames: {
        toast: 'group toast group bg-popover text-foreground',
        success: 'group toast group bg-sprout/10 text-sprout-foreground',
        error: 'group toast group bg-destructive/10 text-destructive',
        warning: 'group toast group bg-saffron/10 text-saffron-foreground',
        info: 'group toast group bg-primary/10 text-primary',
      },
    }}
    {...props}
  />
)

export { Toaster }
