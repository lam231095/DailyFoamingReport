import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key if available, otherwise fall back to anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''

interface PlanRecord {
  firm_plan: string
  no_order?: string | null
  bun_code?: string | null
  pu_code?: string | null
  ten_san_pham?: string | null
  sl_sheet?: number | null
  sl_bun_can_tach?: number | null
  sl_bun_can_do?: number | null
  completion_date?: string | null
  delivery_date?: string | null
  week_label: string
  synced_at: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { records }: { records: PlanRecord[] } = body

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Không có dữ liệu để upload.' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const BATCH_SIZE = 50
    let uploaded = 0
    let failed = 0
    const errors: string[] = []

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)

      const { error } = await supabase
        .from('production_plan')
        .upsert(batch, { onConflict: 'firm_plan' })

      if (error) {
        failed += batch.length
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      } else {
        uploaded += batch.length
      }
    }

    return NextResponse.json({
      success: true,
      uploaded,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error('[upload-plan] Error:', err)
    return NextResponse.json(
      { error: 'Lỗi server. Vui lòng thử lại.' },
      { status: 500 }
    )
  }
}
