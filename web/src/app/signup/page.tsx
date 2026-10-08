import { publicSupabase } from '@/lib/supabase/env'
import { SignupFormPage } from './form'

export const dynamic = 'force-dynamic'

export default function Page() {
  return <SignupFormPage cfg={publicSupabase()} />
}
