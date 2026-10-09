import { publicSupabase } from '@/lib/supabase/env'
import { ResetForm } from './form'

export const dynamic = 'force-dynamic'

export default function Page() {
  return <ResetForm cfg={publicSupabase()} />
}
