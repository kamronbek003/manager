import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Users, PlusCircle, Trash2, Edit, ArrowUpDown, Group } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import LoadingSpinner from '../Essential/LoadingSpinner';
import ErrorMessage from '../Essential/ErrorMessage';
import Pagination from '../Essential/Pagination';
import Modal from '../Essential/Modal';
import ConfirmationModal from '../Essential/ConfirmationModal';
import GroupForm from './GroupForm';

const DEFAULT_LIMIT = 15;
const DEBOUNCE_DELAY = 300;

// `group.name` ustuni qo'shilgan GroupRow komponenti
const GroupRow = React.memo(({ group, onEdit, onDelete, teacherMap }) => {
    const teacherName = group.teacherId ? teacherMap[group.teacherId] : null;

    return (
        <tr className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-900 font-medium">{group.groupId}</td>
            {/* YANGI QO'SHILGAN USTUN */}
            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-800 font-medium">{group.name || '-'}</td>
            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">{group.darsJadvali || '-'}</td>
            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">{group.darsVaqt || '-'}</td>
            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-600">
                {teacherName || <span className="text-gray-400 italic">Biriktirilmagan</span>}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-sm">
                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                    group.status === 'FAOL' ? 'bg-green-100 text-green-800'
                    : group.status === 'NOFAOL' ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                    {group.status.toLowerCase()}
                </span>
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-600">
                {group.coursePrice != null ? group.coursePrice.toLocaleString('uz-UZ') + " so'm" : 'N/A'}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium space-x-3.5">
                <button
                    onClick={() => onEdit(group)}
                    className="text-indigo-600 hover:text-indigo-800 transition-colors"
                    title="Tahrirlash"
                >
                    <Edit size={18} />
                </button>
                <button
                    onClick={() => onDelete(group.id)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    title="O'chirish"
                >
                    <Trash2 size={18} />
                </button>
            </td>
        </tr>
    );
});

const SortIcon = React.memo(({ column, currentSort }) => (
    <ArrowUpDown
        size={15}
        className={`ml-1.5 inline-block transition-opacity ${
            currentSort.sortBy === column ? 'opacity-100 text-indigo-600' : 'opacity-30 group-hover:opacity-80'
        }`}
        aria-hidden="true"
    />
));


const GroupList = ({ token, showToast }) => {
    const [groups, setGroups] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [teachersLoading, setTeachersLoading] = useState(false);
    const [listError, setListError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    // YANGILANGAN FILTRLAR
    const [filters, setFilters] = useState({
        filterByGroupId: '',
        filterByName: '',
        filterByStatus: '',
        filterByTeacherId: '',
    });
    const [sort, setSort] = useState({ sortBy: 'createdAt', sortOrder: 'desc' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [deletingGroupId, setDeletingGroupId] = useState(null);
    const filterTimeoutRef = useRef(null);

    const fetchTeachers = useCallback(async () => {
        if (teachers.length === 0 && !teachersLoading) {
            setTeachersLoading(true);
            try {
                const data = await apiRequest('/teachers?limit=100&sortBy=firstName&sortOrder=asc', 'GET', null, token);
                if (data && Array.isArray(data.data)) {
                    setTeachers(data.data);
                } else {
                    console.warn("[GroupList] fetchTeachers: O'qituvchilar uchun noto'g'ri ma'lumot strukturasi.");
                    setTeachers([]);
                    if (showToast) showToast("O'qituvchilar ro'yxatini yuklashda xatolik yuz berdi.", "warning");
                }
            } catch (err) {
                console.error("[GroupList] fetchTeachers: O'qituvchilarni yuklashda XATOLIK:", err);
                setTeachers([]);
                if (showToast) showToast("O'qituvchilarni ro'yxatini yuklab bo'lmadi. Iltimos, keyinroq urinib ko'ring.", "error");
            } finally {
                setTeachersLoading(false);
            }
        }
    }, [token, teachers.length, teachersLoading, showToast]);

    const fetchGroups = useCallback(async (filtersToUse = filters, pageToUse = currentPage, sortToUse = sort) => {
        setLoading(true);
        setListError(null);
        try {
            const queryParams = new URLSearchParams({
                page: pageToUse.toString(),
                limit: DEFAULT_LIMIT.toString(),
                sortBy: sortToUse.sortBy,
                sortOrder: sortToUse.sortOrder
            });
            Object.entries(filtersToUse).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
            });

            const data = await apiRequest(`/groups?${queryParams.toString()}`, 'GET', null, token);

            if (data && Array.isArray(data.data)) {
                setGroups(data.data);
                setTotalItems(data.total || 0);
                setTotalPages(Math.ceil((data.total || 0) / DEFAULT_LIMIT));
            } else {
                console.warn("[GroupList] fetchGroups: Guruhlar uchun noto'g'ri ma'lumot strukturasi.");
                setGroups([]); setTotalItems(0); setTotalPages(1);
                if (showToast) showToast("Guruh ma'lumotlarining formati serverdan noto'g'ri keldi.", "warning");
            }
        } catch (err) {
            console.error("[GroupList] fetchGroups: Guruhlarni yuklashda XATOLIK:", err);
            let userError = err.message || 'Guruhlarni yuklashda noma\'lum xatolik yuz berdi.';
            if (err.originalError?.response?.data?.message) {
                userError = Array.isArray(err.originalError.response.data.message)
                    ? err.originalError.response.data.message.join(', ')
                    : err.originalError.response.data.message;
            }
            if (showToast) showToast(`Guruhlarni yuklab bo'lmadi: ${userError}`, "error");
            setListError(userError);
            setGroups([]); setTotalItems(0); setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [token, currentPage, filters, sort, showToast]);

    const debouncedFetchGroups = useCallback((newFilters) => {
        if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
        filterTimeoutRef.current = setTimeout(() => {
            setCurrentPage(1);
            fetchGroups(newFilters, 1, sort);
        }, DEBOUNCE_DELAY);
    }, [fetchGroups, sort]);

    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        debouncedFetchGroups(newFilters);
    }, [filters, debouncedFetchGroups]);

    useEffect(() => {
        fetchGroups(filters, currentPage, sort);
        if (teachers.length === 0) {
            fetchTeachers();
        }
        return () => {
            if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
        };
    }, [currentPage, sort, token]); // Removed dependencies that are stable or cause re-fetches handled elsewhere

    const teacherMap = useMemo(() => {
        if (!teachers || teachers.length === 0) return {};
        return teachers.reduce((map, teacher) => {
            map[teacher.id] = `${teacher.firstName} ${teacher.lastName}`;
            return map;
        }, {});
    }, [teachers]);

    const handleSort = useCallback((column) => {
        const newSortOrder = sort.sortBy === column && sort.sortOrder === 'asc' ? 'desc' : 'asc';
        setSort({ sortBy: column, sortOrder: newSortOrder });
    }, [sort]);

    const handlePageChange = useCallback((page) => {
        setCurrentPage(page);
    }, []);

    const openModal = useCallback((group = null) => {
        setEditingGroup(group);
        setListError(null);
        if (teachers.length === 0 && !teachersLoading) {
            fetchTeachers();
        }
        setIsModalOpen(true);
    }, [teachers.length, fetchTeachers, teachersLoading]);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingGroup(null);
    }, []);

    const handleFormSubmitCallback = useCallback(() => {
        closeModal();
        const pageToFetch = editingGroup ? currentPage : 1;
        if (!editingGroup) setCurrentPage(1);
        fetchGroups(filters, pageToFetch, sort);
    }, [closeModal, fetchGroups, filters, editingGroup, currentPage, sort]);

    const openConfirmModal = useCallback((groupId) => {
        setDeletingGroupId(groupId);
        setIsConfirmModalOpen(true);
    }, []);

    const closeConfirmModal = useCallback(() => {
        setDeletingGroupId(null);
        setIsConfirmModalOpen(false);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!deletingGroupId) return;
        try {
            await apiRequest(`/groups/${deletingGroupId}`, 'DELETE', null, token);
            if (showToast) showToast("Guruh muvaffaqiyatli o'chirildi!", "success");

            closeConfirmModal();
            if (groups.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1);
            } else {
                fetchGroups(filters, currentPage, sort);
            }
        } catch (err) {
            console.error("[GroupList] handleDeleteConfirm: Guruhni o'chirishda XATOLIK:", err);
            let deleteErrorMsg = "Guruhni o'chirib bo'lmadi.";
            if (err.message?.includes('Cannot delete') || err.message?.includes('foreign key constraint')) {
                deleteErrorMsg = "Guruhni o'chirib bo'lmadi. Unga bog'liq ma'lumotlar mavjud bo'lishi mumkin.";
            } else if (err.message) {
                deleteErrorMsg = err.message;
            }
            if (showToast) showToast(deleteErrorMsg, "error");
            else setListError(deleteErrorMsg);
            closeConfirmModal();
        }
    }, [deletingGroupId, token, closeConfirmModal, groups.length, currentPage, fetchGroups, filters, sort, showToast]);

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-xl m-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b border-gray-200 gap-4">
                <h2 className="text-xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                    <Group size={30} className="mr-3 text-indigo-600" /> Guruhlar Ro'yxati
                </h2>
                <button
                    onClick={() => openModal()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-lg inline-flex items-center transition duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    <PlusCircle size={20} className="mr-2.5" /> Yangi Guruh
                </button>
            </div>

            {listError && <ErrorMessage message={listError} onClose={() => setListError(null)} type="error" />}

            {/* YANGILANGAN FILTRLAR BLOKI */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 items-end">
                <input
                    type="text"
                    name="filterByGroupId"
                    placeholder="Guruh ID bo'yicha"
                    value={filters.filterByGroupId}
                    onChange={handleFilterChange}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <input
                    type="text"
                    name="filterByName"
                    placeholder="Guruh darajasi bo'yicha"
                    value={filters.filterByName}
                    onChange={handleFilterChange}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <select
                    name="filterByTeacherId"
                    value={filters.filterByTeacherId}
                    onChange={handleFilterChange}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    disabled={teachersLoading}
                >
                    <option value="">O'qituvchi bo'yicha (barchasi)</option>
                    {teachersLoading ? (
                        <option value="" disabled>Yuklanmoqda...</option>
                    ) : (
                        teachers.map(teacher => (
                            <option key={teacher.id} value={teacher.id}>
                                {teacher.firstName} {teacher.lastName}
                            </option>
                        ))
                    )}
                </select>
                <select
                    name="filterByStatus"
                    value={filters.filterByStatus}
                    onChange={handleFilterChange}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                    <option value="">Status bo'yicha (barchasi)</option>
                    <option value="FAOL">Faol</option>
                    <option value="NOFAOL">Nofaol</option>
                    <option value="TUGATGAN">Tugatgan</option>
                </select>
            </div>

            {loading && !listError && groups.length === 0 && (
                <div className="py-12 text-center">
                    <LoadingSpinner message="Guruhlar ro'yxati yuklanmoqda..." />
                </div>
            )}

            {!loading && groups.length === 0 && !listError && (
                 <div className="py-12 text-center text-gray-500">
                     <Users size={48} className="mx-auto mb-3 text-gray-400" />
                     <p className="text-lg font-medium">Hozircha guruhlar mavjud emas.</p>
                     <p className="text-sm">Filterlarni o'zgartirib ko'ring yoki yangi guruh qo'shing.</p>
                 </div>
            )}

            {groups.length > 0 && (
                <>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-md mb-6">
                        <table className="min-w-full bg-white divide-y divide-gray-200">
                            {/* YANGILANGAN JADVAL SARLAVHASI */}
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('groupId')}>Guruh ID <SortIcon column="groupId" currentSort={sort} /></th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('name')}>Guruh Darajasi <SortIcon column="name" currentSort={sort} /></th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Dars Jadvali</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Dars Vaqti</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('teacherId')}>O'qituvchi <SortIcon column="teacherId" currentSort={sort} /></th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('status')}>Status <SortIcon column="status" currentSort={sort} /></th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('coursePrice')}>Kurs Narxi <SortIcon column="coursePrice" currentSort={sort} /></th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amallar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {groups.map((group) => (
                                    <GroupRow
                                        key={group.id}
                                        group={group}
                                        onEdit={openModal}
                                        onDelete={openConfirmModal}
                                        teacherMap={teacherMap}
                                    />
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

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingGroup ? "Guruhni Tahrirlash" : "Yangi Guruh Qo'shish"}>
                {teachersLoading && !teachers.length ? (
                    <div className="py-10"><LoadingSpinner message="O'qituvchilar ro'yxati yuklanmoqda..." /></div>
                ) : (
                    <GroupForm
                        token={token}
                        initialData={editingGroup}
                        teachers={teachers}
                        onFormSubmit={handleFormSubmitCallback}
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
                message="Haqiqatan ham ushbu guruhni o'chirmoqchimisiz? Bu amalni orqaga qaytarib bo'lmaydi."
                confirmButtonText="O'chirish"
                cancelButtonText="Bekor qilish"
            />
        </div>
    );
};

export default GroupList;