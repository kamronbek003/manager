import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { BookUser, UserPlus, Trash2, Edit, ArrowUpDown, Users } from 'lucide-react'; 
import { apiRequest } from '../../utils/api'; 
import { formatDDMMYYYY } from '../../utils/helpers';
import LoadingSpinner from '../Essential/LoadingSpinner';
import ErrorMessage from '../Essential/ErrorMessage';
import Pagination from '../Essential/Pagination';
import Modal from '../Essential/Modal';
import ConfirmationModal from '../Essential/ConfirmationModal';
import TeacherForm from './TeacherForm'; 

const DEFAULT_LIMIT = 15;
const DEBOUNCE_DELAY = 300; 

const TeacherRow = React.memo(({ teacher, onEdit, onDelete }) => {
    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">{teacher.firstName}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{teacher.lastName}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{teacher.phone}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{teacher.subject || '-'}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{teacher.experience} yil</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDDMMYYYY(teacher.startedAt)}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDDMMYYYY(teacher.dateBirth)}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-3">
                <button onClick={() => onEdit(teacher)} className="text-indigo-600 hover:text-indigo-800 transition-colors" title="Tahrirlash">
                    <Edit size={18} />
                </button>
                <button onClick={() => onDelete(teacher.id)} className="text-red-600 hover:text-red-800 transition-colors" title="O'chirish">
                    <Trash2 size={18} />
                </button>
            </td>
        </tr>
    );
});

const SortIcon = React.memo(({ column, currentSort }) => (
    <ArrowUpDown
        size={14}
        className={`ml-1 inline-block transition-opacity ${currentSort.sortBy === column ? 'opacity-100 text-blue-600' : 'opacity-30 group-hover:opacity-70'}`}
        aria-hidden="true"
    />
));

const TeacherList = ({ token, showToast }) => { 
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState(null); 
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [filters, setFilters] = useState({ filterByName: '', filterByPhone: '', filterBySubject: '' });
    const [sort, setSort] = useState({ sortBy: 'createdAt', sortOrder: 'desc' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [deletingTeacherId, setDeletingTeacherId] = useState(null);
    const filterTimeoutRef = useRef(null); 

    const fetchTeachers = useCallback(async (filtersToUse = filters, pageToUse = currentPage, sortToUse = sort) => {
        setLoading(true);
        setListError(null); 
        try {
            const queryParams = new URLSearchParams({
                page: pageToUse.toString(),
                limit: DEFAULT_LIMIT.toString(),
                sortBy: sortToUse.sortBy,
                sortOrder: sortToUse.sortOrder,
            });
            Object.entries(filtersToUse).forEach(([key, value]) => {
                if (value) {
                    queryParams.append(key, value);
                }
            });

            const data = await apiRequest(`/teachers?${queryParams.toString()}`, 'GET', null, token);

            if (data && Array.isArray(data.data)) {
                setTeachers(data.data);
                setTotalItems(data.total || 0);
                setTotalPages(Math.ceil((data.total || 0) / DEFAULT_LIMIT));
            } else {
                console.warn("O'qituvchilar uchun kutilmagan javob strukturasi:", data);
                setTeachers([]); setTotalItems(0); setTotalPages(1);
                if (showToast) showToast("O'qituvchilar ma'lumotlari formatida xatolik.", "warning");
            }
        } catch (err) {
            console.error("O'qituvchilarni yuklashda XATOLIK:", err);
            const errorMessage = err.message || "O'qituvchilarni yuklashda noma'lum xatolik yuz berdi.";
            if (showToast) showToast(`O'qituvchilarni yuklab bo'lmadi: ${errorMessage}`, "error");
            setListError(errorMessage); 
            setTeachers([]); setTotalItems(0); setTotalPages(1); 
        } finally {
            setLoading(false);
        }
    }, [token, currentPage, filters, sort, showToast]); 

    const debouncedFetchTeachers = useCallback((newFilters) => {
        if (filterTimeoutRef.current) {
            clearTimeout(filterTimeoutRef.current);
        }
        filterTimeoutRef.current = setTimeout(() => {
            fetchTeachers(newFilters, 1, sort); 
        }, DEBOUNCE_DELAY);
    }, [fetchTeachers, sort]); 

    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        setCurrentPage(1); 
        debouncedFetchTeachers(newFilters); 
    }, [filters, debouncedFetchTeachers]); 

    useEffect(() => {
        fetchTeachers(filters, currentPage, sort); 
        return () => { 
            if (filterTimeoutRef.current) {
                clearTimeout(filterTimeoutRef.current);
            }
        };
    }, [currentPage, sort, fetchTeachers, filters]);

    const handleSort = useCallback((column) => {
        const newSortOrder = sort.sortBy === column && sort.sortOrder === 'asc' ? 'desc' : 'asc';
        setSort({ sortBy: column, sortOrder: newSortOrder });
        setCurrentPage(1); 
    }, [sort]); 

    const handlePageChange = useCallback((page) => {
        setCurrentPage(page);
    }, []); 

    const openModal = useCallback((teacher = null) => {
        setEditingTeacher(teacher); 
        setIsModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingTeacher(null);
    }, []);

    const handleFormSubmit = useCallback(() => {
    const isEditing = !!editingTeacher;
    closeModal(); 
    if (isEditing) {
        fetchTeachers(filters, currentPage, sort);
    } else {
        if (currentPage === 1) {
            fetchTeachers(filters, 1, sort);
        } else {
            setCurrentPage(1);
        }
    }
}, [
    editingTeacher, 
    closeModal, 
    fetchTeachers, 
    filters, 
    currentPage, 
    sort
]);

    const openConfirmModal = useCallback((teacherId) => {
        setDeletingTeacherId(teacherId);
        setIsConfirmModalOpen(true);
    }, []);

    const closeConfirmModal = useCallback(() => {
        setDeletingTeacherId(null);
        setIsConfirmModalOpen(false);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!deletingTeacherId) return;
        try {
            await apiRequest(`/teachers/${deletingTeacherId}`, 'DELETE', null, token);
            if (showToast) showToast("O'qituvchi muvaffaqiyatli o'chirildi!", "success");
            closeConfirmModal();
            if (teachers.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1);
            } else {
                fetchTeachers(filters, currentPage, sort);
            }
        } catch (err) {
            console.error("Delete error:", err.originalError || err);
            let deleteErrorMsg = "O'qituvchini o'chirib bo'lmadi.";
            if (err.message?.includes('Cannot delete') || err.message?.includes('associated with existing groups') || err.originalError?.message?.includes('foreign key constraint')) {
                deleteErrorMsg = "O'qituvchini o'chirib bo'lmadi. Unga biriktirilgan guruhlar mavjud bo'lishi mumkin.";
            } else if (err.statusCode === 404) {
                deleteErrorMsg = "O'qituvchi topilmadi (o'chirish uchun).";
            } else if (err.message) {
                deleteErrorMsg = err.message;
            }
            if (showToast) showToast(deleteErrorMsg, "error");
            closeConfirmModal(); 
        }
    }, [deletingTeacherId, token, closeConfirmModal, teachers.length, currentPage, fetchTeachers, filters, sort, showToast]); 

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-xl m-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b border-gray-200 gap-4">
                <h2 className="text-xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                    <BookUser size={36} className="mr-3 text-indigo-600"/> O'qituvchilar Ro'yxati
                </h2>
                <button
                    onClick={() => openModal()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-lg inline-flex items-center transition duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    <UserPlus size={20} className="mr-2.5" /> Yangi O'qituvchi
                </button>
            </div>

            {listError && !showToast && <ErrorMessage message={listError} onClose={() => setListError(null)} />}

            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <input type="text" name="filterByName" placeholder="Ism/Familiya bo'yicha..." value={filters.filterByName} onChange={handleFilterChange} className="px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
                <input type="text" name="filterByPhone" placeholder="Telefon bo'yicha..." value={filters.filterByPhone} onChange={handleFilterChange} className="px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
                <input type="text" name="filterBySubject" placeholder="Fan bo'yicha..." value={filters.filterBySubject} onChange={handleFilterChange} className="px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
            </div>

            {loading && !listError && teachers.length === 0 && (
                <div className="py-12 text-center">
                    <LoadingSpinner message="O'qituvchilar ro'yxati yuklanmoqda..." />
                </div>
            )}
            
            {!loading && teachers.length === 0 && !listError && (
                 <div className="py-12 text-center text-gray-500">
                    <Users size={48} className="mx-auto mb-3 text-gray-400" />
                    <p className="text-lg font-medium">Hozircha o'qituvchilar mavjud emas.</p>
                    <p className="text-sm">Yangi o'qituvchi qo'shing.</p>
                </div>
            )}


            {teachers.length > 0 && (
                <>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-md mb-6">
                        <table className="min-w-full bg-white divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('firstName')}>Ism <SortIcon column="firstName" currentSort={sort} /></th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('lastName')}>Familiya <SortIcon column="lastName" currentSort={sort} /></th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Telefon</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('subject')}>Fan <SortIcon column="subject" currentSort={sort} /></th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('experience')}>Tajriba <SortIcon column="experience" currentSort={sort} /></th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('startedAt')}>Ishga kirgan sana <SortIcon column="startedAt" currentSort={sort} /></th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tug'ilgan sana</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amallar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {teachers.map((teacher) => (
                                    <TeacherRow key={teacher.id} teacher={teacher} onEdit={openModal} onDelete={openConfirmModal} />
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

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingTeacher ? "O'qituvchini Tahrirlash" : "Yangi O'qituvchi Qo'shish"}>
                {isModalOpen && (
                     <TeacherForm
                        token={token}
                        initialData={editingTeacher}
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
                message="Haqiqatan ham ushbu o'qituvchini o'chirmoqchimisiz? Bu amalni orqaga qaytarib bo'lmaydi."
                confirmButtonText="O'chirish"
                cancelButtonText="Bekor qilish"
            />
        </div>
    );
};

export default TeacherList;
