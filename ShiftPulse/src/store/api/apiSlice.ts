import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { ShiftSummary, Employee, ShiftPunch, EmployeeStats, EmployeeTrend, Alert } from '../../types/api';

export const apiSlice = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_API_BASE_URL }),
    tagTypes: ['Shift', 'Employee', 'Alert'],
    endpoints: (builder) => ({
        getShifts: builder.query<ShiftSummary[], { employee_last_name?: string; start_date?: string; end_date?: string }>({
            query: (params) => ({
                url: '/shifts/',
                params,
            }),
            providesTags: ['Shift'],
        }),
        getShiftDetail: builder.query<ShiftSummary, number>({
            query: (id) => `/shifts/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Shift', id }],
        }),
        getShiftPunches: builder.query<ShiftPunch[], number>({
            query: (id) => `/shifts/${id}/punches`,
            providesTags: (_result, _error, id) => [{ type: 'Shift', id, part: 'Punches' }],
        }),
        getEmployees: builder.query<Employee[], void>({
            query: () => '/employees/',
            providesTags: ['Employee'],
        }),
        getEmployeeStats: builder.query<EmployeeStats[], { start_date?: string; end_date?: string }>({
            query: (params) => ({
                url: '/employees/stats',
                params,
            }),
            providesTags: ['Employee'],
        }),
        getEmployeeTrend: builder.query<EmployeeTrend[], { last_name: string; start_date?: string; end_date?: string }>({
            query: ({ last_name, ...params }) => ({
                url: `/employees/${last_name}/trend`,
                params,
            }),
            providesTags: (_result, _error, { last_name }) => [{ type: 'Employee' as const, id: last_name }],
        }),
        getOverviewSummary: builder.query<any, { start_date?: string; end_date?: string }>({
            query: (params) => ({
                url: '/shifts/stats/summary',
                params,
            }),
            providesTags: ['Shift'],
        }),
        getOverviewDaily: builder.query<any[], { start_date?: string; end_date?: string }>({
            query: (params) => ({
                url: '/shifts/stats/daily',
                params,
            }),
            providesTags: ['Shift'],
        }),
        getShiftAnalytics: builder.query<any[], { start_date?: string; end_date?: string }>({
            query: (params) => ({
                url: '/shifts/analytics',
                params,
            }),
            providesTags: ['Shift'],
        }),
        getAlerts: builder.query<Alert[], { start_date?: string; end_date?: string }>({
            query: (params) => ({
                url: '/alerts/',
                params,
            }),
            providesTags: ['Alert'],
        }),
    }),
});

export const {
    useGetShiftsQuery,
    useGetShiftDetailQuery,
    useGetShiftPunchesQuery,
    useGetEmployeesQuery,
    useGetEmployeeStatsQuery,
    useGetEmployeeTrendQuery,
    useGetOverviewSummaryQuery,
    useGetOverviewDailyQuery,
    useGetShiftAnalyticsQuery,
    useGetAlertsQuery,
} = apiSlice;
