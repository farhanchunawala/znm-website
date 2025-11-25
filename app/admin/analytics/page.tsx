'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './analytics.module.scss';

interface AnalyticsData {
    todayIncome: number;
    weekIncome: number;
    monthIncome: number;
    yearIncome: number;
    allTimeIncome: number;
    dailyData: Array<{ date: string; income: number }>;
    monthlyData: Array<{ month: string; income: number }>;
    topCustomers: Array<{ name: string; totalSpent: number; orderCount: number }>;
    paymentBreakdown: Array<{ name: string; value: number }>;
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('30'); // days

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange]);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch(`/api/admin/analytics?days=${dateRange}`);
            const analyticsData = await res.json();
            setData(analyticsData);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        if (!data) return;

        const headers = ['Metric', 'Value'];
        const rows = [
            ['Today Income', data.todayIncome],
            ['Week Income', data.weekIncome],
            ['Month Income', data.monthIncome],
            ['Year Income', data.yearIncome],
            ['All Time Income', data.allTimeIncome],
            ['', ''],
            ['Top Customers', ''],
            ...data.topCustomers.map(c => [c.name, c.totalSpent]),
        ];

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];

    if (loading) {
        return <div className={styles.loading}>Loading analytics...</div>;
    }

    if (!data) {
        return <div className={styles.loading}>No data available</div>;
    }

    return (
        <div className={styles.analyticsPage}>
            <div className={styles.header}>
                <h1>Analytics & Reports</h1>
                <div className={styles.actions}>
                    <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={styles.rangeSelect}>
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="365">Last Year</option>
                    </select>
                    <button onClick={exportToCSV} className={styles.exportBtn}>
                        📥 Export CSV
                    </button>
                </div>
            </div>

            {/* Income Summary Cards */}
            <div className={styles.incomeCards}>
                <div className={styles.card}>
                    <h3>Today</h3>
                    <p className={styles.amount}>₹{data.todayIncome.toLocaleString()}</p>
                </div>
                <div className={styles.card}>
                    <h3>This Week</h3>
                    <p className={styles.amount}>₹{data.weekIncome.toLocaleString()}</p>
                </div>
                <div className={styles.card}>
                    <h3>This Month</h3>
                    <p className={styles.amount}>₹{data.monthIncome.toLocaleString()}</p>
                </div>
                <div className={styles.card}>
                    <h3>This Year</h3>
                    <p className={styles.amount}>₹{data.yearIncome.toLocaleString()}</p>
                </div>
                <div className={styles.card}>
                    <h3>All Time</h3>
                    <p className={styles.amount}>₹{data.allTimeIncome.toLocaleString()}</p>
                </div>
            </div>

            {/* Charts */}
            <div className={styles.chartsGrid}>
                {/* Daily Income Chart */}
                <div className={styles.chartCard}>
                    <h2>Daily Income Trend</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.dailyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip formatter={(value) => `₹${value}`} />
                            <Legend />
                            <Line type="monotone" dataKey="income" stroke="#667eea" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Monthly Income Chart */}
                <div className={styles.chartCard}>
                    <h2>Monthly Income</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value) => `₹${value}`} />
                            <Legend />
                            <Bar dataKey="income" fill="#764ba2" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Payment Status Breakdown */}
                <div className={styles.chartCard}>
                    <h2>Payment Status</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={data.paymentBreakdown}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry) => `${entry.name}: ₹${entry.value.toLocaleString()}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {data.paymentBreakdown.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => `₹${value}`} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Customers */}
                <div className={styles.chartCard}>
                    <h2>Top Customers by Spending</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.topCustomers.slice(0, 10)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip formatter={(value) => `₹${value}`} />
                            <Bar dataKey="totalSpent" fill="#27ae60" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Customer Rankings Table */}
            <div className={styles.rankingsSection}>
                <h2>Customer Rankings</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Customer Name</th>
                                <th>Total Orders</th>
                                <th>Total Spent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.topCustomers.slice(0, 20).map((customer, index) => (
                                <tr key={index}>
                                    <td className={styles.rank}>#{index + 1}</td>
                                    <td>{customer.name}</td>
                                    <td className={styles.centered}>{customer.orderCount}</td>
                                    <td className={styles.amount}>₹{customer.totalSpent.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
