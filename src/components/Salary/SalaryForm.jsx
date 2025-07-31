import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { X, Save, AlertCircle, DollarSign, Info } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import LoadingSpinner from '../Essential/LoadingSpinner';
import Modal from '../Essential/Modal';

const MONTH_MAP = {
  YANVAR: { value: 1, label: 'Yanvar' },
  FEVRAL: { value: 2, label: 'Fevral' },
  MART: { value: 3, label: 'Mart' },
  APREL: { value: 4, label: 'Aprel' },
  MAY: { value: 5, label: 'May' },
  IYUN: { value: 6, label: 'Iyun' },
  IYUL: { value: 7, label: 'Iyul' },
  AVGUST: { value: 8, label: 'Avgust' },
  SENTABR: { value: 9, label: 'Sentabr' },
  OKTABR: { value: 10, label: 'Oktabr' },
  NOYABR: { value: 11, label: 'Noyabr' },
  DEKABR: { value: 12, label: 'Dekabr' },
};

const SalaryForm = ({ token, salary, onClose, onSave, showToast }) => {
  const [formData, setFormData] = useState({
    teacherId: '',
    amount: '',
    paymentDate: '',
    forMonth: '',
    forYear: '',
    notes: '',
  });
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [errors, setErrors] = useState({});
  const [estimatedSalary, setEstimatedSalary] = useState(null);
  const [salaryBreakdown, setSalaryBreakdown] = useState({
    groups: [],
    payments: [],
    totalPayments: 0,
  });
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await apiRequest('/teachers?select=id,firstName,lastName,limit=100,percent', 'GET', null, token);
        console.log('KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK', response);
        const teachersData = Array.isArray(response.data) ? response.data : [];
        console.log(teachersData);
        
        setTeachers(teachersData);
        if (teachersData.length === 0) {
          console.warn('[SalaryForm] No teachers found in response.');
          showToast('O‘qituvchilar topilmadi. Ma’lumotlar bazasini tekshiring.', 'warning');
        }
      } catch (err) {
        console.error('[SalaryForm] fetchTeachers Error:', {
          message: err.message,
          status: err.status,
          response: err.response?.data,
        });
        setTeachers([]);
        showToast('O‘qituvchilarni yuklashda xatolik yuz berdi.', 'error');
      }
    };

    fetchTeachers();

    console.log(salary);
    

    if (salary) {
      setFormData({
        teacherId: salary.teacherId || '',
        amount: salary.amount ? salary.amount.toString() : '',
        paymentDate: salary.paymentDate ? new Date(salary.paymentDate).toISOString().split('T')[0] : '',
        forMonth: salary.forMonth ? salary.forMonth.toString() : '',
        forYear: salary.forYear ? salary.forYear.toString() : '',
        notes: salary.notes || '',
      });
    } else {
      setFormData({
        teacherId: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        forMonth: (new Date().getMonth() + 1).toString(),
        forYear: new Date().getFullYear().toString(),
        notes: '',
      });
    }
    setErrors({});
  }, [salary, token, showToast]);

  const calculateEstimatedSalary = useCallback(
    async () => {
      if (!formData.teacherId || !formData.forMonth || !formData.forYear) {
        setEstimatedSalary(null);
        setSalaryBreakdown({ groups: [], payments: [], totalPayments: 0 });
        console.log('[SalaryForm] Skipping calculation: Missing teacherId, forMonth, or forYear', formData);
        return;
      }

      setIsCalculating(true);
      try {
        const teacher = teachers.find((t) => t.id === formData.teacherId);
        console.log("KKKKKIIIIIIIMMMMMM", teacher);
        
        if (!teacher || typeof teacher.percent !== 'number') {
          setEstimatedSalary(null);
          setSalaryBreakdown({ groups: [], payments: [], totalPayments: 0 });
          console.warn('[SalaryForm] Teacher or valid percent not found:', { teacherId: formData.teacherId, teacher });
          showToast('O‘qituvchi yoki uning foizi topilmadi.', 'warning');
          return;
        }

        console.log('[SalaryForm] Fetching groups with URL:', `/groups?teacherId=${formData.teacherId}&select=id,name,groupId,teacherId`);
        const groupsResponse = await apiRequest(
          `/groups?teacherId=${formData.teacherId}&select=id,name,groupId,teacherId`,
          'GET',
          null,
          token
        );
        console.log('[SalaryForm] Groups API Response:', {
          teacherId: formData.teacherId,
          response: groupsResponse,
          groups: groupsResponse.data.map(g => ({ id: g.id, name: g.name, groupId: g.groupId, teacherId: g.teacherId })),
        });
        const groups = Array.isArray(groupsResponse.data) ? groupsResponse.data : [];

        const validGroups = groups.filter((g) => g.teacherId === formData.teacherId);
        if (validGroups.length === 0) {
          setEstimatedSalary(0);
          setSalaryBreakdown({ groups: [], payments: [], totalPayments: 0 });
          console.log('[SalaryForm] No valid groups found for teacher:', { teacherId: formData.teacherId, groups });
          showToast('O‘qituvchiga tegishli guruhlar topilmadi.', 'warning');
          return;
        }

        const groupIds = validGroups.map((g) => g.id);
        console.log('[SalaryForm] Valid group IDs for teacher:', { teacherId: formData.teacherId, groupIds });

        const forMonthNum = Number(formData.forMonth);
        const whichMonth = Object.keys(MONTH_MAP).find(key => MONTH_MAP[key].value === forMonthNum);
        if (!whichMonth) {
          console.error('[SalaryForm] Invalid month:', { forMonth: formData.forMonth });
          showToast('Noto‘g‘ri oy tanlangan.', 'error');
          setEstimatedSalary(0);
          setSalaryBreakdown({ groups: [], payments: [], totalPayments: 0 });
          return;
        }

        const query = `/payments?groupId_in=${groupIds.join(',')}&filterByMonth=${formData.forMonth}&filterByYear=${formData.forYear}`;
        console.log("WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWw",'[SalaryForm] Fetching payments with query:', { query, whichMonth, whichYear: Number(formData.forYear) });  
        const paymentsResponse = await apiRequest(query, 'GET', null, token);
        console.log('[SalaryForm] Payments API Response:', {
          teacherId: formData.teacherId,
          query,
          rawPayments: paymentsResponse.data.map(p => ({ groupId: p.groupId, summa: p.summa, date: p.date, whichMonth: p.whichMonth, whichYear: p.whichYear })),
        });
        const payments = Array.isArray(paymentsResponse.data) ? paymentsResponse.data : [];

        const validPayments = payments.filter(
          (p) =>
            groupIds.includes(p.groupId) &&
            p.whichMonth === whichMonth &&
            p.whichYear === Number(formData.forYear)
        );
        console.log('[SalaryForm] Payments data:', {
          teacherId: formData.teacherId,
          count: validPayments.length,
          payments: validPayments.map((p) => ({
            groupId: p.groupId,
            summa: p.summa,
            date: p.date,
            whichMonth: p.whichMonth,
            whichYear: p.whichYear,
          })),
        });

        if (validPayments.length === 0) {
          console.log('[SalaryForm] No valid payments found for query:', {
            teacherId: formData.teacherId,
            query,
            whichMonth,
            whichYear: Number(formData.forYear),
          });
          showToast('Tanlangan oy va yil uchun to‘lovlar topilmadi.', 'warning');
        }

        const totalPayments = validPayments.reduce((sum, payment) => sum + (payment.summa || 0), 0);
        const calculatedSalary = (totalPayments * teacher.percent) / 100;

        setEstimatedSalary(calculatedSalary);
        setSalaryBreakdown({ groups: validGroups, payments: validPayments, totalPayments });
        console.log('[SalaryForm] Calculated Salary:', {
          teacherId: formData.teacherId,
          totalPayments,
          percent: teacher.percent,
          calculatedSalary,
        });
      } catch (err) {
        console.error('[SalaryForm] calculateEstimatedSalary Error:', {
          teacherId: formData.teacherId,
          message: err.message,
          status: err.status,
          response: err.response?.data,
        });
        setEstimatedSalary(null);
        setSalaryBreakdown({ groups: [], payments: [], totalPayments: 0 });
        showToast('Taxminiy maoshni hisoblashda xatolik.', 'error');
      } finally {
        setIsCalculating(false);
      }
    },
    [formData.teacherId, formData.forMonth, formData.forYear, teachers, token, showToast]
  );

  useEffect(() => {
    if (formData.teacherId) {
      calculateEstimatedSalary();
    } else {
      setEstimatedSalary(null);
      setSalaryBreakdown({ groups: [], payments: [], totalPayments: 0 });
    }
  }, [formData.teacherId, formData.forMonth, formData.forYear, calculateEstimatedSalary]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.teacherId) newErrors.teacherId = 'O‘qituvchi tanlash majburiy.';
    if (!formData.amount || isNaN(formData.amount) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Miqdor musbat raqam bo‘lishi kerak.';
    }
    if (!formData.paymentDate) newErrors.paymentDate = 'To‘lov sanasi majburiy.';
    if (!formData.forMonth || isNaN(formData.forMonth) || Number(formData.forMonth) < 1 || Number(formData.forMonth) > 12) {
      newErrors.forMonth = 'Iltimos, 1–12 oralig‘ida oy tanlang.';
    }
    if (!formData.forYear || isNaN(formData.forYear) || Number(formData.forYear) < 2000) {
      newErrors.forYear = 'Yil 2000 yoki undan keyingi bo‘lishi kerak.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Iltimos, formadagi xatoliklarni to‘g‘rilang.', 'warning');
      return;
    }

    setIsLoading(true);
    const endpoint = salary ? `/salaries/${salary.id}` : '/salaries';
    const method = salary ? 'PATCH' : 'POST';

    try {
      const payload = {
        teacherId: formData.teacherId,
        amount: Number(formData.amount),
        paymentDate: new Date(formData.paymentDate).toISOString(),
        forMonth: Number(formData.forMonth),
        forYear: Number(formData.forYear),
        notes: formData.notes || undefined,
        estimatedSalary: estimatedSalary ? estimatedSalary.toString() : undefined,
      };
      console.log('[SalaryForm] Submitting payload:', payload);
      const response = await apiRequest(endpoint, method, payload, token);
      console.log('[SalaryForm] Submit API Response:', response);
      showToast(salary ? 'Maosh muvaffaqiyatli yangilandi!' : 'Maosh muvaffaqiyatli qo‘shildi!', 'success');
      onSave();
      if (typeof onClose === 'function') {
        onClose();
      } else {
        console.warn('[SalaryForm] onClose is not a function, received:', onClose);
      }
    } catch (err) {
      console.error('[SalaryForm] handleSubmit:', {
        message: err.message,
        status: err.status,
        response: err.response?.data,
      });
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        (salary ? 'Maoshni yangilashda xatolik.' : 'Maoshni saqlashda xatolik.');
      showToast(errorMessage, 'error');
      if (err.response?.data?.errors) setErrors(err.response.data.errors);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    console.log('[SalaryForm] Close button clicked, onClose type:', typeof onClose, 'onClose value:', onClose);
    if (typeof onClose === 'function') {
      onClose();
    } else {
      console.warn('[SalaryForm] onClose is not a function, received:', onClose);
    }
  };

  const openBreakdownModal = () => {
    console.log('[SalaryForm] Opening breakdown modal');
    setIsBreakdownModalOpen(true);
  };

  const closeBreakdownModal = () => {
    console.log('[SalaryForm] Closing breakdown modal');
    setIsBreakdownModalOpen(false);
  };

  const renderBreakdown = () => {
    const teacher = teachers.find((t) => t.id === formData.teacherId);
    const monthLabel = MONTH_MAP[Object.keys(MONTH_MAP).find(
      (key) => MONTH_MAP[key].value === parseInt(formData.forMonth)
    )]?.label || formData.forMonth;

    if (!teacher || salaryBreakdown.groups.length === 0) {
      return (
        <div className="space-y-4">
          <p className="text-gray-500">Ma'lumotlar mavjud emas yoki guruhlar topilmadi.</p>
          <button
            onClick={closeBreakdownModal}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
          >
            Yopish
          </button>
        </div>
      );
    }

    const groupPayments = salaryBreakdown.groups.map((group) => {
      const groupPayments = salaryBreakdown.payments.filter((p) => p.groupId === group.id);
      const groupTotal = groupPayments.reduce((sum, p) => sum + (p.summa || 0), 0);
      return { group, payments: groupPayments, total: groupTotal };
    }).filter((gp) => gp.total > 0);

    return (
      <div className="space-y-4">
        <p>
          <strong>O'qituvchi:</strong> {teacher.firstName} {teacher.lastName} (Foiz: {teacher.percent || 'N/A'}%)
        </p>
        <p>
          <strong>Oy/Yil:</strong> {monthLabel} {formData.forYear}
        </p>
        <div>
          <strong>Guruhlar va To'lovlar:</strong>
          {groupPayments.length === 0 ? (
            <p className="text-gray-500 mt-2">Ushbu oyda to'lovlar topilmadi.</p>
          ) : (
            <div className="mt-2 space-y-4">
              {groupPayments.map(({ group, payments, total }) => (
                <div key={group.id}>
                  <p className="font-medium">
                    Guruh {group.name || group.groupId}: {total.toLocaleString('uz-UZ')} UZS
                  </p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {payments.map((payment) => (
                      <li key={payment.id}>
                        Talaba: {payment.student?.firstName} {payment.student?.lastName} ({payment.student?.studentId}) - 
                        {payment.summa.toLocaleString('uz-UZ')} UZS, 
                        Sana: {new Date(payment.date).toLocaleDateString('uz-UZ')}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
        <p>
          <strong>Jami To'lovlar:</strong> {salaryBreakdown.totalPayments.toLocaleString('uz-UZ')} UZS
        </p>
        <p>
          <strong>Taxminiy Maosh:</strong> {salaryBreakdown.totalPayments.toLocaleString('uz-UZ')} UZS × {teacher.percent || 'N/A'}% = 
          {(estimatedSalary || 0).toLocaleString('uz-UZ')} UZS
        </p>
        <button
          onClick={closeBreakdownModal}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
        >
          Yopish
        </button>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4 transition-opacity duration-300 ease-in-out"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 sm:p-8 transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800">
            {salary ? 'Maoshni Tahrirlash' : 'Yangi Maosh Qo‘shish'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Yopish"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 mb-1">
              O‘qituvchi <span className="text-red-500">*</span>
            </label>
            <select
              name="teacherId"
              id="teacherId"
              value={formData.teacherId}
              onChange={handleChange}
              className={`w-full p-3 border rounded-lg shadow-sm transition-colors ${
                errors.teacherId
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
              }`}
              disabled={isLoading}
            >
              <option value="">O‘qituvchi tanlang</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </option>
              ))}
            </select>
            {errors.teacherId && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center">
                <AlertCircle size={14} className="mr-1" />
                {errors.teacherId}
              </p>
            )}
          </div>

          {formData.teacherId && formData.forMonth && formData.forYear && (
            <div className="bg-indigo-50 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <DollarSign size={20} className="text-indigo-600 mr-2" />
                <p className="text-sm font-medium text-indigo-800">
                  Taxminiy maosh:{' '}
                  {isCalculating ? (
                    <span className="animate-pulse">Hisoblanmoqda...</span>
                  ) : estimatedSalary !== null ? (
                    `${Number(estimatedSalary).toLocaleString('uz-UZ')} UZS`
                  ) : (
                    'Hisoblashda xatolik'
                  )}
                </p>
              </div>
              {estimatedSalary !== null && !isCalculating && (
                <button
                  type="button"
                  onClick={openBreakdownModal}
                  className="text-indigo-600 hover:text-indigo-800 transition-colors p-1 rounded-full hover:bg-indigo-100"
                  title="Hisoblash tafsilotlari"
                >
                  <Info size={20} />
                </button>
              )}
            </div>
          )}

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Miqdor (UZS) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="amount"
              id="amount"
              value={formData.amount}
              onChange={handleChange}
              className={`w-full p-3 border rounded-lg shadow-sm transition-colors ${
                errors.amount
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
              }`}
              placeholder="Masalan: 5000000"
              disabled={isLoading}
            />
            {errors.amount && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center">
                <AlertCircle size={14} className="mr-1" />
                {errors.amount}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 mb-1">
              To‘lov Sanasi <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="paymentDate"
              id="paymentDate"
              value={formData.paymentDate}
              onChange={handleChange}
              className={`w-full p-3 border rounded-lg shadow-sm transition-colors ${
                errors.paymentDate
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
              }`}
              disabled={isLoading}
            />
            {errors.paymentDate && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center">
                <AlertCircle size={14} className="mr-1" />
                {errors.paymentDate}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="forMonth" className="block text-sm font-medium text-gray-700 mb-1">
                Oy <span className="text-red-500">*</span>
              </label>
              <select
                name="forMonth"
                id="forMonth"
                value={formData.forMonth}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg shadow-sm transition-colors ${
                  errors.forMonth
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
                disabled={isLoading}
              >
                <option value="">Oy tanlang</option>
                {Object.values(MONTH_MAP).map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              {errors.forMonth && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center">
                  <AlertCircle size={14} className="mr-1" />
                  {errors.forMonth}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="forYear" className="block text-sm font-medium text-gray-700 mb-1">
                Yil <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="forYear"
                id="forYear"
                value={formData.forYear}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg shadow-sm transition-colors ${
                  errors.forYear
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
                placeholder="Masalan: 2025"
                disabled={isLoading}
              />
              {errors.forYear && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center">
                  <AlertCircle size={14} className="mr-1" />
                  {errors.forYear}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Izohlar
            </label>
            <textarea
              name="notes"
              id="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className={`w-full p-3 border rounded-lg shadow-sm transition-colors ${
                errors.notes
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
              }`}
              placeholder="Qo'shimcha ma'lumotlar..."
              disabled={isLoading}
            ></textarea>
            {errors.notes && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center">
                <AlertCircle size={14} className="mr-1" />
                {errors.notes}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Bekor Qilish
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md hover:shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="small" color="text-white" className="mr-2" />
                  Saqlanmoqda...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  {salary ? 'Yangilash' : 'Saqlash'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <Modal
        isOpen={isBreakdownModalOpen}
        onClose={closeBreakdownModal}
        title="Taxminiy Maosh Hisoblash Tafsilotlari"
        size="medium"
      >
        <div className="p-6">{renderBreakdown()}</div>
      </Modal>

      <style jsx>{`
        @keyframes modalShowAnimation {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-modalShow {
          animation: modalShowAnimation 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

SalaryForm.propTypes = {
  token: PropTypes.string.isRequired,
  salary: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  showToast: PropTypes.func.isRequired,
};

export default SalaryForm;