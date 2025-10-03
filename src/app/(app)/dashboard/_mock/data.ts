import reportData from '@/mocks/report.json'
import aggregatesData from '@/mocks/aggregates.json'
import type { AnalysisReport, AggregatesBlob } from './types'

export const mockReport: AnalysisReport = reportData as AnalysisReport
export const mockAggregates: AggregatesBlob = aggregatesData as AggregatesBlob
