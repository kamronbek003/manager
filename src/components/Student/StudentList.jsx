import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Users, UserPlus, Trash2, Edit, ArrowUpDown, Eye, DollarSign, User, XCircle, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { apiRequest } from '../../utils/api';
import { formatDDMMYYYY } from '../../utils/helpers';
import LoadingSpinner from '../Essential/LoadingSpinner';
import ErrorMessage from '../Essential/ErrorMessage';
import Pagination from '../Essential/Pagination';
import Modal from '../Essential/Modal';
import ConfirmationModal from '../Essential/ConfirmationModal';
import StudentForm from './StudentForm';

const DEFAULT_LIMIT = 15;
const DEBOUNCE_DELAY = 300;

// --- StudentDetailsModal Komponenti ---
const StudentDetailsModal = ({ student, groups, onClose, onEdit }) => {
    const groupMap = useMemo(() => {
        if (!groups || groups.length === 0) return {};
        return groups.reduce((acc, group) => {
            acc[group.id] = group.name || group.groupId || `ID: ${group.id}`;
            return acc;
        }, {});
    }, [groups]);

    const formatDateTime = (date) => {
        if (!date) return 'Ma\'lumot yo\'q';
        try {
            if (typeof date === 'string' && date.match(/^\d{2}-\d{2}-\d{4}$/)) {
                const [day, month, year] = date.split('-');
                return new Date(`${year}-${month}-${day}`).toLocaleString('uz-UZ', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
            }
            return new Date(date).toLocaleString('uz-UZ', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return 'Noto\'g\'ri sana formati';
        }
    };

    const groupDisplayNames = student?.groups?.length > 0
        ? student.groups.map(group => groupMap[group.id] || 'Noma\'lum guruh').join(', ')
        : 'Guruh yo\'q';

    const paymentHistory = useMemo(() => {
        if (!student?.payments || !Array.isArray(student.payments)) return [];
        return student.payments.map(payment => ({
            date: payment.date || payment.createdAt || null,
            amount: payment.summa || 0,
            note: `To'lov turi: ${payment.paymentType || 'Noma\'lum'}${payment.comment ? `. Izoh: ${payment.comment}` : ''}`, // Izohni ham qo'shdik
        }));
    }, [student?.payments]);

    const debtAmount = student?.debtAmount || 0;
    const isDebtor = debtAmount > 0;
    return (
        <div className="p-6 sm:p-8 bg-gradient-to-br from-gray-50 to-gray-100 max-h-[70vh] overflow-y-auto rounded-2xl">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 flex items-center">
                    <User className="w-8 h-8 mr-3 text-indigo-600" />
                    Talaba ma'lumotlari
                </h2>
                <button
                    onClick={() => onEdit(student)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg inline-flex items-center transition duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    title="Talabani tahrirlash"
                >
                    <Edit size={18} className="mr-2" />
                    Tahrirlash
                </button>
            </div>

            {/* Shaxsiy ma'lumotlar */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mb-6 transition-all duration-200 hover:shadow-xl">
                <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center">
                    <User className="w-6 h-6 mr-2 text-indigo-500" />
                    Shaxsiy ma'lumotlar
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <span className="text-sm font-medium text-gray-500">Talaba ID</span>
                        <p className="mt-1.5 text-base text-gray-900 font-semibold">{student?.studentId || 'Yo\'q'}</p>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-500">Ism</span>
                        <p className="mt-1.5 text-base text-gray-900 font-semibold">{student?.firstName || 'Yo\'q'}</p>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-500">Familiya</span>
                        <p className="mt-1.5 text-base text-gray-900 font-semibold">{student?.lastName || 'Yo\'q'}</p>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-500">Telefon</span>
                        <p className="mt-1.5 text-base text-gray-900">{student?.phone || 'Yo\'q'}</p>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-500">Tug'ilgan sana</span>
                        <p className="mt-1.5 text-base text-gray-900">{formatDDMMYYYY(student?.dateBirth) || 'Yo\'q'}</p>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-500">Ota-ona telefoni</span>
                        <p className="mt-1.5 text-base text-gray-900">{student?.parentPhone || 'Yo\'q'}</p>
                    </div>
                    <div className="sm:col-span-2">
                        <span className="text-sm font-medium text-gray-500">Manzil</span>
                        <p className="mt-1.5 text-base text-gray-900">{student?.address || 'Yo\'q'}</p>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-500">Status</span>
                        <p className="mt-1.5">
                            <span
                                className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full capitalize ${
                                    student?.status === 'FAOL'
                                        ? 'bg-green-100 text-green-700'
                                        : student?.status === 'NOFAOL'
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-red-100 text-red-700'
                                }`}
                            >
                                {student?.status?.toLowerCase() || 'Noma\'lum'}
                            </span>
                        </p>
                    </div>
                    {student?.status === 'NOFAOL' && student?.whyStop && (
                        <div>
                            <span className="text-sm font-medium text-gray-500">Ketish sababi</span>
                            <p className="mt-1.5 text-base text-gray-900">{student.whyStop}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Guruhlar va qo'shimcha ma'lumotlar */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mb-6 transition-all duration-200 hover:shadow-xl">
                <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center">
                    <Users className="w-6 h-6 mr-2 text-indigo-500" />
                    Guruhlar va ma'lumotlar
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <span className="text-sm font-medium text-gray-500">Guruhlar</span>
                        <p className="mt-1.5 text-base text-gray-900">{groupDisplayNames}</p>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-500">Chegirma foizi (%)</span>
                        <p className="mt-1.5 text-base text-gray-900">{student?.discountPercentage || student?.discount || 0}%</p>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-500">Qachon kelgan</span>
                        <p className="mt-1.5 text-base text-gray-900">{formatDateTime(student?.whenCome).split(" ")[0]}</p>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-500">Oilada boshqa o'quvchilar</span>
                        <p className="mt-1.5 text-base text-gray-900">{student?.hasFamilyMembers ? 'Ha' : 'Yo\'q'}</p>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-500">Qaysi maktab</span>
                        <p className="mt-1.5 text-base text-gray-900">{student?.whichSchool || 'Yo\'q'}</p>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-500">Qanday topdi</span>
                        <p className="mt-1.5 text-base text-gray-900">
                            {student?.howFind
                                ? {
                                    SOCIAL_MEDIA: 'Ijtimoiy tarmoqlar',
                                    FRIEND_REFERRAL: 'Do\'st tavsiyasi',
                                    ADVERTISEMENT: 'Reklama',
                                    OTHER: 'Boshqa',
                                }[student.howFind] || 'Noma\'lum'
                                : 'Yo\'q'}
                        </p>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-500">Ball</span>
                        <p className="mt-1.5 text-base text-gray-900">{student?.ball || 0}</p>
                    </div>
                </div>
            </div>

            {/* To'lov ma'lumotlari */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 transition-all duration-200 hover:shadow-xl">
                <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center">
                    <DollarSign className="w-6 h-6 mr-2 text-indigo-500" />
                    To'lov ma'lumotlari
                </h3>
                <div className="space-y-6">
                    {/* Qarzdorlik holati */}
                    {isDebtor ? (
                        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 font-medium">
                            <XCircle size={20} className="mr-3 text-red-600" />
                            <p>Talabada qarzdorlik bor: <span className="font-bold">{debtAmount.toLocaleString('uz-UZ')} so'm</span></p>
                        </div>
                    ) : (
                        <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 font-medium">
                            <FileText size={20} className="mr-3 text-green-600" />
                            <p>Talabada qarzdorlik mavjud emas.</p>
                        </div>
                    )}

                    <div>
                        <span className="text-sm font-medium text-gray-500">To'lov tarixi</span>
                        {paymentHistory.length > 0 ? (
                            <div className="mt-4 overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-indigo-50">
                                        <tr>
                                            <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                                                Sana
                                            </th>
                                            <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                                                Summa
                                            </th>
                                            <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                                                Izoh
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {paymentHistory.map((payment, index) => (
                                            <tr key={index} className="hover:bg-indigo-50/50 transition-colors duration-150">
                                                <td className="px-6 py-4 text-sm text-gray-900">{formatDateTime(payment.date)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                                    {payment.amount ? Number(payment.amount).toLocaleString('uz-UZ') : '0'} so'm
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900">{payment.note || 'Izoh yo\'q'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="mt-2 text-sm text-gray-500 italic">To'lov tarixi mavjud emas.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- StudentRow Komponenti ---
// `StudentRow` ga o'zgartirish kiritmadik, chunki qarzdorlikni jadvalda ko'rsatish
// foydalanuvchi tajribasini yomonlashtirishi mumkin (har bir qator uchun hisoblash).
// Uni faqat batafsil modalda ko'rsatish maqsadga muvofiq.
const StudentRow = React.memo(({ student, onEdit, onDelete, onView, groupMap }) => {
    const groupDisplayNames = student.groups && student.groups.length > 0
        ? student.groups.map(group => groupMap[group.id] || group.name || group.groupId || 'Noma\'lum guruh').join(', ')
        : null;

    return (
        <tr className="hover:bg-gray-50 transition-colors duration-150">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{student.studentId}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.firstName}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.lastName}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.phone}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span
                    className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                        student.status === 'FAOL' ? 'bg-green-100 text-green-800'
                        : student.status === 'NOFAOL' ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                >
                    {student.status ? student.status.toLowerCase() : 'noma\'lum'}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDDMMYYYY(student.dateBirth)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {groupDisplayNames || <span className="text-gray-400 italic">Yo'q</span>}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                <button onClick={() => onView(student.id)} className="text-blue-600 hover:text-blue-800 transition-colors" title="Ko'rish">
                    <Eye size={18} />
                </button>
                <button onClick={() => onEdit(student)} className="text-indigo-600 hover:text-indigo-800 transition-colors" title="Tahrirlash">
                    <Edit size={18} />
                </button>
                <button onClick={() => onDelete(student.id)} className="text-red-600 hover:text-red-800 transition-colors" title="O'chirish">
                    <Trash2 size={18} />
                </button>
            </td>
        </tr>
    );
});

const SortIcon = React.memo(({ column, currentSort }) => (
    <ArrowUpDown
        size={14}
        className={`ml-1 inline-block transition-opacity ${currentSort.sortBy === column ? 'opacity-100 text-indigo-600' : 'opacity-30 group-hover:opacity-70'}`}
        aria-hidden="true"
    />
));

// --- StudentList Asosiy Komponenti ---
const StudentList = ({ token, showToast }) => {
    const [students, setStudents] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [filters, setFilters] = useState({ filterByName: '', filterByPhone: '', filterByStudentId: '', filterByStatus: '', filterByGroupId: '' });
    const [sort, setSort] = useState({ sortBy: 'createdAt', sortOrder: 'desc' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [deletingStudentId, setDeletingStudentId] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingStudent, setViewingStudent] = useState(null);
    const filterTimeoutRef = useRef(null);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const [lastStudentId, setLastStudentId] = useState(null);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false); // Yangi state: PDF eksporti uchun

    const fetchGroupsIfNeeded = useCallback(async () => {
        if (groups.length === 0 && !groupsLoading) {
            setGroupsLoading(true);
            try {
                const data = await apiRequest('/groups?limit=500&sortBy=groupId&sortOrder=asc', 'GET', null, token);
                if (data && Array.isArray(data.data)) {
                    setGroups(data.data);
                } else {
                    console.error("[StudentList] fetchGroupsIfNeeded: Guruhlar uchun noto'g'ri ma'lumot strukturasi:", data);
                    if (showToast) showToast("Guruh ma'lumotlarini yuklashda xatolik (format).", "warning");
                    setGroups([]);
                }
            } catch (err) {
                console.error("[StudentList] fetchGroupsIfNeeded: Guruhlarni yuklashda XATOLIK:", err);
                if (showToast) showToast("Guruhlar ro'yxatini yuklab bo'lmadi.", "error");
                setGroups([]);
            } finally {
                setGroupsLoading(false);
            }
        }
    }, [token, groups.length, groupsLoading, showToast]);

    const fetchLastStudentId = useCallback(async () => {
        try {
            const data = await apiRequest('/students?limit=1&sortBy=studentId&sortOrder=desc', 'GET', null, token);
            if (data && data.data && data.data.length > 0) {
                setLastStudentId(data.data[0].studentId);
            } else {
                setLastStudentId(null);
            }
        } catch (error) {
            console.error("Failed to fetch last student ID", error);
            setLastStudentId(null);
        }
    }, [token]);

    const fetchStudentDetails = useCallback(async (studentId) => {
    // Modalni darhol ochib, yuklanish holatini ko'rsatish uchun state'lar
    setIsViewModalOpen(true);
    setViewingStudent(null); // Oldingi ma'lumotni tozalash
    setIsDetailsLoading(true); 

    try {
        // Yangi /debtors/:id endpoint'iga so'rov
        const data = await apiRequest(`/debtors/${studentId}`, 'GET', null, token);
        setViewingStudent(data);
    } catch (err) {
        // Agar xato kelsa, foydalanuvchiga bildirish
        console.error("Talaba detallarini yuklashda xato:", err);
        showToast("Talabaning moliyaviy ma'lumotlarini yuklab bo'lmadi.", "error");
        setIsViewModalOpen(false); // Xatolik bo'lsa, modalni yopish
    } finally {
        setIsDetailsLoading(false); // Yuklanishni to'xtatish
    }
}, [token, showToast]);

    const fetchStudents = useCallback(async (filtersToUse = filters, pageToUse = currentPage, sortToUse = sort) => {
        setLoading(true);
        setListError(null);
        try {
            const queryParams = new URLSearchParams({
                page: pageToUse.toString(),
                limit: DEFAULT_LIMIT.toString(),
                sortBy: sortToUse.sortBy,
                sortOrder: sortToUse.sortOrder,
                include: 'groups' // Include groups for the main list as well
            });
            Object.entries(filtersToUse).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
            });

            const data = await apiRequest(`/students?${queryParams.toString()}`, 'GET', null, token);
            if (data && Array.isArray(data.data)) {
                setStudents(data.data);
                setTotalItems(data.total || 0);
                setTotalPages(Math.ceil((data.total || 0) / DEFAULT_LIMIT));
            } else {
                console.warn("[StudentList] fetchStudents: Received invalid data structure for students.");
                setStudents([]);
                setTotalItems(0);
                setTotalPages(1);
                if (showToast) showToast("Talabalar ma'lumotlari formatida xatolik.", "warning");
            }
        } catch (err) {
            console.error("[StudentList] fetchStudents: Talabalarni yuklashda XATOLIK:", err);
            const errorMessage = err.message || 'Talabalarni yuklashda xatolik yuz berdi.';
            if (showToast) showToast(`Talabalarni yuklab bo'lmadi: ${errorMessage}`, "error");
            setStudents([]);
            setTotalItems(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [token, currentPage, filters, sort, showToast]);

    const groupMap = useMemo(() => {
        if (!groups || groups.length === 0) return {};
        return groups.reduce((acc, group) => {
            acc[group.id] = group.name || group.groupId || `ID: ${group.id.substring(0, 8)}`;
            return acc;
        }, {});
    }, [groups]);

    const debouncedFetchStudents = useCallback((newFilters, newSort = sort) => {
        if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
        filterTimeoutRef.current = setTimeout(() => {
            setCurrentPage(1);
            fetchStudents(newFilters, 1, newSort);
        }, DEBOUNCE_DELAY);
    }, [fetchStudents, sort]);

    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        // Important: Set loading true immediately to indicate activity while debouncing
        setLoading(true); 
        debouncedFetchStudents(newFilters, sort);
    }, [filters, debouncedFetchStudents, sort]);

    useEffect(() => {
        fetchStudents(filters, currentPage, sort);
        fetchGroupsIfNeeded();
        if (!editingStudent) {
            fetchLastStudentId();
        }
        return () => {
            if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
        };
    }, [currentPage, sort, token, fetchStudents, fetchGroupsIfNeeded, editingStudent, fetchLastStudentId, filters]);

    const handleSort = useCallback((column) => {
        const newSortOrder = sort.sortBy === column && sort.sortOrder === 'asc' ? 'desc' : 'asc';
        const newSort = { sortBy: column, sortOrder: newSortOrder };
        setSort(newSort);
        // Immediately trigger fetch with new sort, no debouncing for sorting
        setCurrentPage(1); 
        fetchStudents(filters, 1, newSort);
    }, [sort, fetchStudents, filters]);

    const handlePageChange = useCallback((page) => {
        setCurrentPage(page);
    }, []);

    const openModal = useCallback((student = null) => {
        setEditingStudent(student);
        setIsModalOpen(true);
        if (groups.length === 0) fetchGroupsIfNeeded();
        if (!student) {
            fetchLastStudentId();
        }
    }, [fetchGroupsIfNeeded, groups.length, fetchLastStudentId]);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingStudent(null);
    }, []);

    const handleFormSubmit = useCallback(() => {
        closeModal();
        const pageToFetch = editingStudent ? currentPage : 1;
        if (!editingStudent) setCurrentPage(1); // For new student, go to first page
        fetchStudents(filters, pageToFetch, sort);
    }, [closeModal, editingStudent, currentPage, fetchStudents, filters, sort]);

    const openConfirmModal = useCallback((studentId) => {
        setDeletingStudentId(studentId);
        setIsConfirmModalOpen(true);
    }, []);

    const closeConfirmModal = useCallback(() => {
        setDeletingStudentId(null);
        setIsConfirmModalOpen(false);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!deletingStudentId) return;
        try {
            await apiRequest(`/students/${deletingStudentId}`, 'DELETE', null, token);
            if (showToast) showToast("Talaba muvaffaqiyatli o'chirildi!", "success");
            closeConfirmModal();
            // If the last item on the current page is deleted, go back one page
            if (students.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1);
            } else {
                fetchStudents(filters, currentPage, sort);
            }
        } catch (err) {
            console.error("[StudentList] handleDeleteConfirm: Talabani o'chirishda XATOLIK:", err);
            let deleteErrorMsg = "Talabani o'chirib bo'lmadi.";
            if (err.message?.includes('foreign key constraint') || err.originalError?.message?.includes('foreign key constraint')) {
                deleteErrorMsg = "Talabani o'chirib bo'lmadi. Unga bog'liq boshqa yozuvlar mavjud.";
            } else if (err.statusCode === 404) {
                deleteErrorMsg = "Talaba topilmadi (o'chirish uchun).";
            } else if (err.message) {
                deleteErrorMsg = err.message;
            }
            if (showToast) showToast(deleteErrorMsg, "error");
            closeConfirmModal();
        }
    }, [deletingStudentId, token, closeConfirmModal, students.length, currentPage, fetchStudents, filters, sort, showToast]);

    const openViewModal = useCallback((studentId) => {
        fetchStudentDetails(studentId);
    }, [fetchStudentDetails]);

    const closeViewModal = useCallback(() => {
        setIsViewModalOpen(false);
        setViewingStudent(null);
    }, []);

    // PDF eksport funksiyasi
    const handleExportPDF = async () => {
        if (isExporting) return;
        setIsExporting(true);

        const queryParams = new URLSearchParams({
            page: '1',
            limit: totalItems > 0 ? totalItems.toString() : '1000', // Barcha talabalarni olish uchun limit
            sortBy: sort.sortBy,
            sortOrder: sort.sortOrder,
            include: 'groups,payments' // Guruhlar va to'lovlarni ham qo'shish
        });
        Object.entries(filters).forEach(([key, value]) => {
            if (value) queryParams.append(key, value);
        });

        let allStudents = [];
        try {
            const response = await apiRequest(`/students?${queryParams.toString()}`, 'GET', null, token);
            allStudents = response?.data || [];
        } catch (err) {
            showToast(`PDF uchun ma'lumotlarni yuklashda xatolik: ${err.message}`, 'error');
            setIsExporting(false);
            return;
        }

        if (allStudents.length === 0) {
            showToast("PDF uchun ma'lumotlar topilmadi.", "warning");
            setIsExporting(false);
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setProperties({ title: 'Talabalar Hisoboti' });

        let currentY = 20;

        doc.setFontSize(18);
        doc.text("Talabalar Bo'yicha To'liq Hisobot", 14, currentY);
        currentY += 10;

        const activeFilters = Object.entries(filters).filter(([, value]) => value)
            .map(([key, value]) => {
                switch (key) {
                    case 'filterByStudentId': return `Talaba ID: ${value}`;
                    case 'filterByName': return `Ism/Familiya: ${value}`;
                    case 'filterByPhone': return `Telefon: ${value}`;
                    case 'filterByStatus': return `Status: ${value}`;
                    case 'filterByGroupId': return `Guruh: ${groupMap[value] || value}`;
                    default: return '';
                }
            }).filter(Boolean);
            
        if (activeFilters.length > 0) {
            doc.setFontSize(10);
            doc.text("Amaldagi Filtrlar:", 14, currentY);
            currentY += 6;
            doc.setFontSize(9);
            doc.text(activeFilters.join(' | '), 14, currentY);
            currentY += 10;
        }

        const head = [
            ["#", "Talaba ID", "Ism", "Familiya", "Telefon", "Ota-ona tel.", "Manzil", 
             "Tug'ilgan sana", "Ro'yxatga olingan vaqt", "Status", "Ketish sababi", 
             "Guruhlar", "Chegirma (%)", "Ball", "Qachon kelgan", "Qanday topdi", 
             "Birinchi to'lov izohi", "Balans"] // "Qarzdorlik" o'rniga "Balans"
        ];
        const body = allStudents.map((s, index) => [
            index + 1,
            s.studentId || 'N/A',
            s.firstName || '',
            s.lastName || '',
            s.phone || 'N/A',
            s.parentPhone || 'N/A',
            s.address || 'N/A',
            formatDDMMYYYY(s.dateBirth) || 'N/A',
            formatDDMMYYYY(s.createdAt) || 'N/A',
            s.status || 'N/A',
            s.status === 'NOFAOL' ? (s.whyStop || 'N/A') : 'N/A', // Only show whyStop if status is NOFAOL
            s.groups && s.groups.length > 0
                ? s.groups.map(group => groupMap[group.id] || group.name || group.groupId || 'N/A').join(', ')
                : 'Yo\'q',
            `${s.discountPercentage || s.discount || 0}%`,
            s.ball || 0,
            formatDDMMYYYY(s.whenCome) || 'N/A',
            s.howFind ? { 
                SOCIAL_MEDIA: 'Ijtimoiy tarmoqlar', 
                FRIEND_REFERRAL: 'Do\'st tavsiyasi', 
                ADVERTISEMENT: 'Reklama', 
                OTHER: 'Boshqa', 
            }[s.howFind] || 'Noma\'lum' : 'Yo\'q',
            s.firstPaymentNote || 'Yo\'q',
            `${(s.balance || 0).toLocaleString('uz-UZ')} so'm`
        ]);

        autoTable(doc, {
            startY: currentY,
            head: head,
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [34, 49, 63], textColor: 'white', fontSize: 7, fontStyle: 'bold' }, // Kichikroq shrift, qalin
            bodyStyles: { fontSize: 6.5 }, // Kichikroq shrift
            columnStyles: { 
                0: { cellWidth: 8 }, // #
                1: { cellWidth: 15 }, // Talaba ID
                2: { cellWidth: 20 }, // Ism
                3: { cellWidth: 20 }, // Familiya
                4: { cellWidth: 25 }, // Telefon
                5: { cellWidth: 25 }, // Ota-ona tel.
                6: { cellWidth: 30 }, // Manzil
                7: { cellWidth: 20 }, // Tug'ilgan sana
                8: { cellWidth: 20 }, // Ro'yxatga olingan vaqt
                9: { cellWidth: 15 }, // Status
                10: { cellWidth: 25 }, // Ketish sababi
                11: { cellWidth: 30 }, // Guruhlar
                12: { cellWidth: 18 }, // Chegirma (%)
                13: { cellWidth: 10 }, // Ball
                14: { cellWidth: 20 }, // Qachon kelgan
                15: { cellWidth: 25 }, // Qanday topdi
                16: { cellWidth: 30 }, // Birinchi to'lov izohi
                17: { cellWidth: 20, halign: 'right' } // Balansni o'ngga tekislash
            }, 
            didDrawPage: (data) => {
                doc.setFontSize(10);
                doc.text(`Sahifa ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });

        currentY = doc.lastAutoTable.finalY + 15; // Move Y position after the main table

        if (allStudents.some(s => s.payments && s.payments.length > 0)) {
            doc.setFontSize(14);
            doc.text("To'lovlar Tarixi", 14, currentY);
            currentY += 10;

            for (const student of allStudents) {
                if (student.payments && student.payments.length > 0) {
                    // Check if new page is needed before adding student's payment history
                    // Add some buffer for heading and first row
                    if (currentY + 30 > doc.internal.pageSize.height - 20) { 
                        doc.addPage();
                        currentY = 20;
                    }

                    doc.setFontSize(12);
                    doc.text(`${student.firstName} ${student.lastName} (${student.studentId}) to'lovlari:`, 14, currentY);
                    currentY += 8;

                    const paymentHead = [["Sana", "Summa", "Turi", "Qaysi oy/yil uchun", "Kim kiritdi", "Izoh", "Kiritilgan vaqt"]];
                    const paymentBody = student.payments.map(p => [
                        formatDDMMYYYY(p.date) || 'N/A',
                        `${(p.summa || 0).toLocaleString('uz-UZ')} so'm`,
                        p.paymentType || 'N/A',
                        `${p.whichMonth || ''} ${p.whichYear || ''}`.trim() || 'N/A',
                        p.createdByAdmin?.firstName || 'N/A', // Adminning ismini qo'shdik
                        p.comment || 'Yo\'q',
                        formatDDMMYYYY(p.createdAt) || 'N/A'
                    ]);

                    autoTable(doc, {
                        startY: currentY,
                        head: paymentHead,
                        body: paymentBody,
                        theme: 'grid',
                        headStyles: { fillColor: [76, 175, 80], textColor: 'white', fontSize: 8, fontStyle: 'bold' },
                        bodyStyles: { fontSize: 7.5 },
                        columnStyles: {
                            0: { cellWidth: 30 }, // Sana
                            1: { cellWidth: 35, halign: 'right' }, // Summa
                            2: { cellWidth: 30 }, // Turi
                            3: { cellWidth: 35 }, // Qaysi oy/yil uchun
                            4: { cellWidth: 35 }, // Kim kiritdi
                            5: { cellWidth: 35 } // Kiritilgan vaqt
                        },
                        didDrawPage: (data) => {
                            doc.setFontSize(10);
                            doc.text(`Sahifa ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
                        }
                    });
                    currentY = doc.lastAutoTable.finalY + 10; // Space after each payment table
                }
            }
        }

        doc.save(`talabalar-hisobot-${new Date().toISOString().split('T')[0]}.pdf`);
        setIsExporting(false);
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 bg-gray-100 mt-0">
            <div className="bg-white rounded-xl shadow-xl border border-gray-200">
                <div className="p-6 sm:p-8 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h2 className="text-xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                            <Users size={36} className="mr-3 text-indigo-600" aria-hidden="true" />
                            Talabalar Ro'yxati
                        </h2>
                        <div className="flex items-center gap-3"> {/* Tugmalar uchun yangi div */}
                            <button
                                onClick={() => openModal()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-lg inline-flex items-center transition duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                <UserPlus size={18} className="mr-2" aria-hidden="true" />
                                Yangi Talaba
                            </button>
                            <button
                                onClick={handleExportPDF}
                                disabled={students.length === 0 || isExporting}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-5 rounded-lg inline-flex items-center transition disabled:opacity-50"
                            >
                                {isExporting ? <LoadingSpinner size={18} /> : <FileText size={18} className="mr-2.5" />}
                                {isExporting ? 'Yuklanmoqda...' : "PDF Hisobot"}
                            </button>
                        </div>
                    </div>
                </div>

                {listError && (
                    <div className="p-6 sm:p-8">
                        <ErrorMessage message={listError} onClose={() => setListError(null)} />
                    </div>
                )}

                <div className="p-6 sm:p-8 border-b border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <input
                            type="text"
                            name="filterByStudentId"
                            placeholder="Talaba ID..."
                            value={filters.filterByStudentId}
                            onChange={handleFilterChange}
                            className="px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <input
                            type="text"
                            name="filterByName"
                            placeholder="Ism/Familiya..."
                            value={filters.filterByName}
                            onChange={handleFilterChange}
                            className="px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <input
                            type="text"
                            name="filterByPhone"
                            placeholder="Telefon..."
                            value={filters.filterByPhone}
                            onChange={handleFilterChange}
                            className="px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <select
                            name="filterByStatus"
                            value={filters.filterByStatus}
                            onChange={handleFilterChange}
                            className="px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                            <option value="">Status bo'yicha</option>
                            <option value="FAOL">Faol</option>
                            <option value="NOFAOL">Nofaol</option>
                            <option value="TUGATGAN">Tugatgan</option>
                        </select>
                        <select
                            name="filterByGroupId"
                            value={filters.filterByGroupId}
                            onChange={handleFilterChange}
                            className="px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            disabled={groupsLoading}
                        >
                            <option value="">Guruh bo'yicha</option>
                            {groupsLoading ? <option disabled>Yuklanmoqda...</option> :
                                groups.map(group => (
                                    <option key={group.id} value={group.id}>{group.name || group.groupId}</option>
                                ))
                            }
                        </select>
                    </div>
                </div>

                {/* Loading overlay for the table content */}
                <div className={`relative ${loading && students.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                    {loading && students.length > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10 rounded-lg">
                            <LoadingSpinner text="Ma'lumotlar yangilanmoqda..." />
                        </div>
                    )}
                    {/* Initial Loading or No Data State */}
                    {loading && !listError && students.length === 0 ? (
                        <div className="p-6 sm:p-8">
                            <LoadingSpinner text="Talabalar yuklanmoqda..." />
                        </div>
                    ) : (
                        <>
                            {!listError && students.length === 0 ? (
                                <div className="p-6 sm:p-8 text-center text-gray-500">
                                    <Users size={48} className="mx-auto mb-3 opacity-50" aria-hidden="true" />
                                    <p className="font-semibold text-lg">Hozircha talabalar mavjud emas.</p>
                                    <p className="text-sm">Filterlarni o'zgartirib ko'ring yoki yangi talaba qo'shing.</p>
                                </div>
                            ) : (
                                <div className="p-6 sm:p-8">
                                    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-md">
                                        <table className="min-w-full bg-white divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th
                                                        className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-100 transition-colors"
                                                        onClick={() => handleSort('studentId')}
                                                    >
                                                        Talaba ID <SortIcon column="studentId" currentSort={sort} />
                                                    </th>
                                                    <th
                                                        className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-100 transition-colors"
                                                        onClick={() => handleSort('firstName')}
                                                    >
                                                        Ism <SortIcon column="firstName" currentSort={sort} />
                                                    </th>
                                                    <th
                                                        className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-100 transition-colors"
                                                        onClick={() => handleSort('lastName')}
                                                    >
                                                        Familiya <SortIcon column="lastName" currentSort={sort} />
                                                    </th>
                                                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Telefon
                                                    </th>
                                                    <th
                                                        className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-100 transition-colors"
                                                        onClick={() => handleSort('status')}
                                                    >
                                                        Status <SortIcon column="status" currentSort={sort} />
                                                    </th>
                                                    <th
                                                        className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-100 transition-colors"
                                                        onClick={() => handleSort('dateBirth')}
                                                    >
                                                        Tug'ilgan sana <SortIcon column="dateBirth" currentSort={sort} />
                                                    </th>
                                                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Guruhlar
                                                    </th>
                                                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Amallar
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {students.map((student) => (
                                                    <StudentRow
                                                        key={student.id}
                                                        student={student}
                                                        onEdit={openModal}
                                                        onDelete={openConfirmModal}
                                                        onView={openViewModal}
                                                        groupMap={groupMap}
                                                    />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {totalPages > 1 && (
                                        <div className="mt-4">
                                            <Pagination
                                                currentPage={currentPage}
                                                totalPages={totalPages}
                                                onPageChange={handlePageChange}
                                                totalItems={totalItems}
                                                itemsPerPage={DEFAULT_LIMIT}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStudent ? "Talabani Tahrirlash" : "Yangi Talaba Qo'shish"} size="large">
                    {isModalOpen && (
                        groupsLoading && !groups.length ? (
                            <div className="p-6 sm:p-8">
                                <LoadingSpinner text="Guruhlar yuklanmoqda..." />
                            </div>
                        ) : (
                            <StudentForm
                                token={token}
                                initialData={editingStudent}
                                groups={groups}
                                onFormSubmit={handleFormSubmit}
                                onCancel={closeModal}
                                showToast={showToast}
                                lastStudentId={lastStudentId}
                            />
                        )
                    )}
                </Modal>

                <Modal isOpen={isViewModalOpen} onClose={closeViewModal} title="Talaba ma'lumotlari" size="large">
                    {isViewModalOpen && viewingStudent && (
                        <StudentDetailsModal
                            student={viewingStudent}
                            groups={groups}
                            onClose={closeViewModal}
                            onEdit={() => {
                                closeViewModal();
                                openModal(viewingStudent); // Open edit modal with the same student data
                            }}
                        />
                    )}
                </Modal>

                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={closeConfirmModal}
                    onConfirm={handleDeleteConfirm}
                    title="O'chirishni tasdiqlash"
                    message="Haqiqatan ham ushbu talabani o'chirmoqchimisiz? Bu amalni orqaga qaytarib bo'lmaydi."
                />
            </div>
        </div>
    );
};

export default StudentList;
