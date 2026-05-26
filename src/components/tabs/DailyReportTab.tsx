'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, Calendar,
  Activity, Zap, Factory, CheckCircle2,
  Clock, Filter, X, ArrowRight, Layers,
  ChevronDown, ChevronUp
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionUser, FoamingPourReport, FoamingSeparateReport } from '@/types'
import { getReportTimeRange, formatReportDate } from '@/lib/dateUtils'
import { TrendingUp, Award } from 'lucide-react'

function cleanProductName(name: string | null | undefined): string {
  if (!name) return '---'
  let clean = name.trim()
  clean = clean.replace(/^ortholite\s*/i, '')
  clean = clean.replace(/\[[^\]]*\]\s*/g, '')
  clean = clean.replace(/\b\d+(\.\d+)?\s*mm\b/gi, '')
  clean = clean.replace(/\b\d+(\.\d+)?\s*[Mm]\s*[xX]\s*\d+(\.\d+)?\s*[Mm]\b/g, '')
  clean = clean.replace(/\b\d+(\.\d+)?\s*[Mm]\b/g, '')
  clean = clean.replace(/\b(\d+(?:-\d+)?)(?:\s*\+\/-\s*\d+)?\s*asker\s*([a-zA-Z])\b/gi, '$1$2')
  return clean.replace(/\s+/g, ' ').trim() || '---'
}

const TARGET_POUR = 320
const TARGET_SEPARATE = 300
const MANAGERS = ['Linh', 'Thảo', 'Tuấn Anh']
const ALL_CHART_MANAGERS = [...MANAGERS, 'Khác']
const MANAGER_COLORS: Record<string, string> = {
  'Linh': '#3b82f6',
  'Thảo': '#a855f7',
  'Tuấn Anh': '#10b981',
  'Khác': '#94a3b8'
}
const safeId = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_')

interface DailyReportTabProps { user: SessionUser }

type AggregatedDay = {
  date: string
  poured: number
  separated: number
  separatedSheets: number
  pouredByShift: Record<string, number>
  separatedByShift: Record<string, number>
  separatedByShiftSheets: Record<string, number>
  pouredByManager: Record<string, { actual: number; shifts: Set<string> }>
  separatedByManager: Record<string, { actual: number; shifts: Set<string>; actualSheets: number }>
}

type AreaFilter = 'all' | 'pour' | 'separate'
const SHIFTS = ['Ca 1', 'Ca 2', 'Ca 3', 'Ca HC']
const SHIFT_COLORS: Record<string, string> = {
  'Ca 1': 'text-orange-500', 'Ca 2': 'text-yellow-500',
  'Ca 3': 'text-blue-500', 'Ca HC': 'text-purple-500'
}

function todayStr() { return new Date().toISOString().split('T')[0] }
function last7DaysStr() {
  const d = new Date(); d.setDate(d.getDate() - 6)
  return d.toISOString().split('T')[0]
}
function firstDayOfMonth() {
  const d = new Date(); d.setDate(1)
  return d.toISOString().split('T')[0]
}

function SvgBarChart({
  data, maxVal, showPour, showSep
}: {
  data: AggregatedDay[]
  maxVal: number
  showPour: boolean
  showSep: boolean
}) {
  const W = 720
  const H = 280
  const PAD_L = 48
  const PAD_R = 12
  const PAD_T = 20
  const PAD_B = 48
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B
  const n = data.length
  const groupW = chartW / Math.max(n, 1)
  const barCount = (showPour ? 1 : 0) + (showSep ? 1 : 0)
  const barW = Math.max(8, Math.min(36, groupW / (barCount + 1)))
  const gridLines = 5
  const yTick = (i: number) => PAD_T + (chartH / gridLines) * i

  return (
    <div className="w-full">
      <style>{`
        .svg-bar { transition: opacity 0.15s; }
        .svg-bar-group:hover .svg-bar { opacity: 0.4; }
        .svg-bar-group:hover .svg-bar-hovered { opacity: 1; }
        .svg-tooltip { display: none; }
        .svg-bar-group:hover .svg-tooltip { display: block; }
      `}</style>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {ALL_CHART_MANAGERS.map(m => (
            <linearGradient key={m} id={`barGrad_prod_${safeId(m)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MANAGER_COLORS[m]} stopOpacity="1" />
              <stop offset="100%" stopColor={MANAGER_COLORS[m]} stopOpacity="0.65" />
            </linearGradient>
          ))}
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0004" />
          </filter>
        </defs>

        {/* Y-axis grid */}
        {[...Array(gridLines + 1)].map((_, i) => {
          const y = yTick(i)
          const val = Math.round(maxVal * (1 - i / gridLines))
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke={i === gridLines ? '#cbd5e1' : '#e2e8f0'}
                strokeWidth={i === gridLines ? 1.5 : 1}
                strokeDasharray={i === gridLines ? '0' : '4 4'}
              />
              <text x={PAD_L - 6} y={y + 4} textAnchor="end"
                fontSize="9" fill="#94a3b8" fontWeight="600">
                {val > 0 ? val.toLocaleString() : '0'}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {data.map((day, idx) => {
          const cx = PAD_L + groupW * idx + groupW / 2
          const totalBars = (showPour ? 1 : 0) + (showSep ? 1 : 0)
          const offset = totalBars === 2 ? barW / 2 + 1 : 0
          const pourX = cx - offset - barW / 2
          const sepX = totalBars === 2 ? cx + offset - barW / 2 : cx - barW / 2

          const pourH = maxVal > 0 ? (day.poured / maxVal) * chartH : 0
          const sepH = maxVal > 0 ? (day.separated / maxVal) * chartH : 0
          const pourY = PAD_T + chartH - pourH
          const sepY = PAD_T + chartH - sepH

          const labelX = cx
          const labelY = PAD_T + chartH + 14

          return (
            <g key={day.date} className="svg-bar-group" style={{ cursor: 'default' }}>
              {/* Pour bar */}
              {showPour && pourH > 0 && (
                <>
                  {(() => {
                    let currentY = PAD_T + chartH
                    const segments = ALL_CHART_MANAGERS.map(m => {
                      const val = m === 'Khác'
                        ? Object.keys(day.pouredByManager)
                            .filter(k => !MANAGERS.includes(k))
                            .reduce((sum, k) => sum + day.pouredByManager[k].actual, 0)
                        : day.pouredByManager[m]?.actual || 0
                      return { manager: m, val }
                    }).filter(s => s.val > 0)

                    return segments.map((seg, sIdx) => {
                      const segH = maxVal > 0 ? (seg.val / maxVal) * chartH : 0
                      const segY = currentY - segH
                      currentY = segY
                      return (
                        <rect
                          key={seg.manager}
                          className="svg-bar svg-bar-hovered"
                          x={pourX} y={segY} width={barW} height={Math.max(segH, 1)}
                          rx="1.5" fill={`url(#barGrad_prod_${safeId(seg.manager)})`} filter="url(#shadow)"
                        />
                      )
                    })
                  })()}
                  {pourH > 10 && (
                    <text x={pourX + barW / 2} y={pourY - 4} textAnchor="middle"
                      fontSize="8" fill="#3b82f6" fontWeight="800" className="svg-bar svg-bar-hovered">
                      {day.poured}
                    </text>
                  )}
                </>
              )}

              {/* Sep bar */}
              {showSep && sepH > 0 && (
                <>
                  {(() => {
                    let currentY = PAD_T + chartH
                    const segments = ALL_CHART_MANAGERS.map(m => {
                      const val = m === 'Khác'
                        ? Object.keys(day.separatedByManager)
                            .filter(k => !MANAGERS.includes(k))
                            .reduce((sum, k) => sum + day.separatedByManager[k].actual, 0)
                        : day.separatedByManager[m]?.actual || 0
                      return { manager: m, val }
                    }).filter(s => s.val > 0)

                    return segments.map((seg, sIdx) => {
                      const segH = maxVal > 0 ? (seg.val / maxVal) * chartH : 0
                      const segY = currentY - segH
                      currentY = segY
                      return (
                        <rect
                          key={seg.manager}
                          className="svg-bar svg-bar-hovered"
                          x={sepX} y={segY} width={barW} height={Math.max(segH, 1)}
                          rx="1.5" fill={`url(#barGrad_prod_${safeId(seg.manager)})`} filter="url(#shadow)"
                        />
                      )
                    })
                  })()}
                  {sepH > 10 && (
                    <text x={sepX + barW / 2} y={sepY - 4} textAnchor="middle"
                      fontSize="8" fill="#a855f7" fontWeight="800" className="svg-bar svg-bar-hovered">
                      {day.separated}
                    </text>
                  )}
                </>
              )}

              {/* Tooltip on hover */}
              {(day.poured > 0 || day.separated > 0) && (
                <g className="svg-tooltip" pointerEvents="none">
                  {(() => {
                    const lines: { text: string; color: string; isHeader?: boolean }[] = []
                    if (showPour && day.poured > 0) {
                      lines.push({ text: `Đổ: ${day.poured.toLocaleString()}`, color: '#93c5fd', isHeader: true })
                      ALL_CHART_MANAGERS.forEach(m => {
                        const val = m === 'Khác'
                          ? Object.keys(day.pouredByManager)
                              .filter(k => !MANAGERS.includes(k))
                              .reduce((sum, k) => sum + day.pouredByManager[k].actual, 0)
                          : day.pouredByManager[m]?.actual || 0
                        if (val > 0) {
                          lines.push({ text: `• ${m}: ${val.toLocaleString()}`, color: MANAGER_COLORS[m] })
                        }
                      })
                    }
                    if (showSep && day.separated > 0) {
                      lines.push({ text: `Tách: ${day.separated.toLocaleString()}`, color: '#c4b5fd', isHeader: true })
                      ALL_CHART_MANAGERS.forEach(m => {
                        const val = m === 'Khác'
                          ? Object.keys(day.separatedByManager)
                              .filter(k => !MANAGERS.includes(k))
                              .reduce((sum, k) => sum + day.separatedByManager[k].actual, 0)
                          : day.separatedByManager[m]?.actual || 0
                        if (val > 0) {
                          lines.push({ text: `• ${m}: ${val.toLocaleString()}`, color: MANAGER_COLORS[m] })
                        }
                      })
                    }
                    
                    const tooltipH = lines.length * 13 + 10
                    const tooltipW = 100
                    const tx = cx - tooltipW / 2
                    const maxH = Math.max(pourH, sepH)
                    const ty = Math.max(5, PAD_T + chartH - maxH - tooltipH - 8)

                    return (
                      <g transform={`translate(${tx}, ${ty})`}>
                        <rect width={tooltipW} height={tooltipH} rx="6" fill="#1e293b" opacity="0.95" filter="url(#shadow)" />
                        {lines.map((line, li) => (
                          <text
                            key={li}
                            x={line.isHeader ? 6 : 12}
                            y={14 + li * 13}
                            fontSize={line.isHeader ? "9" : "8.5"}
                            fill={line.color}
                            fontWeight={line.isHeader ? "800" : "600"}
                          >
                            {line.text}
                          </text>
                        ))}
                      </g>
                    )
                  })()}
                </g>
              )}

              {/* X-axis label */}
              <text x={labelX} y={labelY} textAnchor="middle"
                fontSize="9" fill="#94a3b8" fontWeight="700">
                {day.date.split('/')[0]}/{day.date.split('/')[1]}
              </text>
            </g>
          )
        })}

        {/* Y-axis line */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + chartH}
          stroke="#cbd5e1" strokeWidth="1.5" />
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-[var(--border)]">
        <div className="flex gap-4">
          {showPour && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm border border-blue-500 bg-blue-500/10" />
              <span className="text-[10px] font-black text-blue-600 uppercase">Cột Trái: Đổ (Bun)</span>
            </div>
          )}
          {showSep && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm border border-purple-500 bg-purple-500/10" />
              <span className="text-[10px] font-black text-purple-600 uppercase">Cột Phải: Tách (Bun)</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {ALL_CHART_MANAGERS.map(m => (
            <div key={m} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: MANAGER_COLORS[m] }} />
              <span className="text-[10px] font-bold text-[var(--text-2)]">{m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function calcManagerPerf(
  day: AggregatedDay,
  manager: string,
  areaFilter: AreaFilter,
  tawnyShifts: Set<string>
): number | null {
  let totalActual = 0, compositeTarget = 0
  if (areaFilter !== 'separate' && day.pouredByManager[manager]) {
    totalActual += day.pouredByManager[manager].actual
    compositeTarget += TARGET_POUR
  }
  if (areaFilter !== 'pour' && day.separatedByManager[manager]) {
    totalActual += day.separatedByManager[manager].actual
    // Lấy 1 target tách duy nhất trong ngày (250 nếu có bất kỳ ca nào chạy Tawny Port, ngược lại 300)
    let targetSeparate = TARGET_SEPARATE
    day.separatedByManager[manager].shifts.forEach(s => {
      if (tawnyShifts.has(`${day.date}_${s}`)) {
        targetSeparate = 250
      }
    })
    compositeTarget += targetSeparate
  }
  if (compositeTarget === 0) return null
  return (totalActual / compositeTarget) * 100
}

function SvgPerformanceChart({
  data, dateList, managers, managerFilter, areaFilter, startDate, endDate, shiftFilter, tawnyShifts
}: {
  data: AggregatedDay[]
  dateList: string[]
  managers: string[]
  managerFilter: string
  areaFilter: AreaFilter
  startDate: string
  endDate: string
  shiftFilter: string
  tawnyShifts: Set<string>
}) {
  const activeManagers = managers.filter(m => managerFilter === 'Tất cả' || m === managerFilter)

  // Lấy 10 ngày gần nhất có ít nhất 1 manager có dữ liệu
  const datesWithData = [...dateList].reverse().filter(date => {
    const day = data.find(d => d.date === date)
    if (!day) return false
    return activeManagers.some(m => calcManagerPerf(day, m, areaFilter, tawnyShifts) !== null)
  }).slice(0, 10).reverse()

  const n = datesWithData.length
  if (n === 0) return (
    <div className="flex items-center justify-center py-12 text-[var(--text-3)] text-xs font-bold">
      Không có dữ liệu hiệu suất trong khoảng thời gian này
    </div>
  )

  // Tạo nhãn filter đang áp dụng
  const fmtDate = (d: string) => {
    const [y, m, dd] = d.split('-')
    return `${parseInt(dd)}/${parseInt(m)}`
  }

  const W = 720
  const H = 220
  const PAD_L = 46
  const PAD_R = 12
  const PAD_T = 36  // chừa chỗ cho label % phía trên
  const PAD_B = 32
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B
  const MAX_PERF = 120

  const groupW = chartW / n
  const barCount = activeManagers.length
  const totalBarZone = groupW * 0.78
  const barW = Math.max(6, Math.min(22, totalBarZone / barCount - 2))
  const barGap = 2

  const perfY = (perf: number) =>
    PAD_T + chartH - Math.min(1, perf / MAX_PERF) * chartH

  return (
    <div className="w-full">
      {/* Filter context badge */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 text-[10px] font-bold">
          📅 {fmtDate(startDate)} → {fmtDate(endDate)}
        </span>
        {shiftFilter !== 'Tất cả' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 text-[10px] font-bold">
            🕐 {shiftFilter}
          </span>
        )}
        {managerFilter !== 'Tất cả' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[10px] font-bold">
            👤 Quản lý: {managerFilter}
          </span>
        )}
        {areaFilter !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 text-[10px] font-bold">
            {areaFilter === 'pour' ? '💧 Khu vực Đổ' : '✂️ Khu vực Tách'}
          </span>
        )}
        <span className="ml-auto text-[10px] text-[var(--text-3)] font-bold">
          Hiển thị {n} ngày gần nhất có dữ liệu
        </span>
      </div>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', minWidth: 320 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {activeManagers.map(m => (
              <linearGradient key={m} id={`barGrad_${safeId(m)}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={MANAGER_COLORS[m]} stopOpacity="1" />
                <stop offset="100%" stopColor={MANAGER_COLORS[m]} stopOpacity="0.65" />
              </linearGradient>
            ))}
          </defs>

          {/* Vùng nền theo mức hiệu suất */}
          {/* Vùng đỏ: 0% → 80% */}
          <rect x={PAD_L} y={perfY(80)} width={chartW} height={chartH - (perfY(80) - PAD_T)}
            fill="#fee2e2" opacity="0.35" />
          {/* Vùng vàng: 80% → 100% */}
          <rect x={PAD_L} y={perfY(100)} width={chartW} height={perfY(80) - perfY(100)}
            fill="#fef9c3" opacity="0.5" />
          {/* Vùng xanh: 100% → 120% */}
          <rect x={PAD_L} y={PAD_T} width={chartW} height={perfY(100) - PAD_T}
            fill="#dcfce7" opacity="0.5" />

          {/* Grid lines Y */}
          {[0, 20, 40, 60, 80, 100, 120].map(val => {
            const y = perfY(val)
            if (y < PAD_T || y > PAD_T + chartH + 1) return null
            return (
              <g key={val}>
                <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                  stroke={val === 100 ? '#10b981' : '#e2e8f0'}
                  strokeWidth={val === 100 ? 1.5 : 0.8}
                  strokeDasharray={val === 100 ? '0' : '3 4'}
                />
                <text x={PAD_L - 5} y={y + 4} textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="600">
                  {val}%
                </text>
              </g>
            )
          })}

          {/* Đường 100% label */}
          <text x={W - PAD_R - 2} y={perfY(100) - 3} textAnchor="end" fontSize="7.5" fill="#10b981" fontWeight="800">
            MỤC TIÊU
          </text>

          {/* Cột nhóm theo ngày */}
          {datesWithData.map((date, idx) => {
            const day = data.find(d => d.date === date)
            const cx = PAD_L + groupW * idx + groupW / 2
            const totalBarW = barCount * barW + (barCount - 1) * barGap
            const startX = cx - totalBarW / 2

            return (
              <g key={date}>
                {/* X label */}
                <text x={cx} y={H - 8} textAnchor="middle" fontSize="8.5" fill="#64748b" fontWeight="700">
                  {date.split('/')[0]}/{date.split('/')[1]}
                </text>

                {/* Vertical separator */}
                {idx > 0 && (
                  <line x1={PAD_L + groupW * idx} y1={PAD_T} x2={PAD_L + groupW * idx} y2={PAD_T + chartH}
                    stroke="#e2e8f0" strokeWidth="0.5" />
                )}

                {/* Bars per manager */}
                {day && activeManagers.map((manager, mi) => {
                  const perf = calcManagerPerf(day, manager, areaFilter, tawnyShifts)
                  if (perf === null) return null
                  const bx = startX + mi * (barW + barGap)
                  const by = perfY(perf)
                  const bh = PAD_T + chartH - by
                  const color = MANAGER_COLORS[manager]
                  const perfCapped = Math.min(perf, MAX_PERF)
                  const isGood = perf >= 100

                  return (
                    <g key={manager}>
                      {/* Bar */}
                      <rect
                        x={bx} y={by} width={barW} height={Math.max(bh, 2)}
                        rx="3"
                        fill={`url(#barGrad_${safeId(manager)})`}
                      />
                      {/* % label phía trên cột */}
                      <text
                        x={bx + barW / 2}
                        y={by - 4}
                        textAnchor="middle"
                        fontSize="7.5"
                        fill={color}
                        fontWeight="800"
                      >
                        {Math.round(perf)}%
                      </text>
                      {/* Đánh dấu ✓ nếu ≥100% */}
                      {isGood && (
                        <text x={bx + barW / 2} y={by - 13} textAnchor="middle" fontSize="8" fill="#10b981">✓</text>
                      )}
                    </g>
                  )
                })}
              </g>
            )
          })}

          {/* Y-axis line */}
          <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + chartH} stroke="#cbd5e1" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-3 flex-wrap">
        {activeManagers.map(manager => {
          const color = MANAGER_COLORS[manager]
          // Avg perf trên toàn bộ dateList
          let tp = 0, cnt = 0
          datesWithData.forEach(date => {
            const day = data.find(d => d.date === date)
            if (!day) return
            const p = calcManagerPerf(day, manager, areaFilter, tawnyShifts)
            if (p !== null) { tp += p; cnt++ }
          })
          const avg = cnt > 0 ? Math.round(tp / cnt) : 0
          return (
            <div key={manager} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-[11px] font-bold text-[var(--text-2)]">{manager}</span>
              <span className={`text-[11px] font-black ${avg >= 100 ? 'text-green-600' : avg >= 80 ? 'text-orange-500' : 'text-red-500'}`}>
                TB: {avg}%
              </span>
            </div>
          )
        })}
        <div className="flex items-center gap-3 ml-4 border-l border-[var(--border)] pl-4">
          <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-green-200 opacity-80" /><span className="text-[9px] text-green-700 font-bold">≥100%</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-yellow-200 opacity-80" /><span className="text-[9px] text-yellow-700 font-bold">80-100%</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-red-200 opacity-80" /><span className="text-[9px] text-red-700 font-bold">&lt;80%</span></div>
        </div>
      </div>
    </div>
  )
}

export default function DailyReportTab({ user }: DailyReportTabProps) {

  const [loading, setLoading] = useState(true)
  const [pourReports, setPourReports] = useState<FoamingPourReport[]>([])
  const [separateReports, setSeparateReports] = useState<FoamingSeparateReport[]>([])

  // Filters
  const [startDate, setStartDate] = useState(last7DaysStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [shiftFilter, setShiftFilter] = useState<string>('Tất cả')
  const [managerFilter, setManagerFilter] = useState<string>('Tất cả')
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [productLineFilter, setProductLineFilter] = useState<string>('Tất cả')
  const [expandedProductLines, setExpandedProductLines] = useState<Record<string, boolean>>({})

  const toggleExpand = useCallback((pl: string) => {
    setExpandedProductLines(prev => ({
      ...prev,
      [pl]: !prev[pl]
    }))
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [pourRes, sepRes] = await Promise.all([
      supabase.from('foaming_pour_reports').select('*')
        .gte('report_date', startDate).lte('report_date', endDate),
      supabase.from('foaming_separate_reports')
        .select('*, production_plan(ten_san_pham)')
        .gte('report_date', startDate).lte('report_date', endDate),
    ])
    setPourReports((pourRes.data as any) || [])
    setSeparateReports((sepRes.data as any) || [])
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => { fetchData() }, [fetchData])

  // Build date list between startDate and endDate
  const dateList = useMemo(() => {
    const list: string[] = []
    const cur = new Date(startDate + 'T00:00:00')
    const last = new Date(endDate + 'T00:00:00')
    while (cur <= last) {
      const d = cur.getDate(), m = cur.getMonth() + 1, y = cur.getFullYear()
      list.push(`${d}/${m}/${y}`)
      cur.setDate(cur.getDate() + 1)
    }
    return list
  }, [startDate, endDate])

  const tawnyShifts = useMemo(() => {
    const set = new Set<string>()
    separateReports.forEach(r => {
      const name = r.production_plan?.ten_san_pham
      if (name && name.toUpperCase().includes('TAWNY PORT')) {
        let d = r.report_date ? r.report_date.split('-').reverse().join('/') : formatReportDate(r.created_at, r.shift)
        const [day, m, y] = d.split('/')
        const normD = `${parseInt(day)}/${parseInt(m)}/${y}`
        const s = r.shift || 'Ca 1'
        set.add(`${normD}_${s}`)
      }
    })
    return set
  }, [separateReports])

  const aggregatedData = useMemo(() => {
    const dailyMap = new Map<string, AggregatedDay>()
    dateList.forEach(dateStr => {
      dailyMap.set(dateStr, { 
        date: dateStr, 
        poured: 0, 
        separated: 0, 
        separatedSheets: 0,
        pouredByShift: {}, 
        separatedByShift: {},
        separatedByShiftSheets: {},
        pouredByManager: {},
        separatedByManager: {}
      })
    })

    const norm = (dStr: string) => {
      const [d, m, y] = dStr.split('/')
      return `${parseInt(d)}/${parseInt(m)}/${y}`
    }

    if (areaFilter !== 'separate') {
      pourReports.forEach(r => {
        if (shiftFilter !== 'Tất cả' && r.shift !== shiftFilter) return
        const m = r.manager_name || 'Khác'
        if (managerFilter !== 'Tất cả' && m !== managerFilter) return
        let d = r.report_date ? r.report_date.split('-').reverse().join('/') : formatReportDate(r.created_at, r.shift)
        d = norm(d)
        const day = dailyMap.get(d)
        if (day) {
          day.poured += (r.actual_bun_poured || 0)
          const s = r.shift || 'Ca 1'
          day.pouredByShift[s] = (day.pouredByShift[s] || 0) + (r.actual_bun_poured || 0)
          
          if (!day.pouredByManager[m]) day.pouredByManager[m] = { actual: 0, shifts: new Set() }
          day.pouredByManager[m].actual += (r.actual_bun_poured || 0)
          day.pouredByManager[m].shifts.add(s)
        }
      })
    }

    if (areaFilter !== 'pour') {
      separateReports.forEach(r => {
        // Tính TẤT CẢ loại sản phẩm (TP + BTP) để khớp với báo cáo
        if (shiftFilter !== 'Tất cả' && r.shift !== shiftFilter) return
        const m = r.manager_name || 'Khác'
        if (managerFilter !== 'Tất cả' && m !== managerFilter) return
        let d = r.report_date ? r.report_date.split('-').reverse().join('/') : formatReportDate(r.created_at, r.shift)
        d = norm(d)
        const day = dailyMap.get(d)
        if (day) {
          day.separated += (r.actual_bun_separated || 0)
          day.separatedSheets += (r.actual_sheet_received || 0)
          const s = r.shift || 'Ca 1'
          day.separatedByShift[s] = (day.separatedByShift[s] || 0) + (r.actual_bun_separated || 0)
          day.separatedByShiftSheets[s] = (day.separatedByShiftSheets[s] || 0) + (r.actual_sheet_received || 0)
          
          if (!day.separatedByManager[m]) day.separatedByManager[m] = { actual: 0, actualSheets: 0, shifts: new Set() }
          day.separatedByManager[m].actual += (r.actual_bun_separated || 0)
          day.separatedByManager[m].actualSheets += (r.actual_sheet_received || 0)
          day.separatedByManager[m].shifts.add(s)
        }
      })
    }

    return Array.from(dailyMap.values())
  }, [pourReports, separateReports, dateList, shiftFilter, managerFilter, areaFilter])

  const totals = useMemo(() => aggregatedData.reduce(
    (acc, d) => ({ 
      poured: acc.poured + d.poured, 
      separated: acc.separated + d.separated,
      separatedSheets: acc.separatedSheets + d.separatedSheets
    }),
    { poured: 0, separated: 0, separatedSheets: 0 }
  ), [aggregatedData])


  const activeFiltersCount = [
    shiftFilter !== 'Tất cả',
    managerFilter !== 'Tất cả',
    areaFilter !== 'all',
    productLineFilter !== 'Tất cả',
    startDate !== last7DaysStr() || endDate !== todayStr()
  ].filter(Boolean).length

  const resetFilters = () => {
    setShiftFilter('Tất cả')
    setManagerFilter('Tất cả')
    setAreaFilter('all')
    setProductLineFilter('Tất cả')
    setStartDate(last7DaysStr())
    setEndDate(todayStr())
  }

  const visibleData = aggregatedData.filter(d => d.poured > 0 || d.separated > 0)
  const maxVal = Math.max(...aggregatedData.map(d => Math.max(d.poured, d.separated))) || 100

  // Build bun thickness chart data — tính độ dày bun trung bình theo ngày
  // Công thức: Σ(actual_sheet_received × sheet_thickness_mm) / Σ(actual_bun_separated)
  const bunThicknessData = useMemo(() => {
    // Gom nhóm theo ngày
    const dayMap = new Map<string, { totalSheetThickSum: number; totalBunSep: number; targetSum: number; targetCount: number; orderCount: number }>()

    separateReports
      .filter(r => {
        if (shiftFilter !== 'Tất cả' && r.shift !== shiftFilter) return false
        if (managerFilter !== 'Tất cả' && (r.manager_name || 'Khác') !== managerFilter) return false
        const pl = cleanProductName((r as any).production_plan?.ten_san_pham)
        if (productLineFilter !== 'Tất cả' && pl !== productLineFilter) return false
        return (r.actual_bun_separated || 0) > 0 && (r.sheet_thickness_mm || 0) > 0
      })
      .forEach(r => {
        const reportDate = r.report_date
          ? r.report_date.split('-').reverse().slice(0, 2).join('/')
          : formatReportDate(r.created_at, r.shift).split('/').slice(0, 2).join('/')
        const sheetThickSum = (r.actual_sheet_received || 0) * (r.sheet_thickness_mm || 0)
        const bunSep = r.actual_bun_separated || 0
        const target = r.bun_thickness_mm || 0

        if (!dayMap.has(reportDate)) {
          dayMap.set(reportDate, { totalSheetThickSum: 0, totalBunSep: 0, targetSum: 0, targetCount: 0, orderCount: 0 })
        }
        const entry = dayMap.get(reportDate)!
        entry.totalSheetThickSum += sheetThickSum
        entry.totalBunSep += bunSep
        if (target > 0) { entry.targetSum += target; entry.targetCount++ }
        entry.orderCount++
      })

    return Array.from(dayMap.entries())
      .map(([date, v]) => ({
        date,
        // Độ dày bun trung bình = Tổng độ dày sheet thực tế / Tổng SL Tách (Bun)
        bunThickness: v.totalBunSep > 0 ? Math.round((v.totalSheetThickSum / v.totalBunSep) * 10) / 10 : 0,
        targetThickness: v.targetCount > 0 ? Math.round((v.targetSum / v.targetCount) * 10) / 10 : 0,
        orderCount: v.orderCount,
        totalBunSep: v.totalBunSep,
        totalSheetThickSum: v.totalSheetThickSum,
      }))
      .filter(d => d.bunThickness > 0)
      .sort((a, b) => {
        // Sắp xếp theo ngày tăng dần
        const [da, ma] = a.date.split('/').map(Number)
        const [db, mb] = b.date.split('/').map(Number)
        return mb !== ma ? ma - mb : da - db
      })
  }, [separateReports, shiftFilter, managerFilter, productLineFilter])

  // Tổng độ dày bun trung bình tất cả (gộp toàn bộ khoảng thời gian)
  const overallAvgBunThickness = useMemo(() => {
    let totalSheetThickSum = 0
    let totalBunSep = 0
    separateReports
      .filter(r => {
        if (shiftFilter !== 'Tất cả' && r.shift !== shiftFilter) return false
        if (managerFilter !== 'Tất cả' && (r.manager_name || 'Khác') !== managerFilter) return false
        const pl = cleanProductName((r as any).production_plan?.ten_san_pham)
        if (productLineFilter !== 'Tất cả' && pl !== productLineFilter) return false
        return (r.actual_bun_separated || 0) > 0 && (r.sheet_thickness_mm || 0) > 0
      })
      .forEach(r => {
        totalSheetThickSum += (r.actual_sheet_received || 0) * (r.sheet_thickness_mm || 0)
        totalBunSep += (r.actual_bun_separated || 0)
      })
    return { value: totalBunSep > 0 ? Math.round((totalSheetThickSum / totalBunSep) * 10) / 10 : 0, totalBunSep, totalSheetThickSum }
  }, [separateReports, shiftFilter, managerFilter, productLineFilter])

  // Phân tích dòng sản phẩm có độ dày bun thực tế < 136mm
  const LOW_BUN_THRESHOLD = 136
  const lowBunByProductLine = useMemo(() => {
    // Gom nhóm theo product line, dùng TẤT CẢ đơn (không lọc productLineFilter để thấy toàn bộ)
    const plMap = new Map<string, {
      totalSheetThickSum: number
      totalBunSep: number
      targetSum: number
      targetCount: number
      orderCount: number
      dates: Set<string>
      firmPlans: string[]
      details: Array<{
        id: string
        report_date: string
        shift: string
        firm_plan: string
        actual_bun_separated: number
        actual_sheet_received: number
        sheet_thickness_mm: number
        bun_thickness_mm: number
        expected_sheets: number
        deficit: number
        ng_qty: number
        error_type: string
        note: string
        operator_name: string
        reason: string
      }>
    }>()

    separateReports
      .filter(r => {
        if (shiftFilter !== 'Tất cả' && r.shift !== shiftFilter) return false
        if (managerFilter !== 'Tất cả' && (r.manager_name || 'Khác') !== managerFilter) return false
        return (r.actual_bun_separated || 0) > 0 && (r.sheet_thickness_mm || 0) > 0
      })
      .forEach(r => {
        const pl = cleanProductName((r as any).production_plan?.ten_san_pham) || 'Không rõ'
        const sheetThickSum = (r.actual_sheet_received || 0) * (r.sheet_thickness_mm || 0)
        const bunSep = r.actual_bun_separated || 0
        const target = r.bun_thickness_mm || 0
        const reportDate = r.report_date
          ? r.report_date.split('-').reverse().slice(0, 2).join('/')
          : formatReportDate(r.created_at, r.shift).split('/').slice(0, 2).join('/')

        const expectedSheets = target && r.sheet_thickness_mm ? Math.round((target / r.sheet_thickness_mm) * bunSep) : 0
        const deficit = expectedSheets > 0 ? expectedSheets - (r.actual_sheet_received || 0) : 0
        const ngQty = r.ng_qty || 0

        let reason = 'Bình thường'
        if (deficit > 5) {
          if (ngQty > 0 && (ngQty >= 0.3 * deficit || ngQty > 5)) {
            reason = 'Lỗi chất lượng (NG)'
          } else {
            reason = 'Lỗi nhập liệu / Thiếu báo cáo'
          }
        }

        if (!plMap.has(pl)) {
          plMap.set(pl, {
            totalSheetThickSum: 0,
            totalBunSep: 0,
            targetSum: 0,
            targetCount: 0,
            orderCount: 0,
            dates: new Set(),
            firmPlans: [],
            details: []
          })
        }
        const entry = plMap.get(pl)!
        entry.totalSheetThickSum += sheetThickSum
        entry.totalBunSep += bunSep
        if (target > 0) { entry.targetSum += target; entry.targetCount++ }
        entry.orderCount++
        entry.dates.add(reportDate)
        if (r.firm_plan && !entry.firmPlans.includes(r.firm_plan)) entry.firmPlans.push(r.firm_plan)
        
        entry.details.push({
          id: r.id,
          report_date: r.report_date ? r.report_date.split('-').reverse().slice(0, 2).join('/') : formatReportDate(r.created_at, r.shift).split('/').slice(0, 2).join('/'),
          shift: r.shift || '',
          firm_plan: r.firm_plan || '',
          actual_bun_separated: bunSep,
          actual_sheet_received: r.actual_sheet_received || 0,
          sheet_thickness_mm: r.sheet_thickness_mm || 0,
          bun_thickness_mm: target,
          expected_sheets: expectedSheets,
          deficit: deficit,
          ng_qty: ngQty,
          error_type: r.error_type || '',
          note: r.note || '',
          operator_name: r.operator_name || '',
          reason: reason
        })
      })

    return Array.from(plMap.entries())
      .map(([productLine, v]) => ({
        productLine,
        bunThickness: v.totalBunSep > 0 ? Math.round((v.totalSheetThickSum / v.totalBunSep) * 10) / 10 : 0,
        targetThickness: v.targetCount > 0 ? Math.round((v.targetSum / v.targetCount) * 10) / 10 : 0,
        orderCount: v.orderCount,
        totalBunSep: v.totalBunSep,
        totalSheetThickSum: v.totalSheetThickSum,
        dateCount: v.dates.size,
        firmPlans: v.firmPlans.slice(0, 5),
        details: v.details.sort((a, b) => b.deficit - a.deficit) // Lệch nhiều nhất lên đầu
      }))
      .filter(d => d.bunThickness > 0 && d.bunThickness < LOW_BUN_THRESHOLD)
      .sort((a, b) => a.bunThickness - b.bunThickness) // thấp nhất lên đầu
  }, [separateReports, shiftFilter, managerFilter])

  // Collect unique product lines from separate reports
  const productLineOptions = useMemo(() => {
    const set = new Set<string>()
    separateReports.forEach(r => {
      const pl = cleanProductName((r as any).production_plan?.ten_san_pham)
      if (pl && pl !== '---') set.add(pl)
    })
    return ['Tất cả', ...Array.from(set).sort()]
  }, [separateReports])

  return (
    <div className="space-y-5 pb-20">

      {/* ── Filter Panel ───────────────────────────── */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500">
              <Filter size={16} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-tight">Bộ lọc báo cáo</h3>
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-brand-500 text-white text-[10px] font-bold">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button onClick={resetFilters}
                className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all">
                <X size={12} /> Xóa lọc
              </button>
            )}
            <button onClick={() => setShowFilters(!showFilters)}
              className="text-xs font-bold text-brand-500 hover:underline">
              {showFilters ? 'Thu gọn ▲' : 'Mở rộng ▼'}
            </button>
          </div>
        </div>

        {/* Date range — always visible */}
        <div className="bg-orange-500/5 p-3 rounded-xl border border-orange-500/10">
          <p className="text-[10px] font-bold text-orange-600 uppercase mb-2 flex items-center gap-1">
            <Calendar size={11} /> Khoảng thời gian
          </p>
          <div className="flex items-center gap-2">
            <input type="date" value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text-1)] outline-none focus:border-orange-500 transition-all font-mono" />
            <ArrowRight size={16} className="text-orange-300 shrink-0" />
            <input type="date" value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text-1)] outline-none focus:border-orange-500 transition-all font-mono" />
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Shift filter */}
            <div>
              <p className="text-[10px] font-bold text-[var(--text-3)] uppercase mb-2 ml-1">Ca làm việc</p>
              <div className="flex flex-wrap gap-1.5">
                {['Tất cả', ...SHIFTS].map(s => (
                  <button key={s} onClick={() => setShiftFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      shiftFilter === s
                        ? 'bg-brand-500 text-white shadow-md'
                        : 'bg-[var(--bg-2,#f3f4f6)] dark:bg-white/10 text-[var(--text-2)] hover:bg-brand-500/10'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Area filter */}
            <div>
              <p className="text-[10px] font-bold text-[var(--text-3)] uppercase mb-2 ml-1">Khu vực / Công đoạn</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: '🏭 Tất cả' },
                  { id: 'pour', label: '💧 Khu vực Đổ' },
                  { id: 'separate', label: '✂️ Khu vực Tách' },
                ].map(a => (
                  <button key={a.id} onClick={() => setAreaFilter(a.id as AreaFilter)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      areaFilter === a.id
                        ? 'bg-brand-500 text-white shadow-md'
                        : 'bg-[var(--bg-2,#f3f4f6)] dark:bg-white/10 text-[var(--text-2)] hover:bg-brand-500/10'
                    }`}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Manager filter */}
            <div>
              <p className="text-[10px] font-bold text-[var(--text-3)] uppercase mb-2 ml-1">Quản lý</p>
              <div className="flex flex-wrap gap-1.5">
                {['Tất cả', ...MANAGERS].map(m => (
                  <button key={m} onClick={() => setManagerFilter(m)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      managerFilter === m
                        ? 'bg-brand-500 text-white shadow-md'
                        : 'bg-[var(--bg-2,#f3f4f6)] dark:bg-white/10 text-[var(--text-2)] hover:bg-brand-500/10'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Product line filter */}
            <div className="sm:col-span-2">
              <p className="text-[10px] font-bold text-[var(--text-3)] uppercase mb-2 ml-1 flex items-center gap-1">
                <Layers size={11} /> Dòng sản phẩm (biểu đồ độ dày bun)
              </p>
              <select
                value={productLineFilter}
                onChange={e => setProductLineFilter(e.target.value)}
                className="w-full bg-[var(--bg-input,#f3f4f6)] dark:bg-white/10 border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-1)] outline-none focus:border-brand-500 transition-all"
              >
                {productLineOptions.map(pl => (
                  <option key={pl} value={pl}>{pl}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Quick date buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Hôm nay', fn: () => { setStartDate(todayStr()); setEndDate(todayStr()) } },
            { label: '7 ngày', fn: () => { const d = new Date(); d.setDate(d.getDate()-6); setStartDate(d.toISOString().split('T')[0]); setEndDate(todayStr()) } },
            { label: 'Tháng này', fn: () => { setStartDate(firstDayOfMonth()); setEndDate(todayStr()) } },
          ].map(q => (
            <button key={q.label} onClick={q.fn}
              className="px-3 py-1 text-[10px] font-bold rounded-full border border-[var(--border)] text-[var(--text-3)] hover:border-brand-500 hover:text-brand-500 transition-all">
              {q.label}
            </button>
          ))}
          <button onClick={fetchData}
            className="ml-auto px-4 py-1 text-[10px] font-bold rounded-full bg-brand-500 text-white hover:bg-brand-600 transition-all shadow-sm">
            ↻ Tải lại
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-3)] font-bold animate-pulse">Đang tổng hợp dữ liệu...</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {areaFilter !== 'separate' && (
              <div className="rounded-2xl p-5 relative overflow-hidden text-white shadow-xl"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 10px 30px rgba(37,99,235,0.35)' }}>
                <p className="text-[10px] font-black uppercase opacity-80 mb-1">Tổng Bun Đổ</p>
                <h4 className="text-4xl font-black">{totals.poured.toLocaleString()}</h4>
                <div className="mt-2 flex items-center gap-1.5 bg-white/20 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <Factory size={10} />
                  {shiftFilter === 'Tất cả' ? 'Tất cả ca' : shiftFilter}
                </div>
                <Activity size={80} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
              </div>
            )}
            {areaFilter !== 'pour' && (
              <div className="rounded-2xl p-5 relative overflow-hidden text-white shadow-xl"
                style={{ background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)', boxShadow: '0 10px 30px rgba(147,51,234,0.35)' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-80 mb-1">Tổng Bun Tách (TP+BTP)</p>
                    <h4 className="text-4xl font-black">{totals.separated.toLocaleString()} <span className="text-sm font-normal opacity-85">bun</span></h4>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase opacity-80 mb-1">Tổng Sheet Tách</p>
                    <h4 className="text-2xl font-black">{totals.separatedSheets.toLocaleString()} <span className="text-xs font-normal opacity-85">sheet</span></h4>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 bg-white/20 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <CheckCircle2 size={10} /> Tất cả loại sản phẩm
                </div>
                <Zap size={80} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
              </div>
            )}
          </div>

          {/* Performance Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                <Award size={18} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-tight">Hiệu suất theo Quản lý (%)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {MANAGERS.map(manager => {
                if (managerFilter !== 'Tất cả' && manager !== managerFilter) return null
                
                const managerData = aggregatedData.map(d => {
                  const perf = calcManagerPerf(d, manager, areaFilter, tawnyShifts)
                  return { date: d.date, perf: perf || 0 }
                }).filter(d => d.perf > 0)

                if (managerData.length === 0) return null

                const avgPerf = Math.round(managerData.reduce((s, x) => s + x.perf, 0) / managerData.length)

                return (
                  <div key={manager} className="card p-4 border-l-4" style={{ borderLeftColor: MANAGER_COLORS[manager] }}>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" 
                          style={{ backgroundColor: MANAGER_COLORS[manager] }}>
                          {manager[0]}
                        </div>
                        <span className="text-xs font-bold text-[var(--text-1)]">{manager}</span>
                      </div>
                      <span className={`text-lg font-black ${avgPerf >= 100 ? 'text-green-500' : 'text-orange-500'}`}>
                        {avgPerf}%
                      </span>
                    </div>
                    
                    {/* Mini Sparkline using CSS */}
                    <div className="flex items-end gap-0.5 h-12 bg-gray-50 dark:bg-black/10 rounded-lg p-1">
                      {managerData.slice(-15).map((d, i) => (
                        <div key={i} className="flex-1 rounded-t-sm transition-all hover:opacity-80"
                          style={{ 
                            height: `${Math.min(100, d.perf)}%`, 
                            backgroundColor: MANAGER_COLORS[manager],
                            opacity: 0.6 + (d.perf / 200)
                          }}
                          title={`${d.date}: ${Math.round(d.perf)}%`}
                        />
                      ))}
                    </div>
                    <p className="text-[9px] text-[var(--text-3)] mt-2 font-bold uppercase text-center">Xu hướng 15 ngày gần nhất</p>
                  </div>
                )
              })}
            </div>

            {/* Performance Trend Chart */}
            <div className="card p-5 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black uppercase text-[var(--text-2)] flex items-center gap-2">
                  <TrendingUp size={14} className="text-brand-500" />
                  Biểu đồ diễn biến hiệu suất theo ngày
                </h4>
              </div>
              <SvgPerformanceChart 
                data={aggregatedData} 
                dateList={dateList}
                managers={MANAGERS}
                managerFilter={managerFilter}
                areaFilter={areaFilter}
                startDate={startDate}
                endDate={endDate}
                shiftFilter={shiftFilter}
                tawnyShifts={tawnyShifts}
              />
            </div>
          </div>

          {/* Chart */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">Biểu đồ sản lượng</h3>
                  <p className="text-[10px] text-[var(--text-3)]">
                    {startDate} → {endDate}
                    {shiftFilter !== 'Tất cả' && ` · ${shiftFilter}`}
                    {managerFilter !== 'Tất cả' && ` · Quản lý: ${managerFilter}`}
                    {areaFilter !== 'all' && ` · ${areaFilter === 'pour' ? 'Khu vực Đổ' : 'Khu vực Tách'}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 text-[10px] font-black">
                {areaFilter !== 'separate' && (
                  <span className="text-blue-500">CỘT TRÁI: ĐỔ</span>
                )}
                {areaFilter !== 'separate' && areaFilter !== 'pour' && <span className="text-[var(--text-3)]">|</span>}
                {areaFilter !== 'pour' && (
                  <span className="text-purple-500">CỘT PHẢI: TÁCH</span>
                )}
              </div>
            </div>

            {visibleData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-3)]">
                <Activity size={40} className="opacity-20" />
                <p className="text-sm font-medium">Không có dữ liệu trong khoảng thời gian này</p>
              </div>
            ) : (
              <SvgBarChart
                data={visibleData}
                maxVal={maxVal}
                showPour={areaFilter !== 'separate'}
                showSep={areaFilter !== 'pour'}
              />
            )}
          </div>

          {/* Detail Table */}
          {visibleData.length > 0 && (
            <div className="card overflow-hidden border-none shadow-xl">
              <div className="p-4 bg-gradient-to-r from-gray-50 to-white dark:from-white/5 dark:to-transparent border-b border-[var(--border)] flex items-center gap-2">
                <Clock size={18} className="text-brand-500" />
                <h3 className="text-sm font-black uppercase tracking-tight">
                  Chi tiết sản lượng theo ngày & quản lý
                  {managerFilter !== 'Tất cả' && <span className="ml-2 text-brand-500">({managerFilter})</span>}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase text-[var(--text-3)] border-b border-[var(--border)]">
                      <th className="p-3 w-24">Ngày</th>
                      {(managerFilter === 'Tất cả' ? [...MANAGERS, 'Khác'] : [managerFilter]).map(m => (
                        <th key={m} className="p-3 text-center border-l border-[var(--border)] min-w-[110px]">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" 
                              style={{ backgroundColor: MANAGER_COLORS[m] || '#94a3b8' }}>
                              {m[0]}
                            </div>
                            <span>{m}</span>
                          </div>
                        </th>
                      ))}
                      <th className="p-3 text-center border-l border-[var(--border)] bg-gray-100 dark:bg-white/5 w-28">TỔNG NGÀY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {visibleData.slice().reverse().map(day => {
                      const cols = managerFilter === 'Tất cả' ? [...MANAGERS, 'Khác'] : [managerFilter]
                      return (
                        <tr key={day.date} className="text-xs hover:bg-brand-500/5 transition-colors">
                          <td className="p-3 font-black text-[var(--text-1)] bg-gray-50/50 dark:bg-white/5 whitespace-nowrap">
                            {day.date}
                          </td>
                          {cols.map(m => {
                            const pouredVal = m === 'Khác'
                              ? Object.keys(day.pouredByManager).filter(k => !MANAGERS.includes(k)).reduce((sum, k) => sum + day.pouredByManager[k].actual, 0)
                              : day.pouredByManager[m]?.actual || 0
                            const sepVal = m === 'Khác'
                              ? Object.keys(day.separatedByManager).filter(k => !MANAGERS.includes(k)).reduce((sum, k) => sum + day.separatedByManager[k].actual, 0)
                              : day.separatedByManager[m]?.actual || 0
                            const sepSheetsVal = m === 'Khác'
                              ? Object.keys(day.separatedByManager).filter(k => !MANAGERS.includes(k)).reduce((sum, k) => sum + day.separatedByManager[k].actualSheets, 0)
                              : day.separatedByManager[m]?.actualSheets || 0

                            const hasData = pouredVal > 0 || sepVal > 0 || sepSheetsVal > 0

                            return (
                              <td key={m} className="p-3 text-center border-l border-[var(--border)]">
                                {hasData ? (
                                  <div className="flex flex-col gap-1.5">
                                    {areaFilter !== 'separate' && pouredVal > 0 && (
                                      <div className="flex items-center justify-center gap-1.5">
                                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-500/10 text-blue-600">Đổ</span>
                                        <span className="font-mono font-bold">{pouredVal.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {areaFilter !== 'pour' && (sepVal > 0 || sepSheetsVal > 0) && (
                                      <div className="flex items-center justify-center gap-1.5">
                                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-purple-500/10 text-purple-600">Tách</span>
                                        <span className="font-mono font-bold">
                                          {sepVal.toLocaleString()} <span className="text-[10px] font-normal opacity-70">B</span> / {sepSheetsVal.toLocaleString()} <span className="text-[10px] font-normal opacity-70">S</span>
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-300 dark:text-gray-600">-</span>
                                )}
                              </td>
                            )
                          })}
                          <td className="p-3 text-center border-l border-[var(--border)] bg-gray-100/50 dark:bg-white/10">
                            <div className="flex flex-col gap-1">
                              {areaFilter !== 'separate' && (
                                <div>
                                  <span className="text-[8px] font-black uppercase text-blue-600 block">Tổng Đổ</span>
                                  <span className="text-base font-black text-blue-700">{day.poured.toLocaleString()}</span>
                                </div>
                              )}
                              {areaFilter !== 'pour' && (
                                <div>
                                  <span className="text-[8px] font-black uppercase text-purple-600 block">Tổng Tách</span>
                                  <span className="text-base font-black text-purple-700">
                                    {day.separated.toLocaleString()} <span className="text-xs font-normal opacity-70">B</span> / {day.separatedSheets.toLocaleString()} <span className="text-xs font-normal opacity-70">S</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Bun Thickness Chart */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-500">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">Độ dày bun trung bình theo ngày (mm)</h3>
                  <p className="text-[10px] text-[var(--text-3)]">
                    Σ Tổng độ dày sheet thực tế ÷ Σ SL Tách (Bun) · {bunThicknessData.length} ngày
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {productLineFilter !== 'Tất cả' && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-teal-500/10 text-teal-600 border border-teal-500/20">
                    {productLineFilter}
                  </span>
                )}
                {overallAvgBunThickness.value > 0 && (
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-[var(--text-3)] uppercase">TB toàn kỳ</span>
                    <span className="text-lg font-black text-teal-600">{overallAvgBunThickness.value} mm</span>
                  </div>
                )}
              </div>
            </div>

            {bunThicknessData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-[var(--text-3)]">
                <Layers size={36} className="opacity-20" />
                <p className="text-sm font-medium">Không có dữ liệu tách trong khoảng thời gian này</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <div style={{ minWidth: Math.max(400, bunThicknessData.length * 60) + 'px' }}>
                  {/* SVG bar chart — mỗi cột là 1 ngày, giá trị = độ dày bun trung bình của ngày đó */}
                  {(() => {
                    const maxT = Math.max(...bunThicknessData.map(d => Math.max(d.bunThickness, d.targetThickness)), 1)
                    const W = Math.max(600, bunThicknessData.length * 60)
                    const H = 260
                    const PAD_L = 48
                    const PAD_R = 12
                    const PAD_T = 28
                    const PAD_B = 54
                    const chartW = W - PAD_L - PAD_R
                    const chartH = H - PAD_T - PAD_B
                    const barZone = chartW / bunThicknessData.length
                    const barW = Math.max(12, Math.min(38, barZone * 0.6))
                    const gridMax = Math.ceil(maxT / 5) * 5 + 5
                    // Tính overall avg line position
                    const avgLineY = overallAvgBunThickness.value > 0
                      ? PAD_T + chartH - (overallAvgBunThickness.value / gridMax) * chartH
                      : null

                    return (
                      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="bunThickGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#14b8a6" stopOpacity="1" />
                            <stop offset="100%" stopColor="#0d9488" stopOpacity="0.7" />
                          </linearGradient>
                          <linearGradient id="targetThickGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7" />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.35" />
                          </linearGradient>
                        </defs>

                        {/* Y grid */}
                        {[0, 20, 40, 60, 80, 100].map(pct => {
                          const val = (gridMax * pct) / 100
                          const y = PAD_T + chartH - (pct / 100) * chartH
                          return (
                            <g key={pct}>
                              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                                stroke={pct === 0 ? '#cbd5e1' : '#e2e8f0'} strokeWidth={pct === 0 ? 1.5 : 0.8}
                                strokeDasharray={pct === 0 ? '0' : '3 4'} />
                              <text x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="600">
                                {val.toFixed(0)}
                              </text>
                            </g>
                          )
                        })}

                        {/* Đường trung bình toàn kỳ */}
                        {avgLineY !== null && (
                          <g>
                            <line x1={PAD_L} y1={avgLineY} x2={W - PAD_R} y2={avgLineY}
                              stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5 3" />
                            <text x={W - PAD_R - 2} y={avgLineY - 4} textAnchor="end"
                              fontSize="7.5" fill="#6366f1" fontWeight="800">
                              TB: {overallAvgBunThickness.value}mm
                            </text>
                          </g>
                        )}

                        {/* Bars — mỗi cột 1 ngày */}
                        {bunThicknessData.map((item, idx) => {
                          const cx = PAD_L + barZone * idx + barZone / 2
                          const bx = cx - barW / 2
                          const actualH = gridMax > 0 ? (item.bunThickness / gridMax) * chartH : 0
                          const targetH = gridMax > 0 && item.targetThickness > 0 ? (item.targetThickness / gridMax) * chartH : 0
                          const actualY = PAD_T + chartH - actualH
                          const targetY = PAD_T + chartH - targetH
                          const isAbove = item.targetThickness > 0 && item.bunThickness > item.targetThickness * 1.05
                          const isBelow = item.targetThickness > 0 && item.bunThickness < item.targetThickness * 0.95
                          const barColor = isAbove ? '#ef4444' : isBelow ? '#f59e0b' : '#14b8a6'

                          return (
                            <g key={item.date}>
                              {/* Target thickness ghost bar */}
                              {item.targetThickness > 0 && (
                                <rect x={bx - 2} y={targetY} width={barW + 4} height={Math.max(targetH, 1)}
                                  rx="2" fill="url(#targetThickGrad)" opacity="0.45" />
                              )}
                              {/* Actual bar */}
                              <rect x={bx} y={actualY} width={barW} height={Math.max(actualH, 2)}
                                rx="3" fill={barColor} opacity="0.88" />
                              {/* Value label trên đầu cột */}
                              <text x={cx} y={actualY - 5} textAnchor="middle" fontSize="8" fill={barColor} fontWeight="800">
                                {item.bunThickness}
                              </text>
                              {/* X label — ngày */}
                              <text
                                x={cx} y={PAD_T + chartH + 14}
                                textAnchor="end"
                                fontSize="8" fill="#64748b" fontWeight="700"
                                transform={`rotate(-40, ${cx}, ${PAD_T + chartH + 14})`}
                              >
                                {item.date}
                              </text>
                            </g>
                          )
                        })}

                        {/* Y axis */}
                        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + chartH} stroke="#cbd5e1" strokeWidth="1.5" />
                        {/* Y label */}
                        <text x={10} y={PAD_T + chartH / 2} textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="700"
                          transform={`rotate(-90, 10, ${PAD_T + chartH / 2})`}>
                          mm
                        </text>
                      </svg>
                    )
                  })()}

                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-3 justify-center flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-3 rounded" style={{ backgroundColor: '#14b8a6' }} />
                      <span className="text-[10px] font-bold text-teal-700">Độ dày bun TB (ngày)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-3 rounded opacity-50" style={{ backgroundColor: '#f59e0b' }} />
                      <span className="text-[10px] font-bold text-amber-700">Dày bun tiêu chuẩn (TB nền)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 2" /></svg>
                      <span className="text-[10px] font-bold text-indigo-600">TB toàn kỳ</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
                      <span className="text-[10px] font-bold text-red-600">&gt;5% trên chuẩn</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }} />
                      <span className="text-[10px] font-bold text-amber-600">&gt;5% dưới chuẩn</span>
                    </div>
                  </div>

                  {/* Summary table theo ngày */}
                  {bunThicknessData.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-teal-500/5 text-[10px] font-black uppercase text-teal-700 border-b border-teal-200/30">
                            <th className="p-2">Ngày</th>
                            <th className="p-2 text-center">Số đơn</th>
                            <th className="p-2 text-center">Tổng SL Tách (Bun)</th>
                            <th className="p-2 text-center">Σ Dày Sheet (mm)</th>
                            <th className="p-2 text-center">Chuẩn TB (mm)</th>
                            <th className="p-2 text-center">Thực tế TB (mm)</th>
                            <th className="p-2 text-center">Lệch</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {bunThicknessData.map(item => {
                            const diff = item.targetThickness > 0 ? item.bunThickness - item.targetThickness : null
                            const pct = diff !== null && item.targetThickness > 0 ? (diff / item.targetThickness) * 100 : null
                            const isOver = pct !== null && pct > 5
                            const isUnder = pct !== null && pct < -5
                            return (
                              <tr key={item.date} className="hover:bg-teal-500/5 transition-colors">
                                <td className="p-2 font-bold text-[var(--text-1)] whitespace-nowrap">{item.date}</td>
                                <td className="p-2 text-center text-[var(--text-3)]">{item.orderCount} đơn</td>
                                <td className="p-2 text-center font-mono text-[var(--text-2)]">{item.totalBunSep.toLocaleString()}</td>
                                <td className="p-2 text-center font-mono text-[var(--text-2)]">{item.totalSheetThickSum.toLocaleString()}</td>
                                <td className="p-2 text-center text-[var(--text-3)] font-mono">{item.targetThickness > 0 ? item.targetThickness : '—'}</td>
                                <td className="p-2 text-center font-mono font-black" style={{ color: isOver ? '#ef4444' : isUnder ? '#f59e0b' : '#14b8a6' }}>
                                  {item.bunThickness}
                                </td>
                                <td className="p-2 text-center">
                                  {pct !== null ? (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                      isOver ? 'bg-red-100 text-red-600' :
                                      isUnder ? 'bg-amber-100 text-amber-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>
                                      {diff! > 0 ? '+' : ''}{diff!.toFixed(1)} ({pct.toFixed(1)}%)
                                    </span>
                                  ) : '—'}
                                </td>
                              </tr>
                            )
                          })}
                          {/* Dòng tổng */}
                          <tr className="bg-teal-500/10 font-black border-t-2 border-teal-300/40">
                            <td className="p-2 text-teal-700 font-black">Tổng / TB toàn kỳ</td>
                            <td className="p-2 text-center text-teal-700">{bunThicknessData.reduce((s,d)=>s+d.orderCount,0)} đơn</td>
                            <td className="p-2 text-center font-mono text-teal-700">{overallAvgBunThickness.totalBunSep.toLocaleString()}</td>
                            <td className="p-2 text-center font-mono text-teal-700">{overallAvgBunThickness.totalSheetThickSum.toLocaleString()}</td>
                            <td className="p-2 text-center text-teal-700">—</td>
                            <td className="p-2 text-center font-mono font-black text-teal-700 text-sm">{overallAvgBunThickness.value} mm</td>
                            <td className="p-2 text-center text-teal-700">—</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Phân tích dòng SP có độ dày bun < 136mm ── */}
          {lowBunByProductLine.length > 0 && (
            <div className="card p-5 border-2 border-red-300/50" style={{ background: 'linear-gradient(135deg, #fff1f2 0%, #fff7ed 100%)' }}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                  <span className="text-xl">⚠️</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-black uppercase tracking-tight text-red-700">
                    Dòng sản phẩm có độ dày bun &lt; {LOW_BUN_THRESHOLD}mm — cần chú ý
                  </h3>
                  <p className="text-[10px] text-red-500 mt-0.5">
                    {lowBunByProductLine.length} dòng SP · Sắp xếp từ thấp nhất · Áp dụng filter ca & quản lý hiện tại
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[9px] font-bold text-red-400 uppercase">Ngưỡng cảnh báo</span>
                  <p className="text-2xl font-black text-red-600">&lt; {LOW_BUN_THRESHOLD}<span className="text-sm font-normal"> mm</span></p>
                </div>
              </div>

              {/* Horizontal bar chart */}
              <div className="space-y-2 mb-5">
                {lowBunByProductLine.map((item, idx) => {
                  const pct = Math.min(100, (item.bunThickness / LOW_BUN_THRESHOLD) * 100)
                  const gap = LOW_BUN_THRESHOLD - item.bunThickness
                  const severity = gap >= 20 ? 'critical' : gap >= 10 ? 'warning' : 'mild'
                  const barColor = severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f97316' : '#eab308'
                  const bgColor = severity === 'critical' ? 'bg-red-50' : severity === 'warning' ? 'bg-orange-50' : 'bg-yellow-50'
                  const badgeColor = severity === 'critical' ? 'bg-red-100 text-red-700' : severity === 'warning' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                  return (
                    <div key={item.productLine} className={`rounded-xl p-3 ${bgColor} border border-white/80`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-black text-gray-500 w-5 text-right shrink-0">#{idx + 1}</span>
                        <span className="flex-1 text-xs font-black text-gray-800 truncate" title={item.productLine}>
                          {item.productLine}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${badgeColor}`}>
                          {item.bunThickness} mm
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 shrink-0">/ {LOW_BUN_THRESHOLD}mm</span>
                      </div>
                      {/* Progress bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 w-5 shrink-0"></span>
                        <div className="flex-1 h-2 rounded-full bg-gray-200/70 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                          />
                        </div>
                        <span className={`text-[10px] font-black shrink-0`} style={{ color: barColor }}>
                          -{gap.toFixed(1)}mm
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 ml-7 flex-wrap">
                        <span className="text-[9px] text-gray-400">
                          📦 {item.orderCount} đơn · {item.dateCount} ngày
                        </span>
                        {item.targetThickness > 0 && (
                          <span className="text-[9px] text-gray-400">
                            🎯 Chuẩn: {item.targetThickness}mm
                          </span>
                        )}
                        <span className="text-[9px] text-gray-400">
                          🔢 Tổng bun: {item.totalBunSep.toLocaleString()}
                        </span>
                        <button
                          onClick={() => toggleExpand(item.productLine)}
                          className="ml-auto flex items-center gap-1 text-[9px] font-bold text-red-700 hover:text-red-950 transition-colors bg-white/80 hover:bg-white px-2 py-0.5 rounded-lg border border-red-200 shadow-sm"
                          type="button"
                        >
                          {expandedProductLines[item.productLine] ? (
                            <>Ẩn chi tiết <ChevronUp size={10} /></>
                          ) : (
                            <>Xem chi tiết lỗi <ChevronDown size={10} /></>
                          )}
                        </button>
                      </div>

                      {expandedProductLines[item.productLine] && (
                        <div className="mt-3 ml-7 bg-white/70 dark:bg-black/30 rounded-xl p-2.5 border border-red-200/30 space-y-2 text-[10px]">
                          <p className="font-black text-red-800 uppercase tracking-widest text-[8px] mb-1 border-b border-red-200 pb-1 flex justify-between">
                            <span>Chi tiết chẩn đoán từng đơn hàng</span>
                            <span className="text-red-600 font-bold">Lưu ý: chỉ hiển thị đơn lệch &gt; 5 tấm</span>
                          </p>
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {item.details.map((detail) => {
                              const hasError = detail.deficit > 5;
                              if (!hasError) return null;
                              const isQualityErr = detail.reason === 'Lỗi chất lượng (NG)';

                              return (
                                <div key={detail.id} className="p-2 rounded-lg bg-white/95 dark:bg-black/40 border border-red-100 flex flex-col gap-1 shadow-sm text-left">
                                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                                    <span className="font-black text-gray-700 font-mono">{detail.report_date} · {detail.shift}</span>
                                    <span className="text-gray-400 font-medium">Plan: <span className="font-mono font-bold text-gray-600">{detail.firm_plan}</span></span>
                                    {isQualityErr ? (
                                      <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-black text-[8px] uppercase">🔴 Lỗi chất lượng NG</span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-black text-[8px] uppercase">⚠️ Nghi ngờ lỗi nhập liệu</span>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-gray-600 py-1 my-0.5 border-t border-b border-dashed border-gray-100">
                                    <div>Tách: <span className="font-bold text-gray-800 font-mono">{detail.actual_bun_separated} bun</span></div>
                                    <div>Nhận: <span className="font-bold text-gray-800 font-mono">{detail.actual_sheet_received} sheet</span></div>
                                    <div>Chuẩn/tấm: <span className="font-bold text-gray-800 font-mono">{detail.sheet_thickness_mm}mm</span></div>
                                    <div className="text-right text-red-500 font-bold">Thiếu: <span className="font-mono">-{Math.round(detail.deficit)} tấm</span></div>
                                  </div>

                                  <div className="flex justify-between items-center flex-wrap gap-1.5 text-[9px] mt-0.5">
                                    <div className="flex-1 min-w-[200px]">
                                      {isQualityErr ? (
                                        <span className="text-red-700 font-black bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded border border-red-200/50">
                                          Lỗi NG: {detail.error_type} ({detail.ng_qty} tấm)
                                        </span>
                                      ) : (
                                        <span className="text-orange-700 font-bold bg-orange-50 dark:bg-orange-950/20 px-1.5 py-0.5 rounded border border-orange-200/50">
                                          Khai báo NG: {detail.ng_qty} tấm (Chưa báo cáo hoặc báo cáo thiếu tấm NG)
                                        </span>
                                      )}
                                      {detail.note && <span className="text-gray-500 ml-1.5 italic font-medium">(Ghi chú: {detail.note})</span>}
                                    </div>
                                    <div className="text-gray-400 font-bold uppercase text-[8px] shrink-0">Operator: <span className="text-gray-700 font-black">{detail.operator_name || 'Không rõ'}</span></div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Summary table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-red-500/8 text-[10px] font-black uppercase text-red-700 border-b border-red-200/50">
                      <th className="p-2">#</th>
                      <th className="p-2">Dòng sản phẩm</th>
                      <th className="p-2 text-center">Số đơn</th>
                      <th className="p-2 text-center">Tổng Bun Tách</th>
                      <th className="p-2 text-center">Chuẩn TB (mm)</th>
                      <th className="p-2 text-center">Thực tế TB (mm)</th>
                      <th className="p-2 text-center">Thiếu (mm)</th>
                      <th className="p-2 text-center">Mức độ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {lowBunByProductLine.map((item, idx) => {
                      const gap = LOW_BUN_THRESHOLD - item.bunThickness
                      const severity = gap >= 20 ? 'critical' : gap >= 10 ? 'warning' : 'mild'
                      return (
                        <React.Fragment key={item.productLine}>
                          <tr
                            onClick={() => toggleExpand(item.productLine)}
                            className="hover:bg-red-500/5 transition-colors cursor-pointer select-none border-b border-red-100"
                          >
                            <td className="p-2 font-black text-gray-400">#{idx + 1}</td>
                            <td className="p-2 font-bold text-gray-800 max-w-[200px]">
                              <div className="flex items-center gap-1.5">
                                {expandedProductLines[item.productLine] ? (
                                  <ChevronUp size={12} className="text-red-500 shrink-0" />
                                ) : (
                                  <ChevronDown size={12} className="text-gray-400 shrink-0" />
                                )}
                                <span className="truncate block" title={item.productLine}>{item.productLine}</span>
                              </div>
                            </td>
                            <td className="p-2 text-center text-gray-500">{item.orderCount}</td>
                            <td className="p-2 text-center font-mono text-gray-600">{item.totalBunSep.toLocaleString()}</td>
                            <td className="p-2 text-center font-mono text-gray-500">{item.targetThickness > 0 ? item.targetThickness : '—'}</td>
                            <td className="p-2 text-center font-mono font-black" style={{
                              color: severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f97316' : '#eab308'
                            }}>
                              {item.bunThickness}
                            </td>
                            <td className="p-2 text-center font-mono font-black text-red-600">-{gap.toFixed(1)}</td>
                            <td className="p-2 text-center">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                severity === 'critical' ? 'bg-red-100 text-red-700' :
                                severity === 'warning' ? 'bg-orange-100 text-orange-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {severity === 'critical' ? '🔴 Nghiêm trọng' : severity === 'warning' ? '🟠 Cảnh báo' : '🟡 Nhẹ'}
                              </span>
                            </td>
                          </tr>
                          
                          {expandedProductLines[item.productLine] && (
                            <tr className="bg-red-500/[0.01]">
                              <td colSpan={8} className="p-3">
                                <div className="bg-white/90 dark:bg-black/40 rounded-xl p-3 border border-red-100 space-y-2 text-[10px]">
                                  <p className="font-black text-red-800 uppercase tracking-widest text-[8px] mb-1.5 border-b border-red-150 pb-1.5 flex justify-between">
                                    <span>Chi tiết chẩn đoán từng đơn hàng của dòng: {item.productLine}</span>
                                    <span className="text-red-600 font-bold">Chỉ hiển thị đơn lệch &gt; 5 tấm</span>
                                  </p>
                                  <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {item.details.map((detail) => {
                                      const hasError = detail.deficit > 5;
                                      if (!hasError) return null;
                                      const isQualityErr = detail.reason === 'Lỗi chất lượng (NG)';

                                      return (
                                        <div key={detail.id} className="p-2 rounded-lg bg-white dark:bg-black/60 border border-red-100/60 flex flex-col gap-1 shadow-sm text-left">
                                          <div className="flex items-center justify-between flex-wrap gap-1.5">
                                            <span className="font-black text-gray-700 font-mono">{detail.report_date} · {detail.shift}</span>
                                            <span className="text-gray-400 font-medium">Plan: <span className="font-mono font-bold text-gray-600">{detail.firm_plan}</span></span>
                                            {isQualityErr ? (
                                              <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-black text-[8px] uppercase">🔴 Lỗi chất lượng NG</span>
                                            ) : (
                                              <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-black text-[8px] uppercase">⚠️ Nghi ngờ lỗi nhập liệu</span>
                                            )}
                                          </div>

                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-gray-600 py-1 my-0.5 border-t border-b border-dashed border-gray-100">
                                            <div>Tách: <span className="font-bold text-gray-800 font-mono">{detail.actual_bun_separated} bun</span></div>
                                            <div>Nhận: <span className="font-bold text-gray-800 font-mono">{detail.actual_sheet_received} sheet</span></div>
                                            <div>Chuẩn/tấm: <span className="font-bold text-gray-800 font-mono">{detail.sheet_thickness_mm}mm</span></div>
                                            <div className="text-right text-red-500 font-bold">Thiếu: <span className="font-mono">-{Math.round(detail.deficit)} tấm</span></div>
                                          </div>

                                          <div className="flex justify-between items-center flex-wrap gap-1.5 text-[9px] mt-0.5">
                                            <div className="flex-1 min-w-[200px]">
                                              {isQualityErr ? (
                                                <span className="text-red-700 font-black bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded border border-red-200/50">
                                                  Lỗi NG: {detail.error_type} ({detail.ng_qty} tấm)
                                                </span>
                                              ) : (
                                                <span className="text-orange-700 font-bold bg-orange-50 dark:bg-orange-950/20 px-1.5 py-0.5 rounded border border-orange-200/50">
                                                  Khai báo NG: {detail.ng_qty} tấm (Chưa báo cáo hoặc báo cáo thiếu tấm NG)
                                                </span>
                                              )}
                                              {detail.note && <span className="text-gray-500 ml-1.5 italic font-medium">(Ghi chú: {detail.note})</span>}
                                            </div>
                                            <div className="text-gray-400 font-bold uppercase text-[8px] shrink-0">Operator: <span className="text-gray-700 font-black">{detail.operator_name || 'Không rõ'}</span></div>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Ghi chú mức độ */}
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Phân loại mức độ:</p>
                <span className="text-[9px] font-bold text-red-600">🔴 Nghiêm trọng: thiếu ≥ 20mm</span>
                <span className="text-[9px] font-bold text-orange-600">🟠 Cảnh báo: thiếu 10–19mm</span>
                <span className="text-[9px] font-bold text-yellow-600">🟡 Nhẹ: thiếu &lt; 10mm</span>
              </div>
            </div>
          )}

        </motion.div>
      )}
    </div>
  )
}
