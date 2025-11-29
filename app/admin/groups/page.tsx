'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import styles from './groups.module.scss';

interface Group {
    _id: string;
    name: string;
    type: 'customer' | 'order';
    color: string;
    description?: string;
    createdAt: string;
}

export default function GroupsPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'customer' as 'customer' | 'order',
        color: '#000000',
        description: '',
    });

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const res = await fetch('/api/admin/groups');
            const data = await res.json();
            setGroups(data.groups || []);
        } catch (error) {
            console.error('Failed to fetch groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const url = editingGroup
                ? `/api/admin/groups/${editingGroup._id}`
                : '/api/admin/groups';

            const method = editingGroup ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setShowModal(false);
                setEditingGroup(null);
                setFormData({ name: '', type: 'customer', color: '#000000', description: '' });
                fetchGroups();
            }
        } catch (error) {
            console.error('Failed to save group:', error);
        }
    };

    const handleEdit = (group: Group) => {
        setEditingGroup(group);
        setFormData({
            name: group.name,
            type: group.type,
            color: group.color,
            description: group.description || '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this group?')) return;

        try {
            const res = await fetch(`/api/admin/groups/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                fetchGroups();
            }
        } catch (error) {
            console.error('Failed to delete group:', error);
        }
    };

    const customerGroups = groups.filter(g => g.type === 'customer');
    const orderGroups = groups.filter(g => g.type === 'order');

    return (
        <div className={styles.groupsPage}>
            <div className={styles.header}>
                <h1>Groups Management</h1>
                <button
                    onClick={() => {
                        setEditingGroup(null);
                        setFormData({ name: '', type: 'customer', color: '#000000', description: '' });
                        setShowModal(true);
                    }}
                    className={styles.addBtn}
                >
                    <PlusIcon />
                    Create Group
                </button>
            </div>

            {loading ? (
                <div className={styles.loading}>Loading groups...</div>
            ) : (
                <div className={styles.grid}>
                    <div className={styles.section}>
                        <h2>Customer Groups</h2>
                        {customerGroups.length === 0 ? (
                            <div className={styles.empty}>No customer groups yet</div>
                        ) : (
                            <div className={styles.groupsList}>
                                {customerGroups.map(group => (
                                    <div key={group._id} className={styles.groupCard}>
                                        <div className={styles.groupHeader}>
                                            <div className={styles.groupName}>
                                                <div
                                                    className={styles.colorDot}
                                                    style={{ backgroundColor: group.color }}
                                                />
                                                <span>{group.name}</span>
                                            </div>
                                            <div className={styles.actions}>
                                                <button onClick={() => handleEdit(group)} className={styles.iconBtn}>
                                                    <PencilIcon />
                                                </button>
                                                <button onClick={() => handleDelete(group._id)} className={styles.iconBtn}>
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </div>
                                        {group.description && (
                                            <p className={styles.description}>{group.description}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={styles.section}>
                        <h2>Order Groups</h2>
                        {orderGroups.length === 0 ? (
                            <div className={styles.empty}>No order groups yet</div>
                        ) : (
                            <div className={styles.groupsList}>
                                {orderGroups.map(group => (
                                    <div key={group._id} className={styles.groupCard}>
                                        <div className={styles.groupHeader}>
                                            <div className={styles.groupName}>
                                                <div
                                                    className={styles.colorDot}
                                                    style={{ backgroundColor: group.color }}
                                                />
                                                <span>{group.name}</span>
                                            </div>
                                            <div className={styles.actions}>
                                                <button onClick={() => handleEdit(group)} className={styles.iconBtn}>
                                                    <PencilIcon />
                                                </button>
                                                <button onClick={() => handleDelete(group._id)} className={styles.iconBtn}>
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </div>
                                        {group.description && (
                                            <p className={styles.description}>{group.description}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showModal && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3>{editingGroup ? 'Edit Group' : 'Create New Group'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGroup}>
                                <label>Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className={styles.input}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Type *</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'customer' | 'order' })}
                                    className={styles.input}
                                    disabled={!!editingGroup}
                                >
                                    <option value="customer">Customer</option>
                                    <option value="order">Order</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Color</label>
                                <input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className={styles.colorInput}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className={styles.textarea}
                                    rows={3}
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => setShowModal(false)} className={styles.cancelBtn}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.submitBtn}>
                                    {editingGroup ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
