# Admin UI Component Quick Reference

## Components Available

### 1. PageHeader
```tsx
<PageHeader
  title="Page Title"
  subtitle="Optional subtitle"
  icon={<IconComponent />}
  actions={<button>Action</button>}
/>
```

### 2. DataTable
```tsx
<DataTable
  columns={[
    { key: 'id', label: 'ID', width: '10%' },
    { 
      key: 'name', 
      label: 'Name', 
      width: '40%',
      render: (val) => <strong>{val}</strong>
    },
  ]}
  data={items}
  loading={loading}
  emptyMessage="No items found"
  actions={(row) => (
    <button>Edit</button>
  )}
/>
```

### 3. Modal
```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  subtitle="Optional subtitle"
  size="md" // sm, md, lg
  footer={
    <>
      <button>Cancel</button>
      <button>Save</button>
    </>
  }
>
  {/* Content */}
</Modal>
```

### 4. Card
```tsx
<Card
  title="Card Title"
  subtitle="Optional subtitle"
  action={<button>Action</button>}
  footer={<button>Footer Action</button>}
>
  {/* Content */}
</Card>
```

---

## Button Styles

```tsx
import buttonStyles from '@/components/Admin/_buttons.module.scss';

// Primary (Black background)
<button className={buttonStyles.primaryBtn}>Save</button>

// Secondary (White with border)
<button className={buttonStyles.secondaryBtn}>Cancel</button>

// Danger (Red outline)
<button className={buttonStyles.dangerBtn}>Delete</button>

// Ghost (Transparent)
<button className={buttonStyles.ghostBtn}>More</button>
```

---

## Form Styles

```tsx
import formStyles from '@/components/Admin/_forms.module.scss';

<div className={formStyles.formGroup}>
  <label>Field Name <span className={formStyles.required}>*</span></label>
  <input className={formStyles.input} />
  <p className={formStyles.helpText}>Helper text</p>
  <p className={formStyles.errorText}>Error message</p>
</div>

<div className={formStyles.formRow}>
  {/* Multiple columns */}
</div>

<div className={formStyles.formSection}>
  <h3>Section Header</h3>
  {/* Content */}
</div>
```

---

## Color Reference

| Color | Hex | Element |
|-------|-----|---------|
| White | #ffffff | Card/page background |
| Off-White | #f8f8f8 | Hover states |
| Light Grey | #e0e0e0 | Borders |
| Medium Grey | #a0a0a0 | Secondary text |
| Dark Grey | #595959 | Primary text |
| Black | #000000 | Headings, primary buttons |

---

## Sidebar Navigation

```tsx
// Auto organized by these sections:
// MAIN
// OPERATIONS  
// CATALOG
// CUSTOMERS & GROUPS
// MARKETING
// ANALYTICS
```

Add new items to `layout.tsx` navSections array.

---

## Example: New List Page

```tsx
'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/Admin/PageHeader';
import DataTable from '@/components/Admin/DataTable';
import Modal from '@/components/Admin/Modal';
import Card from '@/components/Admin/Card';
import buttonStyles from '@/components/Admin/_buttons.module.scss';
import formStyles from '@/components/Admin/_forms.module.scss';

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    // Fetch items
    setLoading(false);
  }, []);

  return (
    <>
      <PageHeader
        title="Items"
        subtitle="Manage your items"
        actions={
          <button 
            onClick={() => setShowCreateModal(true)}
            className={buttonStyles.primaryBtn}
          >
            + Create Item
          </button>
        }
      />

      <Card title="Filters">
        <div>Filter controls here</div>
      </Card>

      <DataTable
        columns={[
          { key: 'name', label: 'Name', width: '30%' },
          { key: 'status', label: 'Status', width: '20%' },
          { key: 'createdAt', label: 'Created', width: '25%' },
        ]}
        data={items}
        loading={loading}
        actions={(row) => (
          <button className={buttonStyles.ghostBtn}>Edit</button>
        )}
      />

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Item"
        size="md"
        footer={
          <button className={buttonStyles.primaryBtn}>Create</button>
        }
      >
        <div className={formStyles.formGroup}>
          <label>Name <span className={formStyles.required}>*</span></label>
          <input className={formStyles.input} />
        </div>
      </Modal>
    </>
  );
}
```

---

## Responsive Breakpoints

- **Mobile:** < 768px
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

Components auto-respond with mobile-first approach.

---

## Animations

- **Modal in:** slideUp (300ms)
- **Modal fade:** fadeIn (150ms)
- **Button hover:** 150ms transition
- **Card hover:** 150ms transition
- **Navigation hover:** 150ms transition

All use `ease-out` or `cubic-bezier(0.34, 1.56, 0.64, 1)` for natural feel.

---

## Icon Library

Using Heroicons v2 (24px outline):
```tsx
import {
  HomeIcon,
  UsersIcon,
  ShoppingBagIcon,
  FileTextIcon,
  PrinterIcon,
  TrashIcon,
  PencilIcon,
  // ... more icons
} from '@heroicons/react/24/outline';
```

---

## Toast/Alert Pattern

Until toast component is added, use:
```tsx
alert('Success message');
// or
setError('Error message');
```

For better UX, consider adding a toast library.

---

## Performance Tips

1. Use React.memo for table rows
2. Lazy load modals (render only when open)
3. Use useCallback for event handlers
4. Avoid inline function definitions
5. Use CSS modules for scoped styles

---

**Happy building! 🚀**
