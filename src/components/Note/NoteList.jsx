import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Notebook, Trash2, Edit, ArrowUpDown, CalendarDays, CalendarClock, CalendarCheck, ListFilter } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { formatDDMMYYYY } from '../../utils/helpers';
import LoadingSpinner from '../Essential/LoadingSpinner';
import ErrorMessage from '../Essential/ErrorMessage';
import Pagination from '../Essential/Pagination';
import Modal from '../Essential/Modal';
import ConfirmationModal from '../Essential/ConfirmationModal';
import NoteForm from './NoteForm';

const DEFAULT_LIMIT = 15;
const DEBOUNCE_DELAY = 300;

const getFormattedLocalTimeFromISO = (isoDateString) => {
    if (!isoDateString) return '-';
    try {
        const dateObj = new Date(isoDateString);
        if (isNaN(dateObj.getTime())) return '-'; 
        const hours = dateObj.getHours().toString().padStart(2, '0');
        const minutes = dateObj.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    } catch (e) {
        console.error("[NoteList.jsx] Error formatting local time from ISO string:", e, "Input:", isoDateString);
        return '-';
    }
};

const NoteRow = React.memo(({ note, onEdit, onDelete }) => {
    return (
        <tr className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-900 font-medium">{note.fullName}</td>
            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-500">{note.phone}</td>
            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-500">{formatDDMMYYYY(note.callDate)}</td>
            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-500">{getFormattedLocalTimeFromISO(note.callDate)}</td>
            <td className="px-4 py-3.5 text-sm text-gray-500 max-w-xs truncate" title={note.about}>{note.about || '-'}</td>
            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-500">{formatDDMMYYYY(note.createdAt)}</td>
            <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium space-x-3.5">
                <button onClick={() => onEdit(note)} className="text-indigo-600 hover:text-indigo-800 transition-colors" title="Tahrirlash"><Edit size={18} /></button>
                <button onClick={() => onDelete(note.id)} className="text-red-600 hover:text-red-800 transition-colors" title="O'chirish"><Trash2 size={18} /></button>
            </td>
        </tr>
    );
});

const SortIcon = React.memo(({ column, currentSort }) => {
    return (
        <ArrowUpDown
            size={14}
            className={`ml-1.5 inline-block transition-opacity ${currentSort.sortBy === column ? 'opacity-100 text-indigo-600' : 'opacity-30 group-hover:opacity-80'}`}
            aria-hidden="true"
        />
    );
});


const NoteList = ({ token, refreshTodaysNotesForNotifications, showToast }) => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [filters, setFilters] = useState({ filterByFullName: '', filterByPhone: '' });
    const [dateFilterType, setDateFilterType] = useState('all'); 
    const [sort, setSort] = useState({ sortBy: 'callDate', sortOrder: 'desc' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [deletingNoteId, setDeletingNoteId] = useState(null);
    const [todayNoteCount, setTodayNoteCount] = useState(0);

    const filterTimeoutRef = useRef(null);
    const fetchTodayNoteCount = useCallback(async () => {
        const today = new Date(); today.setUTCHours(0, 0, 0, 0); 
        const tomorrow = new Date(today); tomorrow.setUTCDate(today.getUTCDate() + 1);
        const queryParams = new URLSearchParams({
            page: '1',
            limit: '1', 
            filterByDateFrom: today.toISOString(),
            filterByDateTo: tomorrow.toISOString()
        });
        try {
            const data = await apiRequest(`/notes?${queryParams.toString()}`, 'GET', null, token);
            setTodayNoteCount(data.total || 0);
        } catch (err) {
            console.error("Bugungi eslatmalar sonini olishda xatolik:", err.originalError || err);
            setTodayNoteCount(0); 
        }
    }, [token]);

    const fetchNotes = useCallback(async (
        filtersToUse = filters,
        pageToUse = currentPage,
        sortToUse = sort,
        dateFilterToUse = dateFilterType
    ) => {
        setLoading(true);
        setListError(null);
        try {
            const queryParams = new URLSearchParams({
                page: pageToUse.toString(),
                limit: DEFAULT_LIMIT.toString(),
                sortBy: sortToUse.sortBy,
                sortOrder: sortToUse.sortOrder,
            });
            Object.entries(filtersToUse).forEach(([key, value]) => { if (value) queryParams.append(key, value); });

            const todayUTCStart = new Date(); todayUTCStart.setUTCHours(0, 0, 0, 0);
            const tomorrowUTCStart = new Date(todayUTCStart); tomorrowUTCStart.setUTCDate(todayUTCStart.getUTCDate() + 1);
            let dateFromISO = null;
            let dateToISO = null;

            if (dateFilterToUse === 'today') {
                dateFromISO = todayUTCStart.toISOString();
                dateToISO = tomorrowUTCStart.toISOString();
            } else if (dateFilterToUse === 'past') {
                dateToISO = todayUTCStart.toISOString(); 
            } else if (dateFilterToUse === 'future') {
                dateFromISO = tomorrowUTCStart.toISOString(); 
            }

            if (dateFromISO) queryParams.append('filterByDateFrom', dateFromISO);
            if (dateToISO) queryParams.append('filterByDateTo', dateToISO);

            const data = await apiRequest(`/notes?${queryParams.toString()}`, 'GET', null, token);
            if (data && Array.isArray(data.data)) {
                setNotes(data.data); 
                setTotalItems(data.total || 0);
                setTotalPages(Math.ceil((data.total || 0) / DEFAULT_LIMIT));
            } else {
                const warnMsg = "Eslatmalar uchun kutilmagan javob strukturasi.";
                console.warn(warnMsg, data);
                setNotes([]); setTotalItems(0); setTotalPages(1);
                if (showToast) showToast(warnMsg, "warning");
            }
        } catch (err) {
            const errorMessage = err.message || 'Eslatmalarni yuklashda noma\'lum xatolik yuz berdi.';
            setListError(errorMessage);
            if (showToast) showToast(`Eslatmalarni yuklab bo'lmadi: ${errorMessage}`, "error");
            setNotes([]); setTotalItems(0); setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [token, currentPage, filters, sort, dateFilterType, showToast]);

    const debouncedFetchNotes = useCallback((newFilters) => {
        if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
        filterTimeoutRef.current = setTimeout(() => {
            setCurrentPage(1);
            fetchNotes(newFilters, 1, sort, dateFilterType);
        }, DEBOUNCE_DELAY);
    }, [fetchNotes, sort, dateFilterType]); 

    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        debouncedFetchNotes(newFilters);
    }, [filters, debouncedFetchNotes]);

    const handleDateFilterChange = useCallback((type) => {
        setDateFilterType(type);
        setCurrentPage(1); 
    }, []);

    useEffect(() => {
        fetchNotes(filters, currentPage, sort, dateFilterType);
        return () => {
            if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
        };
    }, [currentPage, sort, dateFilterType, fetchNotes]);

    useEffect(() => {
        fetchTodayNoteCount(); 
    }, [fetchTodayNoteCount]);

    const handleSort = useCallback((column) => {
        const sortColumn = column === 'displayTime' ? 'callDate' : column;
        const newSortOrder = sort.sortBy === sortColumn && sort.sortOrder === 'asc' ? 'desc' : 'asc';
        setSort({ sortBy: sortColumn, sortOrder: newSortOrder });
        setCurrentPage(1);
    }, [sort]);

    const handlePageChange = useCallback((page) => {
        setCurrentPage(page); 
    }, []);

    const openModal = useCallback((note = null) => {
        setEditingNote(note);
        setIsModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingNote(null);
    }, []);

    const handleFormSubmit = useCallback(async (result) => {
        closeModal();
        const pageToFetch = editingNote ? currentPage : 1;
        if (!editingNote) setCurrentPage(1);

        await fetchNotes(filters, pageToFetch, sort, dateFilterType);
        fetchTodayNoteCount(); 
        if (refreshTodaysNotesForNotifications) {
            refreshTodaysNotesForNotifications();
        }
    }, [closeModal, editingNote, currentPage, filters, sort, dateFilterType, fetchNotes, fetchTodayNoteCount, refreshTodaysNotesForNotifications]);

    const openConfirmModal = useCallback((noteId) => {
        setDeletingNoteId(noteId);
        setIsConfirmModalOpen(true);
    }, []);

    const closeConfirmModal = useCallback(() => {
        setDeletingNoteId(null);
        setIsConfirmModalOpen(false);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!deletingNoteId) return;
        try {
            await apiRequest(`/notes/${deletingNoteId}`, 'DELETE', null, token);
            if (showToast) showToast("Eslatma muvaffaqiyatli o'chirildi!", "success");
            closeConfirmModal();

            const newCurrentPage = (notes.length === 1 && currentPage > 1) ? currentPage - 1 : currentPage;
            if (newCurrentPage !== currentPage) {
                 setCurrentPage(newCurrentPage);
            } else {
                 await fetchNotes(filters, newCurrentPage, sort, dateFilterType); 
            }
            
            fetchTodayNoteCount();
            if (refreshTodaysNotesForNotifications) {
                refreshTodaysNotesForNotifications();
            }
        } catch (err) {
            const errorMsg = err.message || "Eslatmani o'chirib bo'lmadi.";
            if (showToast) showToast(errorMsg, "error");
            console.error("Delete error:", err.originalError || err);
            closeConfirmModal();
        }
    }, [deletingNoteId, token, showToast, closeConfirmModal, notes.length, currentPage, fetchNotes, filters, sort, dateFilterType, fetchTodayNoteCount, refreshTodaysNotesForNotifications]);

    const getFilterButtonStyle = (type) => {
        return dateFilterType === type
            ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 ring-offset-1 shadow-md'
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 shadow-sm';
    };

    return (
        <div className="bg-gray-100 p-4 sm:p-6 rounded-xl shadow-xl min-h-screen">
            <div className="bg-white p-5 sm:p-6 rounded-lg shadow-lg mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-gray-200 gap-4">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                        <Notebook size={28} className="mr-3 text-indigo-600" /> Eslatmalar Ro'yxati
                    </h2>
                    <button
                        onClick={() => openModal()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-lg inline-flex items-center transition duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        <Notebook size={18} className="mr-2" /> Yangi Eslatma
                    </button>
                </div>

                {listError && <ErrorMessage message={listError} onClose={() => setListError(null)} />}

                <div className="mb-5 flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-medium text-gray-600 mr-2">Sana bo'yicha:</span>
                    <button onClick={() => handleDateFilterChange('all')} className={`px-3.5 py-1.5 text-sm rounded-md flex items-center transition-colors duration-150 ${getFilterButtonStyle('all')}`}> <ListFilter size={16} className="mr-1.5" /> Hammasi </button>
                    <button onClick={() => handleDateFilterChange('today')} className={`relative px-3.5 py-1.5 text-sm rounded-md flex items-center transition-colors duration-150 ${getFilterButtonStyle('today')}`}>
                        <CalendarDays size={16} className="mr-1.5" /> Bugun
                        {todayNoteCount > 0 && (
                            <span className="absolute -top-2 -right-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                                {todayNoteCount}
                            </span>
                        )}
                    </button>
                    <button onClick={() => handleDateFilterChange('past')} className={`px-3.5 py-1.5 text-sm rounded-md flex items-center transition-colors duration-150 ${getFilterButtonStyle('past')}`}> <CalendarClock size={16} className="mr-1.5" /> O'tganlar </button>
                    <button onClick={() => handleDateFilterChange('future')} className={`px-3.5 py-1.5 text-sm rounded-md flex items-center transition-colors duration-150 ${getFilterButtonStyle('future')}`}> <CalendarCheck size={16} className="mr-1.5" /> Kelajakdagilar </button>
                </div>

                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" name="filterByFullName" placeholder="Ism yoki Familiya bo'yicha..." value={filters.filterByFullName} onChange={handleFilterChange} className="px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150" aria-label="Ism bo'yicha filter" />
                    <input type="text" name="filterByPhone" placeholder="Telefon raqami bo'yicha..." value={filters.filterByPhone} onChange={handleFilterChange} className="px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150" aria-label="Telefon bo'yicha filter" />
                </div>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-lg shadow-lg">
                {loading && notes.length === 0 && <div className="py-10 text-center"><LoadingSpinner message="Eslatmalar yuklanmoqda..." /></div>}
                
                {!loading && !listError && notes.length === 0 && (
                     <div className="py-12 text-center text-gray-500">
                         <Notebook size={48} className="mx-auto mb-4 text-gray-400" />
                         <p className="text-lg font-medium">Hozircha eslatmalar mavjud emas.</p>
                         <p className="text-sm">Filterlarni o'zgartirib ko'ring yoki yangi eslatma qo'shing.</p>
                     </div>
                )}

                {!loading && listError && notes.length === 0 && ( // Show specific error if list is empty due to error
                     <div className="text-center py-10 text-red-500">
                         <p>Ma'lumotlarni yuklashda xatolik yuz berdi.</p>
                         <p className="text-sm">{listError}</p>
                     </div>
                )}


                {notes.length > 0 && (
                    <>
                        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm mb-6">
                            <table className="min-w-full bg-white divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('fullName')}>To'liq Ism <SortIcon column="fullName" currentSort={sort} /></th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Telefon</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('callDate')}>Aloqa Sanasi <SortIcon column="callDate" currentSort={sort} /></th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('displayTime')}>Vaqti <SortIcon column="displayTime" currentSort={sort} /></th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Qo'shimcha</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('createdAt')}>Yaratilgan <SortIcon column="createdAt" currentSort={sort} /></th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amallar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {notes.map((note) => (
                                        <NoteRow key={note.id} note={note} onEdit={openModal} onDelete={openConfirmModal} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                                totalItems={totalItems}
                                itemsPerPage={DEFAULT_LIMIT}
                            />
                        )}
                    </>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingNote ? "Eslatmani Tahrirlash" : "Yangi Eslatma Qo'shish"} size="large">
                {isModalOpen && ( 
                    <NoteForm
                        token={token}
                        initialData={editingNote}
                        onFormSubmit={handleFormSubmit}
                        onCancel={closeModal}
                        showToast={showToast}
                    />
                )}
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={closeConfirmModal}
                onConfirm={handleDeleteConfirm}
                title="O'chirishni tasdiqlash"
                message="Haqiqatan ham ushbu eslatmani o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi."
                confirmText="O'chirish"
                cancelText="Bekor qilish"
                confirmButtonVariant="danger"
            />
        </div>
    );
};

export default NoteList;