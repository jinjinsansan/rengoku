import { publicSupabase } from '@/lib/supabase/env'
import { ForgotForm } from './form'

export const dynamic = 'force-dynamic'

export default function Page() {
  return <ForgotForm cfg={publicSupabase()} />
}
