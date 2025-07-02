import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { apiRequest } from '../../utils/api';
import ErrorMessage from '../Essential/ErrorMessage';
import LoadingSpinner from '../Essential/LoadingSpinner';
import { DollarSign, Calendar, CreditCard, Banknote, Search, Check, AlertCircle, AlertTriangle, UserCheck, UserX, Users } from 'lucide-react';

const PaymentType = {
  NAQD: 'NAQD',
  KARTA: 'KARTA',
  BANK: 'BANK',
};

const ExistMonths = {
  YANVAR: 'Yanvar',
  FEVRAL: 'Fevral',
  MART: 'Mart',
  APREL: 'Aprel',
  MAY: 'May',
  IYUN: 'Iyun',
  IYUL: 'Iyul',
  AVGUST: 'Avgust',
  SENTABR: 'Sentabr',
  OKTABR: 'Oktabr',
  NOYABR: 'Noyabr',
  DEKABR: 'Dekabr',
};

const formatDateToYYYYMMDD = (dateInput) => {
  if (!dateInput) return '';
  try {
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-').map(Number);
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      if (isNaN(dateObj.getTime()) || dateObj.getUTCFullYear() !== year || dateObj.getUTCMonth() + 1 !== month || dateObj.getUTCDate() !== day) {
        console.warn('Invalid YYYY-MM-DD string:', dateInput);
        return '';
      }
      return dateInput;
    }
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      console.warn('Invalid dateInput:', dateInput);
      return '';
    }
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error('Error formatting date to YYYY-MM-DD:', e);
    return '';
  }
};

const formatYYYYMMDDToDDMMYYYY = (yyyymmdd) => {
  if (!yyyymmdd || typeof yyyymmdd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(yyyymmdd)) {
    console.warn('Invalid input for formatYYYYMMDDToDDMMYYYY:', yyyymmdd);
    return '';
  }
  try {
    const [year, month, day] = yyyymmdd.split('-');
    const dateObj = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));
    if (isNaN(dateObj.getTime()) || dateObj.getUTCFullYear() !== parseInt(year, 10) || dateObj.getUTCMonth() + 1 !== parseInt(month, 10) || dateObj.getUTCDate() !== parseInt(day, 10)) {
      console.warn('Invalid date components:', yyyymmdd);
      return '';
    }
    return `${day}-${month}-${year}`;
  } catch (e) {
    console.error('Error converting YYYY-MM-DD to DD-MM-YYYY:', e);
    return '';
  }
};

const getAvailableYears = () => {
  const currentYear = new Date().getUTCFullYear();
  const years = [];
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    years.push(i);
  }
  return years;
};

const PaymentForm = ({ token, initialData, students, studentsLoading, studentsError, groups, onFormSubmit, onCancel, showToast }) => {
  const defaultFormState = {
    summa: '',
    date: formatDateToYYYYMMDD(new Date()),
    paymentType: PaymentType.NAQD,
    whichMonth: '',
    whichYear: String(new Date().getUTCFullYear()),
    groupId: '',
  };

  const [formData, setFormData] = useState(defaultFormState);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [foundStudentPrimaryId, setFoundStudentPrimaryId] = useState(null);
  const [studentSearchMessage, setStudentSearchMessage] = useState({ text: '', type: 'info' });
  const [groupSearchMessage, setGroupSearchMessage] = useState({ text: '', type: 'info' });
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const groupDropdownRef = useRef(null);
  const isEditing = useMemo(() => !!initialData?.id, [initialData]);

  const normalizedStudents = useMemo(() => {
    if (!students) {
      console.warn('Students prop is undefined or null');
      return [];
    }
    if (Array.isArray(students)) return students;
    if (students.data && Array.isArray(students.data)) return students.data;
    if (students.data && students.data.data && Array.isArray(students.data.data)) return students.data.data;
    console.warn('Unexpected students prop structure:', students);
    return [];
  }, [students]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target)) {
        setIsGroupDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        summa: initialData.summa !== undefined ? String(initialData.summa) : '',
        date: initialData.date ? formatDateToYYYYMMDD(initialData.date) : formatDateToYYYYMMDD(new Date()),
        paymentType: initialData.paymentType || PaymentType.NAQD,
        whichMonth: initialData.whichMonth || '',
        whichYear: initialData.whichYear ? String(initialData.whichYear) : String(new Date().getUTCFullYear()),
        groupId: initialData.groupId || '',
      });

      if (initialData.studentId && normalizedStudents.length > 0) {
        console.debug('Initializing with studentId:', initialData.studentId);
        setFoundStudentPrimaryId(initialData.studentId);
        const initialStudent = normalizedStudents.find(s => s.id === initialData.studentId);
        if (initialStudent) {
          setStudentSearchTerm(initialStudent.studentId || '');
          setStudentSearchMessage({
            text: `✅ Topildi: ${initialStudent.firstName} ${initialStudent.lastName} (${initialStudent.studentId})`,
            type: 'success',
        });
        } else if (initialData.student) {
          setStudentSearchTerm(initialData.student.studentId || '');
          setStudentSearchMessage({
            text: `✅ Talaba: ${initialData.student.firstName} ${initialData.student.lastName} (${initialData.student.studentId}) (Tahrirlanmoqda)`,
            type: 'success',
          });
        } else {
          setStudentSearchTerm('');
          setStudentSearchMessage({
            text: '⚠️ Tahrirlanayotgan talabaning IDsi topilmadi.',
            type: 'warning',
          });
        }
      }

      if (initialData.groupId && groups) {
        const initialGroup = groups.find(g => g.id === initialData.groupId);
        if (initialGroup) {
          setGroupSearchMessage({
            text: `✅ Guruh: ${initialGroup.name || initialGroup.groupId} tanlandi`,
            type: 'success',
          });
        }
      }
    } else {
      setFormData(defaultFormState);
      setStudentSearchTerm('');
      setFoundStudentPrimaryId(null);
      setStudentSearchMessage({ text: '', type: 'info' });
      setGroupSearchMessage({ text: '', type: 'info' });
    }
  }, [isEditing, initialData, normalizedStudents, groups]);

  const availableGroups = useMemo(() => {
  if (!foundStudentPrimaryId || !normalizedStudents || !groups) {
    console.warn('Missing data for availableGroups:', { foundStudentPrimaryId, normalizedStudents, groups });
    return [];
  }

  const selectedStudent = normalizedStudents.find(s => s.id === foundStudentPrimaryId);
  if (!selectedStudent) {
    console.warn('Selected student not found for ID:', foundStudentPrimaryId);
    return [];
  }

  if (!selectedStudent.groups || !Array.isArray(selectedStudent.groups) || selectedStudent.groups.length === 0) {
    console.warn('Student has no groups or invalid groups array:', selectedStudent);
    return [];
  }

  console.log('Student groups:', selectedStudent.groups);
  console.log('Available groups:', groups);

  return groups.filter(g => selectedStudent.groups.some(sg => {
    const match = String(sg.id) === String(g.id);
    console.log('Comparing group IDs:', { studentGroupId: sg.id, groupId: g.id, match });
    return match;
  }));
}, [foundStudentPrimaryId, normalizedStudents, groups]);

  const paymentDetails = useMemo(() => {
    if (!formData.groupId || !groups || !foundStudentPrimaryId || !normalizedStudents) {
      return { originalPrice: 0, discountAmount: 0, finalPrice: 0 };
    }
    const group = groups.find(g => g.id === formData.groupId);
    const student = normalizedStudents.find(s => s.id === foundStudentPrimaryId);
    const originalPrice = parseFloat(group?.coursePrice || 0);
    const discountPercent = parseInt(student?.discount || 0) || 0;
    const discountAmount = originalPrice * (discountPercent / 100);
    const finalPrice = originalPrice - discountAmount;
    return {
      originalPrice: Math.round(originalPrice),
      discountAmount: Math.round(discountAmount),
      finalPrice: Math.round(finalPrice),
    };
  }, [formData.groupId, groups, foundStudentPrimaryId, normalizedStudents]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleStudentSearchChange = useCallback((e) => {
    const searchTerm = e.target.value;
    setStudentSearchTerm(searchTerm);
    setFoundStudentPrimaryId(null);
    setStudentSearchMessage({ text: '', type: 'info' });
    setFormData(prev => ({ ...prev, groupId: '' }));
    setGroupSearchMessage({ text: '', type: 'info' });

    if (studentsLoading) {
      setStudentSearchMessage({ text: "Talabalar ro'yxati yuklanmoqda...", type: 'info' });
      return;
    }
    if (studentsError) {
      setStudentSearchMessage({ text: "Talabalar ro'yxatini yuklashda xato.", type: 'error' });
      return;
    }
    if (!normalizedStudents || normalizedStudents.length === 0) {
      console.warn('No students available:', normalizedStudents);
      setStudentSearchMessage({ text: "Talabalar ro'yxati bo'sh.", type: 'warning' });
      return;
    }

    const trimmedSearchTerm = searchTerm.trim();
    if (trimmedSearchTerm) {
      console.debug('Searching for studentId:', trimmedSearchTerm);
      const found = normalizedStudents.find(student => {
        if (!student.studentId) {
          console.warn('Student missing studentId:', student);
          return false;
        }
        return student.studentId.trim().toLowerCase() === trimmedSearchTerm.toLowerCase();
      });
      console.debug('Search result:', found);

      if (found) {
        console.log('Setting foundStudentPrimaryId:', found.id);
        setFoundStudentPrimaryId(found.id);
        setStudentSearchMessage({
          text: `✅ Topildi: ${found.firstName} ${found.lastName} (${found.studentId})`,
          type: 'success',
        });
      } else {
        setStudentSearchMessage({
          text: `❌ Student ID "${trimmedSearchTerm}" topilmadi.`,
          type: 'error',
        });
      }
    }
  }, [studentsLoading, studentsError, normalizedStudents]);

  const handleGroupSelect = useCallback((groupId) => {
    setFormData(prev => ({ ...prev, groupId }));
    const group = availableGroups.find(g => g.id === groupId);
    setGroupSearchMessage({
      text: group ? `✅ Guruh: ${group.name || group.groupId} tanlandi` : '',
      type: 'success',
    });
    setIsGroupDropdownOpen(false);
  }, [availableGroups]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError(null);

    if (!foundStudentPrimaryId) {
      const msg = "Iltimos, mavjud talaba tanlang.";
      setError(msg);
      showToast?.(msg, 'error', 4000, 'top-right');
      return;
    }
    if (!formData.groupId) {
      const msg = "Iltimos, guruh tanlang.";
      setError(msg);
      showToast?.(msg, 'error', 4000, 'top-right');
      return;
    }
    if (!formData.date) {
      const msg = "Iltimos, to'lov sanasini kiriting.";
      setError(msg);
      showToast?.(msg, 'error', 4000, 'top-right');
      return;
    }
    const summaValue = parseFloat(formData.summa);
    if (isNaN(summaValue) || summaValue <= 0) {
      const msg = "Summa musbat raqam bo'lishi kerak.";
      setError(msg);
      showToast?.(msg, 'error', 4000, 'top-right');
      return;
    }
    const dateToSend = formatYYYYMMDDToDDMMYYYY(formData.date);
    if (!dateToSend) {
      const msg = "Sana formatida xatolik. Yaroqli sana kiriting (Masalan: 17-05-2025).";
      setError(msg);
      showToast?.(msg, 'error', 4000, 'top-right');
      return;
    }
    if ((formData.whichMonth && !formData.whichYear) || (!formData.whichMonth && formData.whichYear)) {
      const msg = "Oy va yil birgalikda tanlanishi yoki ikkalasi ham bo'sh bo'lishi kerak.";
      setError(msg);
      showToast?.(msg, 'error', 4000, 'top-right');
      return;
    }

    setLoading(true);

    const payload = {
      studentId: foundStudentPrimaryId,
      groupId: formData.groupId,
      summa: summaValue,
      date: dateToSend,
      paymentType: formData.paymentType,
      whichMonth: formData.whichMonth || undefined,
      whichYear: formData.whichYear ? parseInt(formData.whichYear) : undefined,
    };

    try {
      const endpoint = isEditing ? `/payments/${initialData.id}` : '/payments';
      const method = isEditing ? 'PATCH' : 'POST';
      const result = await apiRequest(endpoint, method, payload, token);
      onFormSubmit(result);
      showToast?.(
        isEditing ? "To'lov muvaffaqiyatli yangilandi!" : "To'lov muvaffaqiyatli qo'shildi!",
        'success',
        4000,
        'top-right'
      );
    } catch (err) {
      let serverErrorMessage = err.originalError?.response?.data?.message || err.message;
      if (Array.isArray(serverErrorMessage)) {
        serverErrorMessage = serverErrorMessage.join('; ');
      }
      const defaultErrorMsg = isEditing ? "To'lovni yangilab bo'lmadi." : "To'lov qo'shib bo'lmadi.";
      const finalErrorMessage = serverErrorMessage || defaultErrorMsg;
      setError(finalErrorMessage);
      showToast?.(finalErrorMessage, 'error', 5000, 'top-right');
      console.error('Form submission error:', err.originalError || err);
    } finally {
      setLoading(false);
    }
  }, [formData, isEditing, initialData, token, onFormSubmit, foundStudentPrimaryId, showToast]);

  const inputBaseClass = 'block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all duration-200 bg-white';
  const labelBaseClass = 'block text-sm font-semibold text-gray-700 mb-2 flex items-center';
  const disabledInputClass = 'bg-gray-100 cursor-not-allowed text-gray-400 border-gray-200';
  const dropdownButtonClass = 'w-full flex items-center justify-between text-left px-4 py-3 border rounded-xl shadow-sm focus:outline-none text-sm transition-all duration-200';

  const currentYear = new Date().getUTCFullYear();
  const currentMonthIndex = new Date().getUTCMonth();
  const availableMonths = Object.entries(ExistMonths).filter(([_, value], index) => {
    if (parseInt(formData.whichYear) === currentYear) {
      return index <= currentMonthIndex;
    }
    return true;
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8 bg-gradient-to-br from-gray-50 to-white shadow-2xl rounded-2xl max-w-2xl mx-auto">
      {error && <ErrorMessage message={error} onClose={() => setError(null)} type="error" />}
      {loading && (
        <div className="my-4 flex items-center justify-center">
          <LoadingSpinner size="small" color="indigo-600" />
          <p className="ml-2 text-sm text-indigo-600">To'lov jo'natilmoqda...</p>
        </div>
      )}
      {studentsError && <ErrorMessage message={`Talabalar ro'yxatini yuklashda xatolik: ${studentsError}`} type="warning" />}

      <div className="space-y-6">
        <div className="p-4 bg-white rounded-xl shadow-md">
          <label htmlFor="studentSearch" className={labelBaseClass}>
            <Search size={18} className="mr-2 text-indigo-500" />
            Talaba ID *
          </label>
          <div className="relative">
            <input
              type="text"
              id="studentSearch"
              name="studentSearch"
              value={studentSearchTerm}
              onChange={handleStudentSearchChange}
              placeholder="Talabaning ID raqamini kiriting..."
              disabled={studentsLoading || !!studentsError || isEditing}
              className={`${inputBaseClass} ${studentsLoading || !!studentsError || isEditing ? disabledInputClass : ''}`}
              required={!isEditing}
              autoComplete="off"
              aria-describedby="studentSearchMessage"
            />
            {studentSearchTerm && !studentsLoading && !studentsError && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                {foundStudentPrimaryId ? (
                  <Check size={20} className="text-green-500" />
                ) : (
                  <AlertCircle size={20} className="text-red-500" />
                )}
              </div>
            )}
          </div>
          <div className="mt-2 min-h-[1.25rem]" id="studentSearchMessage">
            {studentSearchMessage.text && (
              <p
                className={`text-xs flex items-center ${
                  studentSearchMessage.type === 'success' ? 'text-green-600' :
                  studentSearchMessage.type === 'error' ? 'text-red-600' :
                  studentSearchMessage.type === 'warning' ? 'text-yellow-600' : 'text-gray-500'
                }`}
              >
                {studentSearchMessage.type === 'success' && <UserCheck size={14} className="mr-1" />}
                {studentSearchMessage.type === 'error' && <UserX size={14} className="mr-1" />}
                {studentSearchMessage.type === 'warning' && <AlertTriangle size={14} className="mr-1" />}
                {studentSearchMessage.text}
              </p>
            )}
            {(studentsLoading || !!studentsError) && !studentSearchMessage.text && (
              <p className="text-xs text-yellow-600 flex items-center">
                <AlertTriangle size={14} className="mr-1" />
                {studentsLoading ? "Talabalar ro'yxati yuklanmoqda..." : "Talabalar ro'yxatini yuklashda xatolik."}
              </p>
            )}
            {normalizedStudents.length === 0 && !studentsLoading && !studentsError && !studentSearchMessage.text && (
              <p className="text-xs text-yellow-600 flex items-center">
                <AlertTriangle size={14} className="mr-1" />
                Talabalar ro'yxati bo'sh yoki noto'g'ri ma'lumotlar.
              </p>
            )}
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl shadow-md" ref={groupDropdownRef}>
          <label htmlFor="groupSelect" className={labelBaseClass}>
            <Users size={18} className="mr-2 text-indigo-500" />
            Guruh *
          </label>
          <button
            type="button"
            id="groupSelect"
            onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
            disabled={!foundStudentPrimaryId || availableGroups.length === 0 || loading}
            className={`${dropdownButtonClass} ${
              isGroupDropdownOpen ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-300'
            } ${!foundStudentPrimaryId || availableGroups.length === 0 || loading ? disabledInputClass : 'bg-white hover:border-indigo-500'}`}
            aria-expanded={isGroupDropdownOpen}
            aria-controls="groupDropdown"
          >
            <span className="truncate text-sm text-green-600">
              {formData.groupId
                ? availableGroups.find(g => g.id === formData.groupId)?.name || `${"Guruh tanlandi"}`
                : availableGroups.length === 0
                ? 'Guruhlar topilmadi'
                : 'Guruh tanlang...'}
            </span>
            <svg className={`w-4 h-4 transition-transform ${isGroupDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isGroupDropdownOpen && availableGroups.length > 0 && (
            <div id="groupDropdown" className="absolute z-50 mt-2 w-full bg-white shadow-2xl border border-gray-200 rounded-xl max-h-64 overflow-y-auto p-2">
              {availableGroups.map(group => (
                <div
                  key={group.id}
                  onClick={() => handleGroupSelect(group.id)}
                  className={`px-4 py-2 hover:bg-indigo-50 cursor-pointer rounded-lg flex items-center ${
                    formData.groupId === group.id ? 'bg-indigo-100' : ''
                  }`}
                  role="option"
                  aria-selected={formData.groupId === group.id}
                >
                  <span className={`flex-1 text-sm ${formData.groupId === group.id ? 'font-semibold text-indigo-700' : 'text-gray-700'}`}>
                    {group.name || group.groupId}
                    {group.coursePrice && (
                      <span className="text-xs text-gray-400 ml-2">({group.coursePrice.toLocaleString('uz-UZ')} so'm)</span>
                    )}
                  </span>
                  {formData.groupId === group.id && <Check size={16} className="text-indigo-600" />}
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 min-h-[1.25rem]">
            {groupSearchMessage.text && (
              <p className={`text-xs flex items-center ${groupSearchMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {groupSearchMessage.type === 'success' && <Check size={14} className="mr-1" />}
                {groupSearchMessage.type === 'error' && <AlertCircle size={14} className="mr-1" />}
                {groupSearchMessage.text}
              </p>
            )}
            {!foundStudentPrimaryId && !groupSearchMessage.text && (
              <p className="text-xs text-gray-500">Avval talaba tanlang.</p>
            )}
            {foundStudentPrimaryId && availableGroups.length === 0 && !groupSearchMessage.text && (
              <p className="text-xs text-yellow-600 flex items-center">
                <AlertTriangle size={14} className="mr-1" />
                Bu talaba uchun guruhlar topilmadi. Iltimos, talabaning guruhlarini tizimda tekshiring.
              </p>
            )}
          </div>
        </div>

        {formData.groupId && paymentDetails.originalPrice > 0 && (
          <div className="p-4 bg-indigo-50 rounded-xl shadow-md">
            <h3 className="text-sm font-semibold text-indigo-700 mb-3 flex items-center">
              <DollarSign size={18} className="mr-2" />
              To'lov Xulosa
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <p>Asl narx:</p>
              <p className="font-bold">{paymentDetails.originalPrice.toLocaleString('uz-UZ')} so'm</p>
              {paymentDetails.discountAmount > 0 && (
                <>
                  <p>Chegirma ({normalizedStudents.find(s => s.id === foundStudentPrimaryId)?.discount || 0}%):</p>
                  <p className="font-bold text-red-600">-{paymentDetails.discountAmount.toLocaleString('uz-UZ')} so'm</p>
                </>
              )}
              <p>Yakuniy narx:</p>
              <p className="font-bold text-green-600">{paymentDetails.finalPrice.toLocaleString('uz-UZ')} so'm</p>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="summa" className={labelBaseClass}>
            <DollarSign size={18} className="mr-2 text-indigo-500" />
            Summa *
          </label>
          <input
            type="number"
            name="summa"
            id="summa"
            value={formData.summa}
            onChange={handleChange}
            required
            min="1"
            placeholder="To'lov summasi (so'm)"
            className={`${inputBaseClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            aria-describedby="summaHint"
          />
          {paymentDetails.finalPrice > 0 && (
            <p id="summaHint" className="text-xs text-gray-500 mt-1">
              Tavsiya etilgan summa: {paymentDetails.finalPrice.toLocaleString('uz-UZ')} so'm
            </p>
          )}
        </div>

        <div>
          <label htmlFor="date" className={labelBaseClass}>
            <Calendar size={18} className="mr-2 text-indigo-500" />
            Sana *
          </label>
          <input
            type="date"
            name="date"
            id="date"
            value={formData.date}
            onChange={handleChange}
            required
            className={inputBaseClass}
          />
        </div>

        <div>
          <label htmlFor="paymentType" className={labelBaseClass}>
            {formData.paymentType === PaymentType.NAQD && <DollarSign size={18} className="mr-2 text-indigo-500" />}
            {formData.paymentType === PaymentType.KARTA && <CreditCard size={18} className="mr-2 text-indigo-500" />}
            {formData.paymentType === PaymentType.BANK && <Banknote size={18} className="mr-2 text-indigo-500" />}
            To'lov turi *
          </label>
          <select
            name="paymentType"
            id="paymentType"
            value={formData.paymentType}
            onChange={handleChange}
            required
            className={inputBaseClass}
          >
            {Object.entries(PaymentType).map(([key, value]) => (
              <option key={value} value={value}>
                {key.charAt(0) + key.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="whichMonth" className={labelBaseClass}>
              <Calendar size={18} className="mr-2 text-indigo-500" />
              Oy
            </label>
            <select
              name="whichMonth"
              id="whichMonth"
              value={formData.whichMonth}
              onChange={handleChange}
              className={inputBaseClass}
            >
              <option value="">Oy tanlanmagan</option>
              {availableMonths.map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="whichYear" className={labelBaseClass}>
              <Calendar size={18} className="mr-2 text-indigo-500" />
              Yil
            </label>
            <select
              name="whichYear"
              id="whichYear"
              value={formData.whichYear}
              onChange={handleChange}
              className={inputBaseClass}
            >
              <option value="">Yil tanlanmagan</option>
              {getAvailableYears().map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all duration-200 font-semibold text-sm shadow-sm hover:shadow-md"
        >
          Bekor qilish
        </button>
        <button
          type="submit"
          disabled={loading || studentsLoading || !!studentsError || !foundStudentPrimaryId || !formData.groupId}
          className={`px-6 py-3 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all duration-200 min-w-[120px] flex items-center justify-center font-semibold text-sm shadow-md hover:shadow-lg ${
            loading || studentsLoading || !!studentsError || !foundStudentPrimaryId || !formData.groupId
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {loading ? <LoadingSpinner size="sm" className="text-white" /> : isEditing ? 'Yangilash' : "Qo'shish"}
        </button>
      </div>
    </form>
  );
};

export default PaymentForm;