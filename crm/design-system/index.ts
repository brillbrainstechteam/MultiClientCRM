/**
 * Public surface of the shared design system.
 *
 * Modules import from `@crm/design-system` only. Adding a component here is a
 * global commitment — extend an existing primitive with props before creating a
 * new one, and never fork a primitive per module.
 */

export { Button } from './Button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button';

export { IconButton } from './IconButton';
export type { IconButtonProps } from './IconButton';

export { Badge, StatusBadge, SeverityBadge } from './Badge';
export type { BadgeProps, BadgeTone, Severity } from './Badge';

export { Avatar } from './Avatar';
export type { AvatarProps } from './Avatar';

export { Select } from './Select';
export type { SelectOption, SelectProps } from './Select';

export { SearchField } from './SearchField';
export type { SearchFieldProps } from './SearchField';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Textarea } from './Textarea';
export type { TextareaProps } from './Textarea';

export { Checkbox } from './Checkbox';
export type { CheckboxProps } from './Checkbox';

export { Toggle } from './Toggle';
export type { ToggleProps } from './Toggle';

export { Drawer } from './Drawer';
export type { DrawerProps } from './Drawer';

export { Modal, ConfirmDialog } from './Modal';
export type { ModalProps, ConfirmDialogProps } from './Modal';

export { Toast } from './Toast';
export type { ToastProps, ToastTone } from './Toast';

export { Tabs } from './Tabs';
export type { TabItem, TabsProps } from './Tabs';

export { FilterChip } from './FilterChip';
export type { FilterChipProps } from './FilterChip';

export { KpiCard } from './KpiCard';
export type { KpiCardProps } from './KpiCard';

export { AttentionCard } from './AttentionCard';
export type { AttentionCardProps, AttentionTone } from './AttentionCard';

export { DataTable } from './DataTable';
export type { Column, DataTableProps } from './DataTable';

export { Stepper } from './Stepper';
export type { StepperItem, StepperProps } from './Stepper';

export { WizardShell } from './WizardShell';
export type { WizardShellProps } from './WizardShell';

export {
  EmptyState,
  ErrorState,
  PermissionRestricted,
  DisconnectedState,
  PartialDataState,
  LoadingSkeleton,
} from './StateViews';
export type { LoadingSkeletonProps } from './StateViews';

export { Banner } from './Banner';
export type { BannerProps, BannerTone } from './Banner';

export { Popover } from './Popover';
export type { PopoverProps } from './Popover';

export { WidgetShell } from './WidgetShell';
export type { WidgetShellProps, WidgetState } from './WidgetShell';

export { TrendMini } from './TrendMini';
export type { TrendMiniProps } from './TrendMini';
