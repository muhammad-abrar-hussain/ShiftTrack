import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface ShiftFilterState {
    employee_last_name?: string;
    start_date?: string;
    end_date?: string;
}

const initialState: ShiftFilterState = {
    employee_last_name: undefined,
    start_date: undefined,
    end_date: undefined,
};

const shiftSlice = createSlice({
    name: 'shifts',
    initialState,
    reducers: {
        setFilters: (state, action: PayloadAction<ShiftFilterState>) => {
            return { ...state, ...action.payload };
        },
        resetFilters: () => initialState,
    },
});

export const { setFilters, resetFilters } = shiftSlice.actions;
export default shiftSlice.reducer;
