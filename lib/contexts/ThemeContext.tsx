'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
	theme: Theme;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setTheme] = useState<Theme>('light');
	const [mounted, setMounted] = useState(false);

	// Load theme from localStorage on mount
	useEffect(() => {
		const savedTheme = localStorage.getItem('admin-theme') as Theme | null;
		if (savedTheme) {
			setTheme(savedTheme);
		} else {
			// Check system preference
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			setTheme(prefersDark ? 'dark' : 'light');
		}
		setMounted(true);
	}, []);

	// Apply theme to document
	useEffect(() => {
		if (mounted) {
			document.documentElement.setAttribute('data-theme', theme);
			localStorage.setItem('admin-theme', theme);
		}
	}, [theme, mounted]);

	const toggleTheme = () => {
		setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
	};

	// Prevent flash of unstyled content
	if (!mounted) {
		return null;
	}

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
}
