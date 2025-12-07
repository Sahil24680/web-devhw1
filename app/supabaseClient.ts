// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://trwvyfchwrbwgqcoafjq.supabase.co'
const supabaseKey = 'sb_publishable_DKBKjHosQLcfHYFZfkQWyA_drXM6SLf'

export const supabase = createClient(supabaseUrl, supabaseKey)
