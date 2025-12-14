'use client';

import { ReactNode } from 'react';
import styles from './DataTable.module.scss';

interface Column {
	key: string;
	label: string;
	width?: string;
	render?: (value: any, row: any) => ReactNode;
}

interface DataTableProps {
	columns: Column[];
	data: any[];
	loading?: boolean;
	emptyMessage?: string;
	actions?: (row: any) => ReactNode;
	maxHeight?: string;
}

export default function DataTable({
	columns,
	data,
	loading = false,
	emptyMessage = 'No data found',
	actions,
	maxHeight,
}: DataTableProps) {
	return (
		<div className={styles.tableContainer} style={{ maxHeight }}>
			<table className={styles.table}>
				<thead>
					<tr>
						{columns.map((col) => (
							<th key={col.key} style={{ width: col.width }}>
								{col.label}
							</th>
						))}
						{actions && <th className={styles.actionsHeader}>Actions</th>}
					</tr>
				</thead>
				<tbody>
					{loading ? (
						<tr>
							<td colSpan={columns.length + (actions ? 1 : 0)} className={styles.loading}>
								Loading...
							</td>
						</tr>
					) : data.length === 0 ? (
						<tr>
							<td colSpan={columns.length + (actions ? 1 : 0)} className={styles.empty}>
								{emptyMessage}
							</td>
						</tr>
					) : (
						data.map((row, idx) => (
							<tr key={idx}>
								{columns.map((col) => (
									<td key={col.key}>
										{col.render
											? col.render(row[col.key], row)
											: row[col.key]}
									</td>
								))}
								{actions && (
									<td className={styles.actions}>{actions(row)}</td>
								)}
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}
