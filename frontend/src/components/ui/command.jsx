import { Command as CommandPrimitive } from 'cmdk'
import { cn } from '@/lib/utils.js'

const Command = ({ className, ...props }) => (
  <CommandPrimitive
    className={cn(
      'bg-popover text-popover-foreground flex h-auto max-h-[calc(100vh-6rem)] w-[22rem] flex-col overflow-hidden rounded-xl border border-border/30 shadow-lift data-[open]:animate-fade',
      className,
    )}
    {...props}
  />
)
Command.displayName = 'Command'

const CommandDialog = ({ className, children, ...props }) => (
  <CommandPrimitive.Dialog
    className="fixed inset-0 z-50"
    {...props}
  >
    <div className="fixed inset-0 bg-background/60 backdrop-blur-sm" aria-hidden="true" />
    <div
      className={cn(
        'fixed left-1/2 top-[8rem] w-[min(90vw,28rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-popover shadow-float',
        className,
      )}
    >
      <CommandPrimitive.Input
        className="flex h-12 w-full items-center gap-2 border-b border-border bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground/70"
        {...props}
      />
      <CommandPrimitive.List className="max-h-80 overflow-y-auto p-1">{children}</CommandPrimitive.List>
    </div>
  </CommandPrimitive.Dialog>
)
CommandDialog.displayName = 'CommandDialog'

const CommandEmpty = ({ className, ...props }) => (
  <CommandPrimitive.Empty
    className={cn('py-6 text-center text-sm text-muted-foreground', className)}
    {...props}
  />
)
CommandEmpty.displayName = 'CommandEmpty'

const CommandGroup = ({ className, ...props }) => (
  <CommandPrimitive.Group
    className={cn(
      'text-foreground',
      className,
    )}
    {...props}
  />
)
CommandGroup.displayName = 'CommandGroup'

const CommandList = ({ className, ...props }) => (
  <CommandPrimitive.List
    className={cn('max-h-80 overflow-y-auto', className)}
    {...props}
  />
)
CommandList.displayName = 'CommandList'

const CommandItem = ({ className, ...props }) => (
  <CommandPrimitive.Item
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none',
      'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
      'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
      className,
    )}
    {...props}
  />
)
CommandItem.displayName = 'CommandItem'

const CommandInput = ({ className, ...props }) => (
  <CommandPrimitive.Input
    className={cn(
      'flex h-11 w-full border-b border-border bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground/70',
      className,
    )}
    {...props}
  />
)
CommandInput.displayName = 'CommandInput'

const CommandShortcut = ({ className, ...props }) => (
  <span
    className={cn(
      'ml-auto num text-xs font-medium text-muted-foreground/60',
      className,
    )}
    {...props}
  />
)
CommandShortcut.displayName = 'CommandShortcut'

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
}
