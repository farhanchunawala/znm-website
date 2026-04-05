'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
    PlusIcon, 
    MagnifyingGlassIcon, 
    ArrowDownTrayIcon, 
    ArrowUpTrayIcon, 
    ArchiveBoxIcon, 
    ArrowUpOnSquareIcon,
    TrashIcon,
    MapPinIcon,
    EnvelopeIcon,
    PhoneIcon,
    ShoppingBagIcon,
    CurrencyRupeeIcon
} from '@heroicons/react/24/outline';
import styles from './customers.module.css';

interface Customer {
    _id: string;
    customerId: string;
    firstName: string;
    lastName: string;
    email?: string;
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
    const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

    useEffect(() => {
        fetchCustomers();
    }, [showArchived, sortBy]);

    const fetchCustomers = async () => {
        setLoading(true);
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

    const toggleSelectAll = () => {
        if (selectedCustomers.length === filteredCustomers.length) {
            setSelectedCustomers([]);
        } else {
            setSelectedCustomers(filteredCustomers.map(c => c._id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedCustomers(prev =>
            prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
        );
    };

    const handleBulkAction = async (action: string) => {
        if (selectedCustomers.length === 0) return;
        
        const confirmMsg = action === 'delete' 
            ? `Are you sure you want to delete ${selectedCustomers.length} customers?`
            : `Are you sure you want to archive ${selectedCustomers.length} customers?`;
            
        if (!confirm(confirmMsg)) return;

        try {
            const res = await fetch('/api/admin/customers/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedCustomers, action }),
            });

            if (res.ok) {
                setSelectedCustomers([]);
                fetchCustomers();
            }
        } catch (error) {
            console.error('Bulk operation failed:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to permanently delete this customer? This action cannot be undone.')) return;

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

    const handleExportCSV = () => {
        const headers = ['Customer ID', 'Name', 'Email', 'Phone', 'City', 'Total Orders', 'Total Spent'];
        const rows = filteredCustomers.map(c => [
            c.customerId,
            `${c.firstName} ${c.lastName}`,
            c.email || c.emails[0] || '',
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

    const getInitials = (first: string, last: string) => {
        return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    };

    return (
        <div className={styles.customersPage}>
            <header className={styles.header}>
                <div className={styles.headerTitle}>
                    <h1>Customers</h1>
                    <p>Manage your customer relationships and view their activity.</p>
                </div>
                <div className={styles.mainActions}>
                    <Link href="/admin/customers/new" className={styles.addBtn}>
                        <PlusIcon />
                        <span>Add Customer</span>
                    </Link>
                    <Link href="/admin/customers/import" className={styles.importBtn}>
                        <ArrowDownTrayIcon width={18} />
                        <span>Import</span>
                    </Link>
                    <button onClick={handleExportCSV} className={styles.exportBtn}>
                        <ArrowUpTrayIcon width={18} />
                        <span>Export</span>
                    </button>
                    <button 
                        onClick={() => setShowArchived(!showArchived)} 
                        className={styles.archiveToggleBtn}
                    >
                        {showArchived ? <PlusIcon width={18} /> : <ArchiveBoxIcon width={18} />}
                        <span>{showArchived ? 'Show Active' : 'Show Archived'}</span>
                    </button>
                </div>
            </header>

            <section className={styles.controls}>
                <div className={styles.filters}>
                    <div className={styles.searchWrapper}>
                        <MagnifyingGlassIcon className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Search by name, email, phone, or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value)} 
                        className={styles.sortSelect}
                    >
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
            </section>

            {selectedCustomers.length > 0 && (
                <div className={styles.bulkActions}>
                    <span className={styles.bulkInfo}>{selectedCustomers.length} customers selected</span>
                    <div className={styles.bulkButtons}>
                        <button onClick={() => handleBulkAction('archive')} className={styles.bulkBtn}>
                            Archive Selected
                        </button>
                        <button onClick={() => handleBulkAction('delete')} className={`${styles.bulkBtn} styles.bulkBtnDanger`}>
                            Delete Permanent
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className={styles.loadingWrapper}>
                    <div className={styles.spinner}></div>
                    <p>Loading customers...</p>
                </div>
            ) : filteredCustomers.length === 0 ? (
                <div className={styles.noResults}>
                    <h2>No customers found</h2>
                    <p>Try adjusting your search or filters.</p>
                </div>
            ) : (
                <>
                    {/* Mobile Grid View */}
                    <div className={styles.customerGrid}>
                        {filteredCustomers.map((customer) => (
                            <div key={customer._id} className={styles.customerCard}>
                                <input
                                    type="checkbox"
                                    checked={selectedCustomers.includes(customer._id)}
                                    onChange={() => toggleSelect(customer._id)}
                                    className={styles.cardCheckbox}
                                />
                                <div className={styles.avatar}>
                                    {getInitials(customer.firstName, customer.lastName)}
                                </div>
                                <div className={styles.customerInfo}>
                                    <Link href={`/admin/customers/${customer._id}`} className={styles.customerLink}>
                                        <h3>{customer.firstName} {customer.lastName}</h3>
                                    </Link>
                                    <p className={styles.idBadge}>{customer.customerId}</p>
                                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--b50)' }}>
                                            <EnvelopeIcon width={14} />
                                            <span>{customer.email || customer.emails?.[0] || 'No email'}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--b50)' }}>
                                            <MapPinIcon width={14} />
                                            <span>{customer.city}, {customer.state}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className={styles.cardStats}>
                                    <div className={styles.statItem}>
                                        <span>Orders</span>
                                        <span>{customer.orderCount || 0}</span>
                                    </div>
                                    <div className={styles.statItem}>
                                        <span>Spent</span>
                                        <span className={styles.price}>₹{(customer.totalSpent || 0).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className={styles.cardActions}>
                                    <span className={`${styles.statusBadge} ${customer.archived ? styles.statusArchived : styles.statusActive}`}>
                                        {customer.archived ? 'Archived' : 'Active'}
                                    </span>
                                    <div className={styles.rowActions}>
                                        <button
                                            onClick={() => handleArchive(customer._id, customer.archived)}
                                            className={styles.actionIconBtn}
                                            title={customer.archived ? 'Unarchive' : 'Archive'}
                                        >
                                            <ArchiveBoxIcon width={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(customer._id)}
                                            className={`${styles.actionIconBtn} ${styles.deleteIconBtn}`}
                                            title="Delete"
                                        >
                                            <TrashIcon width={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th>Customer</th>
                                    <th>Contact</th>
                                    <th>Location</th>
                                    <th>Activity</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer._id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedCustomers.includes(customer._id)}
                                                onChange={() => toggleSelect(customer._id)}
                                            />
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div className={styles.avatar} style={{ width: '36px', height: '36px', fontSize: '14px', margin: 0 }}>
                                                    {getInitials(customer.firstName, customer.lastName)}
                                                </div>
                                                <div>
                                                    <Link href={`/admin/customers/${customer._id}`} className={styles.customerLink}>
                                                        <span style={{ display: 'block' }}>{customer.firstName} {customer.lastName}</span>
                                                    </Link>
                                                    <span className={styles.idBadge}>{customer.customerId}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px' }}>
                                                <div style={{ color: 'var(--b0)' }}>{customer.email || customer.emails?.[0] || 'N/A'}</div>
                                                <div style={{ color: 'var(--b50)' }}>{customer.phoneCode}{customer.phone}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px' }}>
                                                <div>{customer.city}</div>
                                                <div style={{ color: 'var(--b50)' }}>{customer.state}, {customer.country}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px' }}>
                                                <div style={{ fontWeight: 700 }}>{customer.orderCount || 0} Orders</div>
                                                <div className={styles.price}>₹{(customer.totalSpent || 0).toLocaleString()}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${customer.archived ? styles.statusArchived : styles.statusActive}`}>
                                                {customer.archived ? 'Archived' : 'Active'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.rowActions} style={{ justifyContent: 'flex-end' }}>
                                                <Link href={`/admin/customers/${customer._id}`} className={styles.actionIconBtn}>
                                                    <PlusIcon width={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleArchive(customer._id, customer.archived)}
                                                    className={styles.actionIconBtn}
                                                    title={customer.archived ? 'Restore' : 'Archive'}
                                                >
                                                    {customer.archived ? <ArrowUpOnSquareIcon width={18} /> : <ArchiveBoxIcon width={18} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(customer._id)}
                                                    className={`${styles.actionIconBtn} ${styles.deleteIconBtn}`}
                                                    title="Delete"
                                                >
                                                    <TrashIcon width={18} />
                                                </button>
                                            </div>
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
