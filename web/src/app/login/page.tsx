import { publicSupabase } from '@/lib/supabase/env'
import { LoginFormPage } from './form'

export const dynamic = 'force-dynamic'

export default function Page() {
  return <LoginFormPage cfg={publicSupabase()} />
}
