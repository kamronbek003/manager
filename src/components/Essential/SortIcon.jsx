import React from 'react';
import { ArrowUpDown } from 'lucide-react';

const SortIcon = React.memo(({ column, currentSort }) => (
    <ArrowUpDown
        size={14}
        className={`ml-1 inline-block transition-opacity ${currentSort.sortBy === column ? 'opacity-100 text-blue-600' : 'opacity-30 group-hover:opacity-70'}`}
        aria-hidden="true"
    />
));

export default SortIcon;