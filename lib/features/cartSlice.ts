import { createAppSlice } from '@/lib/createAppSlice';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
    id: string; // Product ID or unique combination of ID + Size
    title: string;
    price: number;
    size: string;
    quantity: number;
    image: string;
}

export interface CartState {
    items: CartItem[];
}

const initialState: CartState = {
    items: [],
};

export const cartSlice = createAppSlice({
    name: 'cart',
    initialState,
    reducers: (create) => ({
        addToCart: create.reducer((state, action: PayloadAction<CartItem>) => {
            const existingItem = state.items.find(
                (item) => item.id === action.payload.id && item.size === action.payload.size
            );
            if (existingItem) {
                existingItem.quantity += action.payload.quantity;
            } else {
                state.items.push(action.payload);
            }
        }),
        removeFromCart: create.reducer(
            (state, action: PayloadAction<{ id: string; size: string }>) => {
                state.items = state.items.filter(
                    (item) => !(item.id === action.payload.id && item.size === action.payload.size)
                );
            }
        ),
        updateQuantity: create.reducer(
            (
                state,
                action: PayloadAction<{ id: string; size: string; quantity: number }>
            ) => {
                const item = state.items.find(
                    (item) =>
                        item.id === action.payload.id && item.size === action.payload.size
                );
                if (item) {
                    item.quantity = action.payload.quantity;
                }
            }
        ),
        clearCart: create.reducer((state) => {
            state.items = [];
        }),
    }),
    selectors: {
        selectCartItems: (state) => state.items,
        selectCartTotal: (state) =>
            state.items.reduce((total, item) => total + item.price * item.quantity, 0),
        selectCartCount: (state) =>
            state.items.reduce((count, item) => count + item.quantity, 0),
    },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } =
    cartSlice.actions;

export const { selectCartItems, selectCartTotal, selectCartCount } =
    cartSlice.selectors;
