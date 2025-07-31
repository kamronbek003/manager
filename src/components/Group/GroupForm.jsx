import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { apiRequest } from '../../utils/api';
import ErrorMessage from '../Essential/ErrorMessage';
import LoadingSpinner from '../Essential/LoadingSpinner';
import Select from 'react-select';

const GroupForm = ({ token, initialData, teachers, onFormSubmit, onCancel, showToast }) => {
  const [formData, setFormData] = useState({
    groupId: initialData?.groupId || '',
    name: initialData?.name || '', 
    status: initialData?.status || 'FAOL',
    darsJadvali: initialData?.darsJadvali?.split('/') || [], 
    darsVaqt: initialData?.darsVaqt || '',
    coursePrice: initialData?.coursePrice || 0,
    teacherId: initialData?.teacherId || null,
  });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const isEditing = useMemo(() => !!initialData?.id, [initialData]);

  const dayOptions = [
    { value: 'Dush', label: 'Dushanba' },
    { value: 'Sesh', label: 'Seshanba' },
    { value: 'Chor', label: 'Chorshanba' },
    { value: 'Pays', label: 'Payshanba' },
    { value: 'Jum', label: 'Juma' },
    { value: 'Shan', label: 'Shanba' },
    { value: 'Yak', label: 'Yakshanba' },
  ];

  const timeOptions = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push({ value: time, label: time });
    }
  }

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        groupId: initialData.groupId || '',
        name: initialData.name || '',
        status: initialData.status || 'FAOL',
        darsJadvali: initialData.darsJadvali?.split('/') || [],
        darsVaqt: initialData.darsVaqt || '',
        coursePrice: initialData.coursePrice || 0,
        teacherId: initialData.teacherId || null,
      });
      if (initialData.teacherId && teachers?.length > 0) {
        const teacherExists = teachers.some(t => t.id === initialData.teacherId);
        if (!teacherExists) {
          console.warn(`[GroupForm] Initial teacher ID (${initialData.teacherId}) not found in the provided teachers list!`);
        }
      }
    } else if (!isEditing) {
      setFormData({
        groupId: '',
        name: '',
        status: 'FAOL',
        darsJadvali: [],
        darsVaqt: '',
        coursePrice: 0,
        teacherId: null,
      });
    }
  }, [initialData, teachers, isEditing]);

  const handleChange = useCallback((e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : 0) : value,
    }));
  }, []);

  const handleTeacherChange = useCallback((e) => {
    const { value } = e.target;
    const selectedTeacherId = value === '' ? null : value;
    setFormData(prev => ({
      ...prev,
      teacherId: selectedTeacherId,
    }));
  }, []);

  const handleDaysChange = useCallback((selectedOptions) => {
    setFormData(prev => ({
      ...prev,
      darsJadvali: selectedOptions ? selectedOptions.map(option => option.value) : [],
    }));
  }, []);

  const handleTimeChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const [startTime, endTime] = prev.darsVaqt ? prev.darsVaqt.split(' - ') : ['', ''];
      return {
        ...prev,
        darsVaqt: name === 'startTime' ? `${value} - ${endTime || ''}` : `${startTime || ''} - ${value}`,
      };
    });
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setFormError(null);

      const { name } = formData; // Destructuring 'name'

      console.log("YUBORISH OLDIDAN 'NAME' QIYMATI:", name); // <-- SHU YERGA CONSOLE.LOG QO'SHING

      // Validatsiya...
      if (!name.trim()) {
          return showToast("Guruh nomi kiritilishi shart.", "error");
      }

      if (!isEditing && !formData.groupId.trim()) {
        if (showToast) showToast("Guruh ID kiritilishi shart.", "error");
        else setFormError("Guruh ID kiritilishi shart.");
        return;
      }
      if (!formData.name.trim()) {
        if (showToast) showToast("Guruh nomi kiritilishi shart.", "error");
        else setFormError("Guruh nomi kiritilishi shart.");
        return;
      }
      if (formData.darsJadvali.length === 0) {
        if (showToast) showToast("Dars kunlari tanlanishi shart.", "error");
        else setFormError("Dars kunlari tanlanishi shart.");
        return;
      }
      if (!formData.darsVaqt || !formData.darsVaqt.match(/^\d{2}:\d{2} - \d{2}:\d{2}$/)) {
        if (showToast) showToast("Dars vaqti to'g'ri formatda kiritilishi shart (masalan, 14:00 - 16:00).", "error");
        else setFormError("Dars vaqti to'g'ri formatda kiritilishi shart (masalan, 14:00 - 16:00).");
        return;
      }
      if (Number(formData.coursePrice) < 0) {
        if (showToast) showToast("Kurs narxi manfiy bo'lishi mumkin emas.", "error");
        else setFormError("Kurs narxi manfiy bo'lishi mumkin emas.");
        return;
      }

      setLoading(true);

      const payload = {
        ...( !isEditing && { groupId: formData.groupId.trim() }),
        name: formData.name.trim(),
        status: formData.status,
        darsJadvali: formData.darsJadvali.join('/'), 
        darsVaqt: formData.darsVaqt.trim(),
        coursePrice: Number(formData.coursePrice) || 0,
        teacherId: formData.teacherId,
      };

      try {
        let result;
        if (isEditing) {
          result = await apiRequest(`/groups/${initialData.id}`, 'PATCH', payload, token);
          if (showToast) showToast("Guruh muvaffaqiyatli yangilandi!", "success");
        } else {
          result = await apiRequest('/groups', 'POST', payload, token);
          if (showToast) showToast("Guruh muvaffaqiyatli qo'shildi!", "success");
        }
        onFormSubmit(result);
      } catch (err) {
        const defaultErrorMsg = isEditing ? "Guruhni yangilab bo'lmadi." : "Guruh qo’shib bo’lmadi.";
        let errorMessage = err.originalError?.response?.data?.message || err.message || defaultErrorMsg;
        if (Array.isArray(errorMessage)) {
          errorMessage = errorMessage[0];
        }
        console.error('[GroupForm] Form submission error:', err.originalError || err);
        if (showToast) {
          showToast(errorMessage, 'error');
        } else {
          setFormError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    },
    [formData, isEditing, initialData, token, onFormSubmit, showToast]
  );

  const inputBaseClass =
    'mt-1 block w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-150 ease-in-out';
  const labelBaseClass = 'block text-sm font-medium text-gray-700';
  const disabledInputClass = 'bg-gray-100 cursor-not-allowed text-gray-500';
  const buttonBaseClass =
    'px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-150 ease-in-out';

  const selectStyles = {
    control: (provided) => ({
      ...provided,
      minHeight: '38px',
      borderColor: '#d1d5db',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      '&:hover': { borderColor: '#6366f1' },
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 50,
    }),
  };

  const [startTime, endTime] = formData.darsVaqt ? formData.darsVaqt.split(' - ') : ['', ''];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-white shadow-xl rounded-lg">
      {formError && <ErrorMessage message={formError} onClose={() => setFormError(null)} type="error" />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {/* Chap ustun */}
        <div className="space-y-5">
          <div>
            <label htmlFor="groupId" className={labelBaseClass}>
              Guruh ID *
            </label>
            <input
              type="text"
              name="groupId"
              id="groupId"
              value={formData.groupId}
              onChange={handleChange}
              required={!isEditing}
              disabled={isEditing}
              className={`${inputBaseClass} ${isEditing ? disabledInputClass : ''}`}
              aria-required={!isEditing}
              aria-disabled={isEditing}
              placeholder="Masalan: G101, ENG-B2-03"
            />
          </div>
          <div>
            <label htmlFor="name" className={labelBaseClass}>
              Guruh Darajasi *
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={inputBaseClass}
              placeholder="Masalan: Matematika A1"
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="darsJadvali" className={labelBaseClass}>
              Dars Kunlari *
            </label>
            <Select
              id="darsJadvali"
              isMulti
              options={dayOptions}
              value={dayOptions.filter(option => formData.darsJadvali.includes(option.value))}
              onChange={handleDaysChange}
              className="mt-1"
              styles={selectStyles}
              placeholder="Dars kunlarini tanlang..."
              required
              aria-required="true"
            />
          </div>
        </div>

        {/* O'ng ustun */}
        <div className="space-y-5">
          <div>
            <label htmlFor="darsVaqt" className={labelBaseClass}>
              Dars Vaqti *
            </label>
            <div className="flex items-center space-x-2">
              <select
                name="startTime"
                id="startTime"
                value={startTime}
                onChange={handleTimeChange}
                className={`${inputBaseClass} bg-white flex-1`}
                required
                aria-required="true"
              >
                <option value="">Boshlanishi</option>
                {timeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span>-</span>
              <select
                name="endTime"
                id="endTime"
                value={endTime}
                onChange={handleTimeChange}
                className={`${inputBaseClass} bg-white flex-1`}
                required
                aria-required="true"
              >
                <option value="">Tugashi</option>
                {timeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="coursePrice" className={labelBaseClass}>
              Kurs Narxi (oylik)
            </label>
            <input
              type="number"
              name="coursePrice"
              id="coursePrice"
              value={formData.coursePrice}
              onChange={handleChange}
              min="0"
              className={`${inputBaseClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              placeholder="Masalan: 500000"
            />
          </div>
          <div>
            <label htmlFor="teacherId" className={labelBaseClass}>
              O'qituvchi
            </label>
            <select
              name="teacherId"
              id="teacherId"
              value={formData.teacherId ?? ''}
              onChange={handleTeacherChange}
              className={`${inputBaseClass} bg-white`}
            >
              <option value="">Biriktirilmagan</option>
              {teachers && teachers.length > 0 ? (
                teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.firstName} {teacher.lastName}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  O'qituvchilar ro'yxati topilmadi
                </option>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="status" className={labelBaseClass}>
              Status
            </label>
            <select
              name="status"
              id="status"
              value={formData.status}
              onChange={handleChange}
              className={`${inputBaseClass} bg-white`}
            >
              <option value="FAOL">Faol</option>
              <option value="NOFAOL">Nofaol</option>
              <option value="TUGATGAN">Tugatgan</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-8 mt-8 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className={`${buttonBaseClass} bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400`}
        >
          Bekor qilish
        </button>
        <button
          type="submit"
          disabled={loading}
          className={`${buttonBaseClass} text-white min-w-[120px] flex items-center justify-center ${
            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
          }`}
        >
          {loading ? <LoadingSpinner size="small" color="white" /> : isEditing ? 'Yangilash' : "Qo’shish"}
        </button>
      </div>
    </form>
  );
};

export default GroupForm;