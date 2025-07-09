import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react'; 
import { parseDDMMYYYY, formatDDMMYYYY } from '../../utils/helpers';
import { apiRequest } from '../../utils/api';
import ErrorMessage from '../Essential/ErrorMessage';
import LoadingSpinner from '../Essential/LoadingSpinner';
import { percent } from 'framer-motion';

const TeacherForm = ({ 
    token, 
    initialData, 
    onFormSubmit, 
    onCancel,
    showToast 
}) => {
    const [formData, setFormData] = useState({
        firstName: initialData?.firstName || '',
        lastName: initialData?.lastName || '',
        phone: initialData?.phone || '',
        password: '', 
        address: initialData?.address || '',
        dateBirth: initialData?.dateBirth ? formatDDMMYYYY(initialData.dateBirth) : '', 
        experience: initialData?.experience || 0,
        startedAt: initialData?.startedAt ? formatDDMMYYYY(initialData.startedAt) : '', 
        subject: initialData?.subject || '',
        percent: initialData?.percent || 50,

    });
    const [isPasswordVisible, setIsPasswordVisible] = useState(false); 
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState(null);

    const isEditing = useMemo(() => !!initialData?.id, [initialData]);

    useEffect(() => {
        if (isEditing && initialData) {
            setFormData({
                firstName: initialData.firstName || '',
                lastName: initialData.lastName || '',
                phone: initialData.phone || '',
                password: '', 
                address: initialData.address || '',
                dateBirth: initialData.dateBirth ? formatDDMMYYYY(initialData.dateBirth) : '',
                experience: initialData.experience || 0,
                startedAt: initialData.startedAt ? formatDDMMYYYY(initialData.startedAt) : '',
                subject: initialData.subject || '',
                percent: initialData.percent || 50,
            });
        } else if (!isEditing) {
             setFormData({
                firstName: '', lastName: '', phone: '', password: '', address: '',
                dateBirth: '', experience: 0, startedAt: '', subject: '', percent: 50, 
            });
        }
    }, [initialData, isEditing]);

    const handleChange = useCallback((e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value ? parseFloat(value) : '') : value, 
        }));
    }, []);

    const handleSubmit = useCallback(async (e) => {
  e.preventDefault();
  setFormError(null);

  if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim() || !formData.address.trim()) {
    if (showToast) showToast("Barcha yulduzchali (*) maydonlarni to'ldiring.", "error");
    else setFormError("Barcha yulduzchali (*) maydonlarni to'ldiring.");
    return;
  }
  if (!isEditing && (!formData.password || formData.password.length < 6)) {
    if (showToast) showToast("Yangi o'qituvchi uchun kamida 6 belgidan iborat parol kiritilishi shart.", "error");
    else setFormError("Yangi o'qituvchi uchun kamida 6 belgidan iborat parol kiritilishi shart.");
    return;
  }
  if (isEditing && formData.password && formData.password.length > 0 && formData.password.length < 6) {
    if (showToast) showToast("Parolni o'zgartirish uchun kamida 6 belgi kiritilishi kerak.", "error");
    else setFormError("Parolni o'zgartirish uchun kamida 6 belgi kiritilishi kerak.");
    return;
  }

  const parsedDateBirth = parseDDMMYYYY(formData.dateBirth);
  if (formData.dateBirth && !parsedDateBirth) {
    if (showToast) showToast('Tug\'ilgan sana formati noto\'g\'ri (DD-MM-YYYY).', 'error');
    else setFormError('Tug\'ilgan sana formati noto\'g\'ri (DD-MM-YYYY).');
    return;
  }
  const parsedStartedAt = parseDDMMYYYY(formData.startedAt);
  if (formData.startedAt && !parsedStartedAt) {
    if (showToast) showToast('Ish boshlagan sana formati noto\'g\'ri (DD-MM-YYYY).', 'error');
    else setFormError('Ish boshlagan sana formati noto\'g\'ri (DD-MM-YYYY).');
    return;
  }

  const experienceValue = parseFloat(String(formData.experience));
  if (formData.experience !== '' && (isNaN(experienceValue) || experienceValue < 0)) {
    if (showToast) showToast("Tajriba musbat son yoki 0 bo'lishi kerak.", "error");
    else setFormError("Tajriba musbat son yoki 0 bo'lishi kerak.");
    return;
  }

  setLoading(true);

  const payload = {
    firstName: formData.firstName,
    lastName: formData.lastName,
    phone: formData.phone,
    address: formData.address,
    dateBirth: formData.dateBirth || undefined,
    startedAt: formData.startedAt || undefined, 
    experience: formData.experience === '' ? 0 : experienceValue,
    subject: formData.subject,
    percent: formData.percent,
  };

  if (formData.password) {
    payload.password = formData.password;
  }

  console.log("[TeacherForm] Submitting payload:", payload);

  try {
    let result;
    if (isEditing) {
      result = await apiRequest(`/teachers/${initialData.id}`, 'PATCH', payload, token);
      if (showToast) showToast("O'qituvchi muvaffaqiyatli yangilandi!", "success");
    } else {
      result = await apiRequest('/teachers', 'POST', payload, token);
      if (showToast) showToast("O'qituvchi muvaffaqiyatli qo'shildi!", "success");
    }
    console.log("[TeacherForm] API Response:", result);
    onFormSubmit(result);
  } catch (err) {
    const defaultErrorMsg = isEditing ? 'O\'qituvchini yangilab bo\'lmadi.' : 'O\'qituvchi qo\'shib bo\'lmadi.';
    let errorMessage = err.originalError?.response?.data?.message || err.message || defaultErrorMsg;
    if (Array.isArray(errorMessage)) {
      errorMessage = errorMessage.join('; ');
    }
    console.error("[TeacherForm] Form submission error:", err.originalError || err);
    if (showToast) {
      showToast(errorMessage, "error");
    } else {
      setFormError(errorMessage);
    }
  } finally {
    setLoading(false);
  }
}, [formData, isEditing, initialData, token, onFormSubmit, showToast]);

    const inputBaseClass = "mt-1 block w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-150 ease-in-out";
    const labelBaseClass = "block text-sm font-medium text-gray-700";
    const buttonBaseClass = "px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-150 ease-in-out";

    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-white shadow-xl rounded-lg">
            {formError && !showToast && <ErrorMessage message={formError} onClose={() => setFormError(null)} />}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                {/* Chap ustun */}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="firstName" className={labelBaseClass}>Ism *</label>
                        <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} required className={inputBaseClass} aria-required="true"/>
                    </div>
                    <div>
                        <label htmlFor="lastName" className={labelBaseClass}>Familiya *</label>
                        <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} required className={inputBaseClass} aria-required="true"/>
                    </div>
                    <div>
                        <label htmlFor="phone" className={labelBaseClass}>Telefon *</label>
                        <input type="text" name="phone" id="phone" value={formData.phone} onChange={handleChange} required className={inputBaseClass} aria-required="true" placeholder="+998YYXXXXXXX"/>
                    </div>
                    <div>
                        <label htmlFor="password" className={labelBaseClass}>Parol {isEditing ? '(O\'zgartirish uchun kiriting, min 6 belgi)' : '* (min 6 belgi)'}</label>
                        <div className="relative">
                            <input 
                                type={isPasswordVisible ? 'text' : 'password'} 
                                name="password" 
                                id="password" 
                                value={formData.password} 
                                onChange={handleChange} 
                                required={!isEditing} 
                                minLength={formData.password ? 6 : (isEditing ? undefined : 6)}
                                className={`${inputBaseClass} pr-10`} 
                                aria-required={!isEditing}
                                placeholder={isEditing ? "O'zgartirmasangiz bo'sh qoldiring" : "Kamida 6 ta belgi"}
                            />
                            <button
                                type="button"
                                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-indigo-600"
                                aria-label={isPasswordVisible ? "Parolni yashirish" : "Parolni ko'rsatish"}
                            >
                                {isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="subject" className={labelBaseClass}>Fan</label>
                        <input type="text" name="subject" id="subject" value={formData.subject} onChange={handleChange} className={inputBaseClass} placeholder="Masalan: Matematika"/>
                    </div>
                </div>

                {/* O'ng ustun */}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="address" className={labelBaseClass}>Manzil *</label>
                        <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} required className={inputBaseClass} aria-required="true"/>
                    </div>
                    <div>
                        <label htmlFor="dateBirth" className={labelBaseClass}>Tug'ilgan sana</label>
                        <input type="text" name="dateBirth" id="dateBirth" value={formData.dateBirth} onChange={handleChange} placeholder="DD-MM-YYYY" pattern="\d{2}-\d{2}-\d{4}" title="Format: DD-MM-YYYY" className={inputBaseClass}/>
                    </div>
                    <div>
                        <label htmlFor="experience" className={labelBaseClass}>Tajriba (yil)</label> 
                        <input 
                            type="number" 
                            name="experience" 
                            id="experience" 
                            value={formData.experience} 
                            onChange={handleChange} 
                            min="0" 
                            step="0.5" 
                            className={`${inputBaseClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} 
                            placeholder="Masalan: 5.5"
                        />
                    </div>
                    <div>
                        <label htmlFor="startedAt" className={labelBaseClass}>Ish boshlagan sana</label>
                        <input type="text" name="startedAt" id="startedAt" value={formData.startedAt} onChange={handleChange} placeholder="DD-MM-YYYY" pattern="\d{2}-\d{2}-\d{4}" title="Format: DD-MM-YYYY" className={inputBaseClass}/>
                    </div>
                    <div>
                        <label htmlFor="percent" className={labelBaseClass}>Ishlash foizi</label>
                        <input type="text" name="percent" id="percent" value={formData.percent} onChange={handleChange} placeholder="40" className={inputBaseClass}/>
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
                    {loading ? <LoadingSpinner size="small" color="white" /> : (isEditing ? 'Yangilash' : 'Qo\'shish')}
                </button>
            </div>
        </form>
    );
};

export default TeacherForm;
