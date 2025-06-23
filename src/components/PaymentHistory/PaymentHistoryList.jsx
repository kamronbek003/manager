import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowUpDown, PlusCircle, Eye, Edit, Trash2 } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { formatDDMMYYYY, formatCurrency } from '../../utils/helpers';
import LoadingSpinner from '../Essential/LoadingSpinner';
import ErrorMessage from '../Essential/ErrorMessage';
import Pagination from '../Essential/Pagination';
import Modal from '../Essential/Modal';

const DEFAULT_LIMIT = 20;
const DEBOUNCE_DELAY = 300;

const HistoryActionType = { CREATE: 'YARATISH', UPDATE: 'YANGILASH', DELETE: 'OCHIRISH' };
const PaymentType = { NAQD: 'NAQD', KARTA: 'KARTA', BANK: 'BANK' };

const PaymentHistoryRow = React.memo(({ historyEntry, onViewDetails }) => {
    const adminName = historyEntry.admin ? `${historyEntry.admin.firstName} ${historyEntry.admin.lastName}`.trim() : 'Noma\'lum';
    const studentInfo = historyEntry.payment?.student ? `${historyEntry.payment.student.firstName} ${historyEntry.payment.student.lastName}`.trim() : 'N/A';
    const paymentAmount = historyEntry.payment?.summa;

    const getActionClass = (action) => {
        switch (action) {
            case HistoryActionType.CREATE: return 'bg-green-100 text-green-800';
            case HistoryActionType.UPDATE: return 'bg-yellow-100 text-yellow-800';
            case HistoryActionType.DELETE: return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatDDMMYYYY(historyEntry.createdAt)}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">{adminName}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
                <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionClass(historyEntry.action)}`}>
                    {historyEntry.action}
                </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{studentInfo}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{paymentAmount !== undefined ? formatCurrency(paymentAmount) : '-'}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                {historyEntry.details ? (
                    <button
                        onClick={() => onViewDetails(historyEntry)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-1 rounded-full transition-colors"
                        title="Tafsilotlarni ko'rish"
                    >
                        <Eye size={18} />
                    </button>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
        </tr>
    );
});

const SortIcon = React.memo(({ column, currentSort }) => ( <ArrowUpDown size={14} className={`ml-1 inline-block transition-opacity ${currentSort.sortBy === column ? 'opacity-100 text-blue-600' : 'opacity-30 group-hover:opacity-70'}`} aria-hidden="true" /> ));

const FormattedHistoryDetails = ({ entry }) => {
    if (!entry || !entry.details) {
        return <p className="text-gray-500 italic">Tafsilotlar mavjud emas.</p>;
    }
    const { action, details } = entry;
    const fieldLabels = { summa: "Summa", date: "Sana", paymentType: "To'lov turi" };
    const renderValue = (key, value) => {
        if (value === null || value === undefined) return <span className="text-gray-400 italic">Bo'sh</span>;
        if (key === 'date') return formatDDMMYYYY(value);
        if (key === 'summa') return formatCurrency(value);
        if (key === 'paymentType' && Object.values(PaymentType).includes(value)) return value;
        return String(value);
    };
    const shouldDisplayKey = (key) => key !== 'studentId';

    return (
        <div className="space-y-4 text-sm">
            {action === HistoryActionType.CREATE && details.created && (
                <div>
                    <h4 className="font-semibold text-green-700 mb-2 flex items-center"><PlusCircle size={16} className="mr-1.5"/> Yaratilgan ma'lumotlar:</h4>
                    <dl className="grid grid-cols-3 gap-x-4 gap-y-2">
                        {Object.entries(details.created).filter(([key]) => shouldDisplayKey(key)).map(([key, value]) => (
                            <React.Fragment key={key}><dt className="font-medium text-gray-600 col-span-1">{fieldLabels[key] || key}:</dt><dd className="text-gray-800 col-span-2">{renderValue(key, value)}</dd></React.Fragment>
                        ))}
                    </dl>
                </div>
            )}
            {action === HistoryActionType.DELETE && details.deleted && (
                <div>
                    <h4 className="font-semibold text-red-700 mb-2 flex items-center"><Trash2 size={16} className="mr-1.5"/> O'chirilgan ma'lumotlar:</h4>
                    <dl className="grid grid-cols-3 gap-x-4 gap-y-2">
                        {Object.entries(details.deleted).filter(([key]) => shouldDisplayKey(key)).map(([key, value]) => (
                            <React.Fragment key={key}><dt className="font-medium text-gray-600 col-span-1">{fieldLabels[key] || key}:</dt><dd className="text-gray-800 col-span-2">{renderValue(key, value)}</dd></React.Fragment>
                        ))}
                    </dl>
                </div>
            )}
            {action === HistoryActionType.UPDATE && details.old && details.new && (
                <div>
                    <h4 className="font-semibold text-yellow-700 mb-2 flex items-center"><Edit size={16} className="mr-1.5"/> Yangilangan ma'lumotlar:</h4>
                    <dl className="space-y-2">
                        {Object.keys(details.new).filter(key => shouldDisplayKey(key)).map(key => {
                            const oldValue = details.old[key]; const newValue = details.new[key];
                            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                                return (<div key={key} className="grid grid-cols-3 gap-x-4 border-b pb-1"><dt className="font-medium text-gray-600 col-span-1">{fieldLabels[key] || key}:</dt><dd className="text-gray-500 line-through col-span-1">{renderValue(key, oldValue)}</dd><dd className="text-gray-800 font-semibold col-span-1">{renderValue(key, newValue)}</dd></div>);
                            } return null;
                        })}
                    </dl>
                    {Object.keys(details.new).filter(key => shouldDisplayKey(key)).every(key => JSON.stringify(details.old[key]) === JSON.stringify(details.new[key])) && (<p className="text-gray-500 italic">Faqat o'zgartirgan admin yangilandi (yoki faqat Talaba ID o'zgardi).</p>)}
                </div>
            )}
            {!( (action === HistoryActionType.CREATE && details.created) || (action === HistoryActionType.DELETE && details.deleted) || (action === HistoryActionType.UPDATE && details.old && details.new)) && (
                <div><h4 className="font-semibold text-gray-700 mb-2">Xom ma'lumotlar (JSON):</h4><pre className="text-xs bg-gray-200 p-2 rounded overflow-auto">{JSON.stringify(Object.entries(details).reduce((acc, [key, value]) => { if (shouldDisplayKey(key)) { acc[key] = value; } return acc; }, {}), null, 2)}</pre></div>
            )}
        </div>
    );
};


const PaymentHistoryList = ({ token }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    
    const [filters, setFilters] = useState({
        filterByAction: '',
        filterByDateFrom: '',
        filterByDateTo: '',
    });
    const [sort, setSort] = useState({ sortBy: 'createdAt', sortOrder: 'desc' });
    const filterTimeoutRef = useRef(null);

    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null);

    const fetchPaymentHistory = useCallback(async (filtersToUse, pageToUse, sortToUse) => {
        setLoading(true); setError(null);
        try {
            const queryParams = new URLSearchParams({
                page: pageToUse.toString(), limit: DEFAULT_LIMIT.toString(),
                sortBy: sortToUse.sortBy, sortOrder: sortToUse.sortOrder,
            });
            Object.entries(filtersToUse).forEach(([key, value]) => {
                if (value) {
                    if ((key === 'filterByDateFrom' || key === 'filterByDateTo') && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                        try {
                            const date = new Date(value + (key === 'filterByDateTo' ? 'T23:59:59.999Z' : 'T00:00:00.000Z'));
                            if(!isNaN(date.getTime())) queryParams.append(key, date.toISOString());
                        } catch(e){ console.warn(`Error processing date for ${key}: ${value}`, e)}
                    } else if (typeof value === 'string') {
                        queryParams.append(key, value);
                    }
                    else { console.warn(`Skipping filter '${key}' because value is not a string:`, value); }
                }
            });
            const data = await apiRequest(`/payment-history?${queryParams.toString()}`, 'GET', null, token);
            if (data && Array.isArray(data.data)) {
                setHistory(data.data); setTotalItems(data.total || 0); setTotalPages(Math.ceil((data.total || 0) / DEFAULT_LIMIT));
            } else { setHistory([]); setTotalItems(0); setTotalPages(1); }
        } catch (err) {
            if (err.statusCode !== 401) setError(err.message || 'To\'lovlar tarixini yuklashda xatolik yuz berdi.');
            setHistory([]); setTotalItems(0); setTotalPages(1);
        } finally { setLoading(false); }
    }, [token]);

    const debouncedFetchHistory = useCallback((newFilters, newPage, newSort) => {
        if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
        filterTimeoutRef.current = setTimeout(() => {
            fetchPaymentHistory(newFilters, newPage, newSort);
        }, DEBOUNCE_DELAY);
    }, [fetchPaymentHistory]);

    useEffect(() => {
        debouncedFetchHistory(filters, currentPage, sort);
        return () => { if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current); };
    }, [filters, currentPage, sort, debouncedFetchHistory]);

    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilters(prevFilters => ({ ...prevFilters, [name]: value }));
        setCurrentPage(1);
    }, []);

    const handleSort = useCallback((column) => {
        const allowedSortColumns = ['createdAt', 'action'];
        if (!allowedSortColumns.includes(column)) return;
        setSort(prevSort => {
            const newSortOrder = prevSort.sortBy === column && prevSort.sortOrder === 'asc' ? 'desc' : 'asc';
            return { sortBy: column, sortOrder: newSortOrder };
        });
        setCurrentPage(1);
    }, []);

    const handlePageChange = useCallback((page) => { setCurrentPage(page); }, []);
    const openDetailsModal = useCallback((entry) => { setSelectedHistoryEntry(entry); setIsDetailsModalOpen(true); }, []);
    const closeDetailsModal = useCallback(() => { setIsDetailsModalOpen(false); setSelectedHistoryEntry(null); }, []);

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg m-8">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 className="text-xl sm:text-3xl font-semibold text-gray-800 flex items-center">To'lovlar Tarixi</h2>
            </div>

            {error && <ErrorMessage message={error} />}
            <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                <select
                    name="filterByAction"
                    value={filters.filterByAction}
                    onChange={handleFilterChange}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                    <option value="">Amal turi bo'yicha</option>
                    {Object.values(HistoryActionType).map(action => ( <option key={action} value={action}>{action}</option> ))}
                </select>
                <div>
                    <label htmlFor="filterByDateFrom" className="sr-only">Sana (dan)</label>
                    <input type="date" id="filterByDateFrom" name="filterByDateFrom" value={filters.filterByDateFrom} onChange={handleFilterChange} className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full" />
                </div>
                <div>
                    <label htmlFor="filterByDateTo" className="sr-only">Sana (gacha)</label>
                    <input type="date" id="filterByDateTo" name="filterByDateTo" value={filters.filterByDateTo} onChange={handleFilterChange} className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full" />
                </div>
            </div>

            {(loading && !history.length) && !error && <div className="py-10"><LoadingSpinner message="Tarix yuklanmoqda..." /></div>}

            {!loading || history.length > 0 ? (
                <>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm mb-4">
                        <table className="min-w-full bg-white divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-100" onClick={() => handleSort('createdAt')}>Vaqti <SortIcon column="createdAt" currentSort={sort} /></th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Admin</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-100" onClick={() => handleSort('action')}>Amal <SortIcon column="action" currentSort={sort} /></th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Talaba</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Summa</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Tafsilotlar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {history.length > 0 ? (
                                    history.map((entry) => (
                                        <PaymentHistoryRow key={entry.id} historyEntry={entry} onViewDetails={openDetailsModal} />
                                    ))
                                ) : (
                                   !loading && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-10 text-center text-sm text-gray-500 italic">
                                            {!error ? "Tarix yozuvlari topilmadi." : "Ma'lumot yuklashda xatolik."}
                                        </td>
                                    </tr>
                                   )
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                    )}
                </>
            ) : null}

            <Modal isOpen={isDetailsModalOpen} onClose={closeDetailsModal} title="Amal Tafsilotlari">
                {selectedHistoryEntry ? (<FormattedHistoryDetails entry={selectedHistoryEntry} />) : (<p>Tafsilotlar topilmadi.</p>)}
            </Modal>
        </div>
    );
};

export default PaymentHistoryList;