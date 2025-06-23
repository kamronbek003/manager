
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DollarSign, PlusCircle, Edit, Trash2, Search, ArrowUpDown } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { formatDDMMYYYY } from '../../utils/helpers';
import LoadingSpinner from '../Essential/LoadingSpinner';
import ErrorMessage from '../Essential/ErrorMessage';
import Pagination from '../Essential/Pagination';
import Modal from '../Essential/Modal';
import ConfirmationModal from '../Essential/ConfirmationModal';
import SalaryForm from './SalaryForm';

const DEFAULT_LIMIT = 15;
const DEBOUNCE_DELAY = 350;

const MONTHS = [
{ value: 1, label: 'Yanvar' },
{ value: 2, label: 'Fevral' },
{ value: 3, label: 'Mart' },
{ value: 4, label: 'Aprel' },
{ value: 5, label: 'May' },
{ value: 6, label: 'Iyun' },
{ value: 7, label: 'Iyul' },
{ value: 8, label: 'Avgust' },
{ value: 9, label: 'Sentabr' },
{ value: 10, label: 'Oktabr' },
{ value: 11, label: 'Noyabr' },
{ value: 12, label: 'Dekabr' },
];

const SalaryRow = React.memo(({ salary, onEdit, onDelete }) => (
<tr className="hover:bg-gray-50 transition-colors duration-150">
  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
    {salary.teacher ? `${salary.teacher.firstName} ${salary.teacher.lastName}` : 'Noma\'lum o\'qituvchi'}
  </td>
  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
    {Number(salary.amount).toLocaleString('uz-UZ')} UZS
  </td>
  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDDMMYYYY(salary.paymentDate)}</td>
  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{`${salary.forMonth}/${salary.forYear}`}</td>
  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDDMMYYYY(salary.createdAt)}</td>
  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
    <button onClick={() => onEdit(salary)} className="text-indigo-600 hover:text-indigo-800 transition-colors" title="Tahrirlash">
      <Edit size={18} />
    </button>
    <button onClick={() => onDelete(salary.id)} className="text-red-600 hover:text-red-800 transition-colors" title="O'chirish">
      <Trash2 size={18} />
    </button>
  </td>
</tr>
));

const SortIcon = React.memo(({ column, currentSort }) => (
<ArrowUpDown
  size={14}
  className={`ml-1 inline-block transition-opacity ${
    currentSort.sortBy === column ? 'opacity-100 text-indigo-600' : 'opacity-30 group-hover:opacity-70'
  }`}
  aria-hidden="true"
/>
));

const SalaryList = ({ token, showToast }) => {
const [salaries, setSalaries] = useState([]);
const [teachers, setTeachers] = useState([]);
const [loading, setLoading] = useState(true);
const [listError, setListError] = useState(null);
const [teachersError, setTeachersError] = useState(null);
const [meta, setMeta] = useState({ page: 1, limit: DEFAULT_LIMIT, total: 0, lastPage: 1 });
const [filters, setFilters] = useState({
  search: '',
  month: '',
  year: '',
  teacherId: '',
});
const [sort, setSort] = useState({ sortBy: 'createdAt', order: 'desc' });
const [isModalOpen, setIsModalOpen] = useState(false);
const [editingSalary, setEditingSalary] = useState(null);
const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
const [deletingSalaryId, setDeletingSalaryId] = useState(null);
const debounceTimeoutRef = useRef(null);
const isMounted = useRef(false);

const fetchTeachers = useCallback(async () => {
  try {
    setTeachersError(null);
    const response = await apiRequest('/teachers?limit=100', 'GET', null, token);
    const teacherData = response?.data || [];
    if (Array.isArray(teacherData)) {
      setTeachers(teacherData);
    } else {
      throw new Error("O'qituvchilar ma'lumotlari noto'g'ri formatda.");
    }
  } catch (err) {
    const errorMessage = err.message || "O'qituvchilarni yuklashda xatolik.";
    setTeachersError(errorMessage);
    showToast(errorMessage, 'error');
  }
}, [token, showToast]);

const fetchSalaries = useCallback(async (newQuery = {}) => {
  setLoading(true);
  setListError(null);
  const currentQuery = {
    page: meta.page,
    limit: meta.limit,
    sortBy: sort.sortBy,
    order: sort.order,
    ...filters,
    ...newQuery
  };
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(currentQuery)) {
      if (value) {
          queryParams.append(key, value);
      }
  }
  try {
    const response = await apiRequest(`/salaries?${queryParams.toString()}`, 'GET', null, token);
    if (response && Array.isArray(response.data) && response.meta) {
      setSalaries(response.data);
      setMeta(response.meta);
    } else {
      throw new Error("Maoshlar ma'lumotlari noto'g'ri formatda.");
    }
  } catch (err) {
    const errorMessage = err.message || 'Maoshlarni yuklashda xatolik yuz berdi.';
    setListError(errorMessage);
    showToast(errorMessage, 'error');
    setSalaries([]);
    setMeta({ page: 1, limit: DEFAULT_LIMIT, total: 0, lastPage: 1 });
  } finally {
    setLoading(false);
  }
}, [token, showToast, meta.page, meta.limit, sort, filters]);

useEffect(() => {
  if (token) {
    fetchTeachers();
    fetchSalaries({ page: 1 });
  } else {
    const errorMsg = 'Tizimga kirish talab qilinadi.';
    setListError(errorMsg);
    setTeachersError(errorMsg);
    setLoading(false);
  }
}, [token]);

useEffect(() => {
  if (isMounted.current) {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      fetchSalaries({ ...filters, page: 1 });
    }, DEBOUNCE_DELAY);
  } else {
    isMounted.current = true;
  }
  return () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  };
}, [filters]);

const handleFilterChange = useCallback((e) => {
  const { name, value } = e.target;
  setFilters(prevFilters => ({ ...prevFilters, [name]: value }));
}, []);

const handleSort = useCallback((column) => {
  const newOrder = sort.sortBy === column && sort.order === 'asc' ? 'desc' : 'asc';
  const newSort = { sortBy: column, order: newOrder };
  setSort(newSort);
  fetchSalaries({ ...filters, sortBy: newSort.sortBy, order: newSort.order, page: 1 });
}, [filters, sort.sortBy, sort.order, fetchSalaries]);

const handlePageChange = useCallback((page) => {
  fetchSalaries({ page });
}, [fetchSalaries]);

const openModal = useCallback((salary = null) => {
  setEditingSalary(salary);
  setIsModalOpen(true);
}, []);

const closeModal = useCallback(() => {
  console.log('[SalaryList] Closing modal');
  setIsModalOpen(false);
  setEditingSalary(null);
}, []);

const handleFormSubmit = useCallback(() => {
  console.log('[SalaryList] Form submitted');
  closeModal();
  fetchSalaries({ page: editingSalary ? meta.page : 1 });
}, [closeModal, editingSalary, meta.page, fetchSalaries]);

const openConfirmModal = useCallback((salaryId) => {
  setDeletingSalaryId(salaryId);
  setIsConfirmModalOpen(true);
}, []);

const closeConfirmModal = useCallback(() => {
  setDeletingSalaryId(null);
  setIsConfirmModalOpen(false);
}, []);

const handleDeleteConfirm = useCallback(async () => {
  if (!deletingSalaryId) return;
  try {
    await apiRequest(`/salaries/${deletingSalaryId}`, 'DELETE', null, token);
    showToast("Maosh muvaffaqiyatli o'chirildi!", 'success');
    closeConfirmModal();
    const newPage = salaries.length === 1 && meta.page > 1 ? meta.page - 1 : meta.page;
    fetchSalaries({ page: newPage });
  } catch (err) {
    const errorMessage = err.message || "Maoshni o'chirishda xatolik.";
    showToast(errorMessage, 'error');
    closeConfirmModal();
  }
}, [deletingSalaryId, token, showToast, closeConfirmModal, salaries.length, meta.page, fetchSalaries]);

const years = useMemo(() => Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => ({ value: y, label: y })), []);

return (
  <div className="p-4 sm:p-6 md:p-8 bg-gray-100 mt-0">
    <div className="bg-white rounded-xl shadow-xl border border-gray-200">
      <div className="p-6 sm:p-8 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl sm:text-3xl font-semibold text-gray-800 flex items-center">
            <DollarSign size={36} className="mr-3 text-indigo-600" />
            Maoshlar Ro'yxati
          </h2>
          <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-lg inline-flex items-center transition duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <PlusCircle size={18} className="mr-2" />
            Yangi Maosh
          </button>
        </div>
      </div>

      {(listError || teachersError) && (
        <div className="p-6">
          {listError && <ErrorMessage message={listError} onClose={() => setListError(null)} />}
          {teachersError && <ErrorMessage message={teachersError} onClose={() => setTeachersError(null)} />}
        </div>
      )}

      <div className="p-6 sm:p-8 border-b border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18}/>
            <input type="text" name="search" placeholder="O'qituvchi ismi..." value={filters.search} onChange={handleFilterChange} className="pl-10 px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full" />
          </div>
          <select name="month" value={filters.month} onChange={handleFilterChange} className="px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
            <option value="">Oy tanlang</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select name="year" value={filters.year} onChange={handleFilterChange} className="px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
            <option value="">Yil tanlang</option>
            {years.map((y) => (
              <option key={y.value} value={y.value}>{y.label}</option>
            ))}
          </select>
          <select name="teacherId" value={filters.teacherId} onChange={handleFilterChange} className="px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" disabled={!!teachersError}>
            <option value="">O'qituvchi tanlang</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{`${t.firstName} ${t.lastName}`}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="p-6"><LoadingSpinner text="Maoshlar yuklanmoqda..." /></div>}

      {!loading && !listError && salaries.length === 0 && (
        <div className="p-6 sm:p-8 text-center text-gray-500">
          <DollarSign size={48} className="mx-auto mb-3 opacity-50" />
          <p className="font-semibold text-lg">
            {Object.values(filters).some(v => v) ? 'Qidiruv natijasi bo\'yicha maoshlar topilmadi.' : 'Hozircha maoshlar mavjud emas.'}
          </p>
          <p className="text-sm">Filterlarni o'zgartirib ko'ring yoki yangi maosh qo'shing.</p>
        </div>
      )}

      {!loading && salaries.length > 0 && (
        <div className="p-6 sm:p-8">
          <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-md">
            <table className="min-w-full bg-white divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-100" onClick={() => handleSort('teacherId')}>O'qituvchi <SortIcon column="teacherId" currentSort={sort} /></th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-100" onClick={() => handleSort('amount')}>Miqdor <SortIcon column="amount" currentSort={sort} /></th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-100" onClick={() => handleSort('paymentDate')}>To'lov Sanasi <SortIcon column="paymentDate" currentSort={sort} /></th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Davr</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-100" onClick={() => handleSort('createdAt')}>Yaratildi <SortIcon column="createdAt" currentSort={sort} /></th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {salaries.map((salary) => (
                  <SalaryRow key={salary.id} salary={salary} onEdit={openModal} onDelete={openConfirmModal} />
                ))}
              </tbody>
            </table>
          </div>
          {meta.lastPage > 1 && (
            <div className="mt-4">
              <Pagination currentPage={meta.page} totalPages={meta.lastPage} onPageChange={handlePageChange} totalItems={meta.total} itemsPerPage={meta.limit}/>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingSalary ? 'Maoshni Tahrirlash' : 'Yangi Maosh Qo\'shish'} size="large">
        {isModalOpen && (
          <SalaryForm
            token={token}
            salary={editingSalary}
            onClose={closeModal}
            onSave={handleFormSubmit}
            showToast={showToast}
          />
        )}
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={closeConfirmModal}
        onConfirm={handleDeleteConfirm}
        title="O'chirishni Tasdiqlash"
        message="Haqiqatan ham ushbu maosh yozuvini o'chirmoqchimisiz? Bu amalni orqaga qaytarib bo'lmaydi."
      />
    </div>
  </div>
);
};

export default SalaryList;