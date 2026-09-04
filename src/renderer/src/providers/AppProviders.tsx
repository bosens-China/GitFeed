import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@renderer/theme/ThemeProvider'
import { CursorTooltipProvider } from '@renderer/components/CursorTooltip'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false
          }
        }
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CursorTooltipProvider>{children}</CursorTooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
