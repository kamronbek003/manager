import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { DollarSign, Edit, ArrowUpDown } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { formatDDMMYYYY, formatCurrency } from '../../utils/helpers';
import LoadingSpinner from '../Essential/LoadingSpinner';
import ErrorMessage from '../Essential/ErrorMessage';
import Pagination from '../Essential/Pagination';
import Modal from '../Essential/Modal';
import PaymentForm from './PaymentForm';

const DEFAULT_LIMIT = 15;
const DEBOUNCE_DELAY = 300;

const PaymentType = { NAQD: 'NAQD', KARTA: 'KARTA', BANK: 'BANK' };

const PaymentRow = React.memo(({ payment, onEdit }) => {
  return (
    <tr className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-900 font-medium">
        {payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : "Noma'lum"}
        <span className="block text-xs text-gray-500">{payment.student?.studentId}</span>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700 text-right">{formatCurrency(payment.summa)}</td>
      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-500">{formatDDMMYYYY(payment.date)}</td>
      <td className="px-4 py-3.5 whitespace-nowrap text-sm">
        <span
          className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
            payment.paymentType === 'NAQD'
              ? 'bg-green-100 text-green-800'
              : payment.paymentType === 'KARTA'
              ? 'bg-blue-100 text-blue-800'
              : payment.paymentType === 'BANK'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {payment.paymentType ? payment.paymentType.toLowerCase() : 'n/a'}
        </span>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-500">{formatDDMMYYYY(payment.createdAt)}</td>
      <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium space-x-3.5">
        <button
          onClick={() => onEdit(payment)}
          className="text-indigo-600 hover:text-indigo-800 transition-colors"
          title="To'lovni tahrirlash"
        >
          <Edit size={18} />
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

const PaymentList = ({ token, showToast }) => {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState({
    filterByName: '',
    filterByStudentBusinessId: '',
    filterByGroupBusinessId: '',
    filterByPaymentType: '',
  });
  const [sort, setSort] = useState({ sortBy: 'date', sortOrder: 'desc' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const filterTimeoutRef = useRef(null);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState(null);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState(null); 

  const fetchStudentsAndGroups = useCallback(async () => {
    if ((students.length === 0 && !studentsLoading) || (groups.length === 0 && !groupsLoading)) {
      setStudentsLoading(true);
      setGroupsLoading(true);
      setStudentsError(null);
      setGroupsError(null);
      try {
        const [studentsResponse, groupsResponse] = await Promise.all([
          apiRequest('/students?limit=100&sortBy=firstName&sortOrder=asc', 'GET', null, token),
          apiRequest('/groups?limit=100&sortBy=name&sortOrder=asc', 'GET', null, token), 
        ]);

        if (studentsResponse && Array.isArray(studentsResponse.data)) {
          setStudents(studentsResponse.data);
        } else {
          console.warn('[PaymentList] fetchStudentsAndGroups: Talabalar uchun noto\'g\'ri ma\'lumot strukturasi.');
          setStudents([]);
          setStudentsError('Talabalar ro\'yxati formatida xatolik.');
          if (showToast) showToast('Talabalar ro\'yxatini yuklashda xatolik (format).', 'warning');
        }

        if (groupsResponse && Array.isArray(groupsResponse.data)) {
          setGroups(groupsResponse.data);
        } else {
          console.warn('[PaymentList] fetchStudentsAndGroups: Guruhlar uchun noto\'g\'ri ma\'lumot strukturasi.');
          setGroups([]);
          setGroupsError('Guruhlar ro\'yxati formatida xatolik.');
          if (showToast) showToast('Guruhlar ro\'yxatini yuklashda xatolik (format).', 'warning');
        }
      } catch (err) {
        console.error('[PaymentList] fetchStudentsAndGroups: Ma\'lumotlarni yuklashda XATOLIK:', err.originalError || err);
        const errorMsg = err.message || 'Ma\'lumotlarni yuklab bo\'lmadi.';
        setStudentsError(errorMsg);
        setGroupsError(errorMsg);
        if (showToast) showToast(errorMsg, 'error');
        setStudents([]);
        setGroups([]);
      } finally {
        setStudentsLoading(false);
        setGroupsLoading(false);
      }
    }
  }, [token, students.length, studentsLoading, groups.length, groupsLoading, showToast]);

  const fetchPayments = useCallback(
    async (filtersToUse = filters, pageToUse = currentPage, sortToUse = sort) => {
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
          if (value) queryParams.append(key, value);
        });

        const data = await apiRequest(`/payments?${queryParams.toString()}`, 'GET', null, token);
        if (data && Array.isArray(data.data)) {
          setPayments(data.data);
          setTotalItems(data.total || 0);
          setTotalPages(Math.ceil((data.total || 0) / DEFAULT_LIMIT));
        } else {
          console.warn('[PaymentList] fetchPayments: To\'lovlar uchun kutilmagan javob strukturasi.');
          setPayments([]);
          setTotalItems(0);
          setTotalPages(1);
          if (showToast) showToast('To\'lovlar ma\'lumotlari formatida xatolik.', 'warning');
        }
      } catch (err) {
        console.error('[PaymentList] fetchPayments: To\'lovlarni yuklashda XATOLIK:', err.originalError || err);
        const errorMessage = err.message || "To'lovlarni yuklashda noma'lum xatolik yuz berdi.";
        if (err.statusCode !== 401 && showToast) {
          showToast(`To'lovlarni yuklab bo'lmadi: ${errorMessage}`, 'error');
        }
        setListError(errorMessage);
        setPayments([]);
        setTotalItems(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [token, currentPage, filters, sort, showToast]
  );

  const debouncedFetchPayments = useCallback(
    (newFilters) => {
      if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
      filterTimeoutRef.current = setTimeout(() => {
        setCurrentPage(1);
        fetchPayments(newFilters, 1, sort);
      }, DEBOUNCE_DELAY);
    },
    [fetchPayments, sort]
  );

  const handleFilterChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      const newFilters = { ...filters, [name]: value };
      setFilters(newFilters);
      debouncedFetchPayments(newFilters);
    },
    [filters, debouncedFetchPayments]
  );

  useEffect(() => {
    fetchPayments(filters, currentPage, sort);
    return () => {
      if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
    };
  }, [currentPage, sort, fetchPayments, filters]);

  const handleSort = useCallback(
    (column) => {
      const newSortOrder = sort.sortBy === column && sort.sortOrder === 'asc' ? 'desc' : 'asc';
      setSort({ sortBy: column, sortOrder: newSortOrder });
    },
    [sort]
  );

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const openModal = useCallback(
    (payment = null) => {
      setEditingPayment(payment);
      setIsModalOpen(true);
      fetchStudentsAndGroups();
    },
    [fetchStudentsAndGroups]
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingPayment(null);
  }, []);

  const handleFormSubmit = useCallback(() => {
    closeModal();
    const pageToFetch = editingPayment ? currentPage : 1;
    if (!editingPayment) setCurrentPage(1);
    fetchPayments(filters, pageToFetch, sort);
  }, [closeModal, editingPayment, currentPage, fetchPayments, filters, sort]);

  return (
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl m-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b border-gray-200 gap-4">
        <h2 className="text-xl sm:text-3xl font-semibold text-gray-800 flex items-center">
          <DollarSign size={36} className="mr-3 text-indigo-600" /> To'lovlar Ro'yxati
        </h2>
        <button
          onClick={() => openModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-lg inline-flex items-center transition duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <DollarSign size={18} className="mr-2.5" /> Yangi To'lov
        </button>
      </div>

      {listError && !showToast && <ErrorMessage message={listError} onClose={() => setListError(null)} />}
      {studentsError && !showToast && (
        <ErrorMessage
          message={`Talabalar ro'yxatini yuklashda xatolik: ${studentsError}`}
          onClose={() => setStudentsError(null)}
        />
      )}
      {groupsError && !showToast && (
        <ErrorMessage
          message={`Guruhlar ro'yxatini yuklashda xatolik: ${groupsError}`}
          onClose={() => setGroupsError(null)}
        />
      )}

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <input
          type="text"
          name="filterByName"
          placeholder="Ism yoki Familiya..."
          value={filters.filterByName}
          onChange={handleFilterChange}
          className="px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <input
          type="text"
          name="filterByStudentBusinessId"
          placeholder="Student ID (N...)"
          value={filters.filterByStudentBusinessId}
          onChange={handleFilterChange}
          className="px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <input
          type="text"
          name="filterByGroupBusinessId"
          placeholder="Guruh ID (G...)"
          value={filters.filterByGroupBusinessId}
          onChange={handleFilterChange}
          className="px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <select
          name="filterByPaymentType"
          value={filters.filterByPaymentType}
          onChange={handleFilterChange}
          className="px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          <option value="">To'lov turi bo'yicha</option>
          {Object.values(PaymentType).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {loading && !listError && payments.length === 0 && (
        <div className="py-12 text-center">
          <LoadingSpinner message="To'lovlar ro'yxati yuklanmoqda..." />
        </div>
      )}

      {!loading && payments.length === 0 && !listError && (
        <div className="py-12 text-center text-gray-500">
          <DollarSign size={48} className="mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium">Hozircha to'lovlar mavjud emas.</p>
          <p className="text-sm">Filterlarni o'zgartirib ko'ring yoki yangi to'lov qo'shing.</p>
        </div>
      )}

      {payments.length > 0 && (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-md mb-6">
            <table className="min-w-full bg-white divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Talaba
                  </th>
                  <th
                    className="px-4 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('summa')}
                  >
                    Summa <SortIcon column="summa" currentSort={sort} />
                  </th>
                  <th
                    className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('date')}
                  >
                    Sana <SortIcon column="date" currentSort={sort} />
                  </th>
                  <th
                    className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('paymentType')}
                  >
                    To'lov turi <SortIcon column="paymentType" currentSort={sort} />
                  </th>
                  <th
                    className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('createdAt')}
                  >
                    Yaratilgan vaqti <SortIcon column="createdAt" currentSort={sort} />
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amallar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <PaymentRow key={payment.id} payment={payment} onEdit={openModal} />
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

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingPayment ? "To'lovni Tahrirlash" : "Yangi To'lov Qo'shish"}
        size="large"
      >
        {isModalOpen && (
          <PaymentForm
            token={token}
            initialData={editingPayment}
            students={students}
            groups={groups} 
            studentsLoading={studentsLoading}
            studentsError={studentsError}
            onFormSubmit={handleFormSubmit}
            onCancel={closeModal}
            showToast={showToast}
          />
        )}
      </Modal>
    </div>
  );
};

export default PaymentList;