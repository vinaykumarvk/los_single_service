import { useState, ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from './Button';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  isLoading?: boolean;
  emptyState?: ReactNode;
  className?: string;
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
  isLoading = false,
  emptyState,
  className,
}: DataTableProps<T>) {
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [showColumnToggle, setShowColumnToggle] = useState(false);

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allKeys = data.map(keyExtractor);
      onSelectionChange?.(new Set(allKeys));
    } else {
      onSelectionChange?.(new Set());
    }
  };

  const handleSelectRow = (key: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(key);
    } else {
      newSelected.delete(key);
    }
    onSelectionChange?.(newSelected);
  };

  const toggleColumn = (columnKey: string) => {
    const newHidden = new Set(hiddenColumns);
    if (newHidden.has(columnKey)) {
      newHidden.delete(columnKey);
    } else {
      newHidden.add(columnKey);
    }
    setHiddenColumns(newHidden);
  };

  const visibleColumns = columns.filter(col => !hiddenColumns.has(col.key));

  const sortedData = [...data].sort((a, b) => {
    if (!sortBy) return 0;
    
    const aValue = (a as any)[sortBy];
    const bValue = (b as any)[sortBy];
    
    if (aValue === bValue) return 0;
    
    const comparison = aValue > bValue ? 1 : -1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const allSelected = data.length > 0 && selectedRows.size === data.length;
  const someSelected = selectedRows.size > 0 && selectedRows.size < data.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn('relative', className)}>
      {columns.length > 4 && (
        <div className="flex justify-end mb-4">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColumnToggle(!showColumnToggle)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Columns ({visibleColumns.length}/{columns.length})
            </Button>
            {showColumnToggle && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowColumnToggle(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 py-2 z-20">
                  {columns.map(col => (
                    <label
                      key={col.key}
                      className="flex items-center px-4 py-2 hover:bg-secondary-50 dark:hover:bg-secondary-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.has(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="rounded border-secondary-300 dark:border-secondary-600 text-primary-600 focus:ring-primary-500 mr-3 dark:bg-secondary-900"
                      />
                      <span className="text-sm text-secondary-700 dark:text-secondary-300">{col.label}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-secondary-200 dark:border-secondary-800">
        <table className="w-full">
          <thead className="bg-secondary-50 dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700">
            <tr>
              {selectable && (
                <th className="px-4 sm:px-6 py-3 sm:py-4 w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={input => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-secondary-300 dark:border-secondary-600 text-primary-600 focus:ring-primary-500 dark:bg-secondary-900"
                  />
                </th>
              )}
              {visibleColumns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wider',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.sortable && 'cursor-pointer hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors'
                  )}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{col.label}</span>
                    {col.sortable && (
                      <div className="text-secondary-400 dark:text-secondary-500">
                        {sortBy === col.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-4 w-4" />
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-secondary-900 divide-y divide-secondary-200 dark:divide-secondary-800">
            {sortedData.map((item) => {
              const key = keyExtractor(item);
              const isSelected = selectedRows.has(key);
              
              return (
                <tr
                  key={key}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-800',
                    isSelected && 'bg-primary-50 dark:bg-primary-900/20'
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {selectable && (
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(key, e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-secondary-300 dark:border-secondary-600 text-primary-600 focus:ring-primary-500 dark:bg-secondary-900"
                      />
                    </td>
                  )}
                  {visibleColumns.map(col => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 sm:px-6 py-3 sm:py-4 text-sm text-secondary-900 dark:text-secondary-100',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center'
                      )}
                    >
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
