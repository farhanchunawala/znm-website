'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './customers.module.scss';

interface Customer {
    _id: string;
    customerId: string;
    firstName: string;
    lastName: string;
    emails: string[];
    phone: string;
    phoneCode: string;
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    archived: boolean;
    createdAt: string;
    orderCount?: number;
    totalSpent?: number;
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('latest');

    useEffect(() => {
        fetchCustomers();
    }, [showArchived, sortBy]);

    const fetchCustomers = async () => {
        try {
            const res = await fetch(`/api/admin/customers?archived=${showArchived}&sort=${sortBy}`);
            const data = await res.json();
            setCustomers(data);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this customer? This will permanently remove them from the database.')) return;

        try {
            await fetch(`/api/admin/customers/${id}`, { method: 'DELETE' });
            fetchCustomers();
        } catch (error) {
            console.error('Failed to delete customer:', error);
        }
    };

    const handleArchive = async (id: string, currentStatus: boolean) => {
        try {
            await fetch(`/api/admin/customers/${id}/archive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ archived: !currentStatus }),
            });
            fetchCustomers();
        } catch (error) {
            console.error('Failed to archive customer:', error);
        }
    };

    const exportToCSV = () => {
        const headers = ['Customer ID', 'Name', 'Email', 'Phone', 'City', 'Total Orders', 'Total Spent'];
        const rows = filteredCustomers.map(c => [
            c.customerId,
            `${c.firstName} ${c.lastName}`,
            c.emails[0] || '',
            `${c.phoneCode}${c.phone}`,
            c.city,
            c.orderCount || 0,
            c.totalSpent || 0,
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const filteredCustomers = customers.filter(customer => {
        const searchLower = searchTerm.toLowerCase();
        return (
            customer.firstName.toLowerCase().includes(searchLower) ||
            customer.lastName.toLowerCase().includes(searchLower) ||
            customer.emails.some(e => e.toLowerCase().includes(searchLower)) ||
            customer.phone.includes(searchTerm) ||
            customer.customerId.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className={styles.customersPage}>
            <div className={styles.header}>
                <h1>Customer Management</h1>
                <div className={styles.actions}>
                    <button onClick={exportToCSV} className={styles.exportBtn}>
                        📥 Export CSV
                    </button>
                    <button onClick={() => setShowArchived(!showArchived)} className={styles.archiveBtn}>
                        {showArchived ? '📋 Show Active' : '📁 Show Archived'}
                    </button>
                </div>
            </div>

            <div className={styles.filters}>
                <input
                    type="text"
                    placeholder="Search by name, email, phone, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />

                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.sortSelect}>
                    <option value="latest">Latest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="mostOrders">Most Orders</option>
                    <option value="leastOrders">Least Orders</option>
                    <option value="highestSpent">Highest Spent</option>
                    <option value="lowestSpent">Lowest Spent</option>
                    <option value="nameAZ">Name (A-Z)</option>
                    <option value="nameZA">Name (Z-A)</option>
                </select>
            </div>

            {loading ? (
                <div className={styles.loading}>Loading customers...</div>
            ) : (
                <>
                    <div className={styles.stats}>
                        <span>{filteredCustomers.length} customers found</span>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Customer ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Location</th>
                                    <th>Orders</th>
                                    <th>Total Spent</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer._id}>
                                        <td className={styles.customerId}>
                                            <Link href={`/admin/customers/${customer._id}`} className={styles.link}>
                                                {customer.customerId}
                                            </Link>
                                        </td>
                                        <td className={styles.name}>
                                            <Link href={`/admin/customers/${customer._id}`} className={styles.link}>
                                                {customer.firstName} {customer.lastName}
                                            </Link>
                                        </td>
                                        <td>{customer.emails?.[0] || 'N/A'}</td>
                                        <td>{customer.phoneCode}{customer.phone}</td>
                                        <td>{customer.city}, {customer.state}</td>
                                        <td className={styles.centered}>{customer.orderCount || 0}</td>
                                        <td className={styles.amount}>₹{(customer.totalSpent || 0).toLocaleString()}</td>
                                        <td className={styles.actions}>
                                            <button
                                                onClick={() => handleArchive(customer._id, customer.archived)}
                                                className={styles.archiveAction}
                                                title={customer.archived ? 'Unarchive' : 'Archive'}
                                            >
                                                {customer.archived ? '📤' : '📁'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(customer._id)}
                                                className={styles.deleteAction}
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
