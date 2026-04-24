/**
 * Nav link styles (Emil: touch targets ≥44px, hover only on fine pointers, 150ms color transitions, focus-visible).
 */
export function mainNavLinkClass({ isActive }: { isActive: boolean }): string {
  const base = [
    'inline-flex min-h-11 items-center justify-center rounded-md px-3 py-2 text-sm font-medium',
    'transition-[color,background-color,opacity] duration-150 ease-out',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900/80',
    'dark:focus-visible:outline-slate-200/80',
  ].join(' ')
  if (isActive) {
    return [base, 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'].join(' ')
  }
  return [
    base,
    'text-slate-600 [@media(hover:hover)]:hover:bg-slate-200/80 [@media(hover:hover)]:hover:text-slate-900',
    'dark:text-slate-400 dark:[@media(hover:hover)]:hover:bg-slate-800 dark:[@media(hover:hover)]:hover:text-slate-100',
  ].join(' ')
}

export function analyticsSubNavLinkClass({ isActive }: { isActive: boolean }): string {
  const base = [
    'inline-flex min-h-11 items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium',
    'transition-[color,background-color,opacity] duration-150 ease-out',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900/80',
    'dark:focus-visible:outline-slate-200/80',
  ].join(' ')
  if (isActive) {
    return [base, 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'].join(' ')
  }
  return [
    base,
    'text-slate-600 [@media(hover:hover)]:hover:bg-slate-200/80 [@media(hover:hover)]:hover:text-slate-900',
    'dark:text-slate-400 dark:[@media(hover:hover)]:hover:bg-slate-800 dark:[@media(hover:hover)]:hover:text-slate-100',
  ].join(' ')
}
