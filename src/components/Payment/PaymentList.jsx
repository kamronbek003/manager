import React, { useState, useCallback, useEffect } from 'react';
import { DollarSign, Edit, ArrowUpDown, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Loyihadagi yordamchi funksiyalar va komponentlar
// Masalan, /src/utils/helpers.js va /src/components/Essential/
import { apiRequest } from '../../utils/api';
import { formatDDMMYYYY, formatCurrency } from '../../utils/helpers';
import LoadingSpinner from '../Essential/LoadingSpinner';
import ErrorMessage from '../Essential/ErrorMessage';
import Pagination from '../Essential/Pagination';
import Modal from '../Essential/Modal';
import PaymentForm from './PaymentForm';

// O'zgarmas qiymatlar
const DEFAULT_LIMIT = 15;
const DEBOUNCE_DELAY = 500;
const PaymentType = { NAQD: 'NAQD', KARTA: 'KARTA', BANK: 'BANK' };
const MONTHS = [
  'YANVAR', 'FEVRAL', 'MART', 'APREL', 'MAY', 'IYUN',
  'IYUL', 'AVGUST', 'SENTABR', 'OKTABR', 'NOYABR', 'DEKABR'
];
const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear + 1; i >= currentYear - 5; i--) { years.push(i); }
  return years;
};

// ==========================================================================
// YORDAMCHI KOMPONENTLAR
// ==========================================================================
const PaymentRow = React.memo(({ payment, onEdit }) => (
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
          payment.paymentType === 'NAQD' ? 'bg-green-100 text-green-800'
          : payment.paymentType === 'KARTA' ? 'bg-blue-100 text-blue-800'
          : payment.paymentType === 'BANK' ? 'bg-purple-100 text-purple-800'
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
));

const SortIcon = React.memo(({ column, currentSort }) => (
  <ArrowUpDown
    size={15}
    className={`ml-1.5 inline-block transition-opacity ${
      currentSort.sortBy === column ? 'opacity-100 text-indigo-600' : 'opacity-30 group-hover:opacity-80'
    }`}
    aria-hidden="true"
  />
));

// ==========================================================================
// ASOSIY KOMPONENT
// ==========================================================================
const PaymentList = ({ token, showToast }) => {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState(null);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState({
    filterByName: '', filterByStudentBusinessId: '', filterByPaymentType: '',
    filterByDateFrom: '', filterByDateTo: '', filterByYear: '', filterByMonth: '',
  });
  const [sort, setSort] = useState({ sortBy: 'createdAt', sortOrder: 'desc' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const fetchPayments = useCallback(async (currentFilters, page, currentSort) => {
    setLoading(true);
    setListError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: DEFAULT_LIMIT.toString(),
        sortBy: currentSort.sortBy,
        sortOrder: currentSort.sortOrder,
      });
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      const data = await apiRequest(`/payments?${queryParams.toString()}`, 'GET', null, token);
      setPayments(data?.data || []);
      setTotalItems(data?.total || 0);
      setTotalPages(Math.ceil((data?.total || 0) / DEFAULT_LIMIT));
    } catch (err) {
      setListError(err.message || "To'lovlarni yuklashda xatolik yuz berdi.");
      setPayments([]); setTotalItems(0); setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [token]);
  
  const fetchStudentsAndGroups = useCallback(async () => {
    if (students.length > 0 && groups.length > 0) return;
    setStudentsLoading(true); setGroupsLoading(true);
    setStudentsError(null); setGroupsError(null);
    try {
      const [studentsResponse, groupsResponse] = await Promise.all([
        apiRequest('/students?limit=500&sortBy=firstName&sortOrder=asc', 'GET', null, token),
        apiRequest('/groups?limit=200&sortBy=name&sortOrder=asc', 'GET', null, token),
      ]);
      setStudents(studentsResponse?.data || []);
      setGroups(groupsResponse?.data || []);
    } catch (err) {
      const errorMsg = err.message || 'Studentlar va guruhlarni yuklab bo\'lmadi.';
      setStudentsError(errorMsg); setGroupsError(errorMsg);
      if (showToast) showToast(errorMsg, 'error');
    } finally {
      setStudentsLoading(false); setGroupsLoading(false);
    }
  }, [token, showToast, students.length, groups.length]);
  
  useEffect(() => {
    fetchPayments(filters, currentPage, sort);
  }, [currentPage, sort, fetchPayments]);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchPayments(filters, 1, sort);
      }
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(handler);
  }, [filters, sort, fetchPayments]);
  
  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  }, []);
  
  const handleSort = useCallback((column) => {
    setSort(prev => ({
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  }, []);
  
  const handlePageChange = useCallback((page) => setCurrentPage(page), []);
  
  const openModal = useCallback((payment = null) => {
    fetchStudentsAndGroups();
    setEditingPayment(payment);
    setIsModalOpen(true);
  }, [fetchStudentsAndGroups]);
  
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingPayment(null);
  }, []);
  
  const handleFormSubmit = useCallback(() => {
    closeModal();
    const pageToRefresh = editingPayment ? currentPage : 1;
    if (!editingPayment) setCurrentPage(1);
    fetchPayments(filters, pageToRefresh, sort);
  }, [closeModal, fetchPayments, filters, editingPayment, currentPage, sort]);
  
  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);
    
    const queryParams = new URLSearchParams({
      page: '1', limit: totalItems > 0 ? totalItems.toString() : '1000',
      sortBy: sort.sortBy, sortOrder: sort.sortOrder,
    });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    let allPayments = [];
    try {
      const response = await apiRequest(`/payments?${queryParams.toString()}`, 'GET', null, token);
      allPayments = response?.data || [];
    } catch (err) {
      showToast(`PDF uchun ma'lumotlarni yuklashda xatolik: ${err.message}`, 'error');
      setIsExporting(false); return;
    }
    
    if (allPayments.length === 0) {
      showToast("PDF uchun ma'lumotlar topilmadi.", "warning");
      setIsExporting(false); return;
    }
    
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setProperties({ title: 'To\'lovlar Hisoboti' });
    // doc.addFont('/fonts/Roboto-Regular.ttf', 'Roboto', 'normal'); // Agar kerak bo'lsa
    // doc.setFont('Roboto');
    
    let currentY = 20;
    
    doc.setFontSize(18);
    doc.text("To'lovlar Bo'yicha To'liq Hisobot", 14, currentY);
    currentY += 10;
    
    const activeFilters = Object.entries(filters).filter(([, value]) => value)
      .map(([key, value]) => {
        switch (key) {
          case 'filterByName': return `Ism/Familiya: ${value}`;
          case 'filterByStudentBusinessId': return `Student ID: ${value}`;
          case 'filterByDateFrom': return `Sana (dan): ${formatDDMMYYYY(value)}`;
          case 'filterByDateTo': return `Sana (gacha): ${formatDDMMYYYY(value)}`;
          case 'filterByYear': return `Yil: ${value}`;
          case 'filterByMonth': return `Oy: ${value}`;
          case 'filterByPaymentType': return `To'lov turi: ${value}`;
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
    
    const summary = { NAQD: { count: 0, total: 0 }, KARTA: { count: 0, total: 0 }, BANK: { count: 0, total: 0 }, GRAND_TOTAL: 0 };
    allPayments.forEach(p => {
      if (summary[p.paymentType]) {
        summary[p.paymentType].count++;
        summary[p.paymentType].total += p.summa;
      }
      summary.GRAND_TOTAL += p.summa;
    });
    
    autoTable(doc, {
      startY: currentY,
      head: [['To\'lov turi', 'Tranzaksiyalar soni', 'Umumiy summa']],
      body: Object.keys(PaymentType).map(type => [type, summary[type].count.toString(), formatCurrency(summary[type].total)]),
      foot: [['Jami', allPayments.length.toString(), formatCurrency(summary.GRAND_TOTAL)]],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 'white', fontSize: 10 },
      footStyles: { fillColor: [22, 160, 133], textColor: 'white', fontSize: 10 },
      bodyStyles: { fontSize: 9 },
    });
    
    currentY = doc.lastAutoTable.finalY + 15;
    
    doc.setFontSize(12);
    doc.text("Batafsil Ro'yxat", 14, currentY);
    currentY += 5;
    
    const head = [["#", "To'lov sanasi", "Talaba (ID)", "Summa", "Turi", "Qaysi oy/yil uchun", "Guruh", "Kim kiritdi", "Kiritilgan vaqt"]];
    const body = allPayments.map((p, index) => [
      index + 1,
      formatDDMMYYYY(p.date),
      `${p.student?.firstName || ''} ${p.student?.lastName || ''} (${p.student?.studentId || 'N/A'})`,
      formatCurrency(p.summa),
      p.paymentType || 'N/A',
      `${p.whichMonth || ''} ${p.whichYear || ''}`.trim(),
      p.group?.name || p.group?.groupId || 'N/A',
      `${p.createdByAdmin?.firstName || ''}`,
      formatDDMMYYYY(p.createdAt),
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: head, body: body, theme: 'striped',
      headStyles: { fillColor: [34, 49, 63], textColor: 'white', fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 8 }, 3: { halign: 'right' }, },
      didDrawPage: (data) => {
        doc.setFontSize(10);
        doc.text(`Sahifa ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
      }
    });
    
    doc.save(`hisobot-${new Date().toISOString().split('T')[0]}.pdf`);
    setIsExporting(false);
  };
  
  return (
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl m-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b border-gray-200 gap-4">
        <h2 className="text-xl sm:text-3xl font-semibold text-gray-800 flex items-center">
          <DollarSign size={36} className="mr-3 text-indigo-600" /> To'lovlar Ro'yxati
        </h2>
        <div className="flex items-center gap-3">
          <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-lg inline-flex items-center transition">
            <DollarSign size={18} className="mr-2.5" /> Yangi To'lov
          </button>
          <button onClick={handleExportPDF} disabled={payments.length === 0 || isExporting} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-5 rounded-lg inline-flex items-center transition disabled:opacity-50">
            {isExporting ? <LoadingSpinner size={18} /> : <FileText size={18} className="mr-2.5" />}
            {isExporting ? 'Yuklanmoqda...' : "PDF Hisobot"}
          </button>
        </div>
      </div>

      {listError && <ErrorMessage message={listError} onClose={() => setListError(null)} />}

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <input type="text" name="filterByName" placeholder="Ism yoki Familiya..." value={filters.filterByName} onChange={handleFilterChange} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
        <input type="text" name="filterByStudentBusinessId" placeholder="Student ID (N...)" value={filters.filterByStudentBusinessId} onChange={handleFilterChange} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
        <input type="date" name="filterByDateFrom" value={filters.filterByDateFrom} onChange={handleFilterChange} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" title="Boshlanish sanasi" />
        <input type="date" name="filterByDateTo" value={filters.filterByDateTo} onChange={handleFilterChange} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" title="Tugash sanasi" />
        <select name="filterByYear" value={filters.filterByYear} onChange={handleFilterChange} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="">Yil bo'yicha...</option>
          {generateYears().map(year => <option key={year} value={year}>{year}</option>)}
        </select>
        <select name="filterByMonth" value={filters.filterByMonth} onChange={handleFilterChange} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="">Oy bo'yicha...</option>
          {MONTHS.map(month => <option key={month} value={month}>{month}</option>)}
        </select>
        <select name="filterByPaymentType" value={filters.filterByPaymentType} onChange={handleFilterChange} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="">To'lov turi bo'yicha...</option>
          {Object.values(PaymentType).map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center"><LoadingSpinner message="To'lovlar ro'yxati yuklanmoqda..." /></div>
      ) : payments.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <DollarSign size={48} className="mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium">Hozircha to'lovlar mavjud emas.</p>
          <p className="text-sm">Filtrlarni o'zgartirib ko'ring yoki yangi to'lov qo'shing.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-md mb-6">
            <table className="min-w-full bg-white divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Talaba</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer" onClick={() => handleSort('summa')}>Summa <SortIcon column="summa" currentSort={sort} /></th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer" onClick={() => handleSort('date')}>Sana <SortIcon column="date" currentSort={sort} /></th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer" onClick={() => handleSort('paymentType')}>To'lov turi <SortIcon column="paymentType" currentSort={sort} /></th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer" onClick={() => handleSort('createdAt')}>Yaratilgan vaqti <SortIcon column="createdAt" currentSort={sort} /></th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => <PaymentRow key={payment.id} payment={payment} onEdit={openModal} />)}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} totalItems={totalItems} itemsPerPage={DEFAULT_LIMIT}/>}
        </>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPayment ? "To'lovni Tahrirlash" : "Yangi To'lov Qo'shish"} size="large">
        {isModalOpen && (
          <PaymentForm
            token={token}
            initialData={editingPayment}
            students={students}
            groups={groups}
            studentsLoading={studentsLoading}
            studentsError={studentsError}
            groupsLoading={groupsLoading}
            groupsError={groupsError}
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