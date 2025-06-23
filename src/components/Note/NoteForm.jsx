import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { apiRequest } from '../../utils/api';
import ErrorMessage from '../Essential/ErrorMessage';

const NoteForm = ({ token, initialData, onFormSubmit, onCancel, showToast }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        callDate: '', 
        time: '',    
        about: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const isEditing = useMemo(() => !!initialData?.id, [initialData]);

    useEffect(() => {
        let initialTime = '';
        if (initialData?.callDate) {
            try {
                initialTime = new Date(initialData.callDate).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false 
                });
            } catch (e) {
                console.error("Error parsing initial callDate for time:", e);
                initialTime = '00:00'; 
            }
        }

        setFormData({
            fullName: initialData?.fullName || '',
            phone: initialData?.phone || '',
            callDate: initialData?.callDate ? new Date(initialData.callDate).toISOString().split('T')[0] : '',
            time: initialTime, 
            about: initialData?.about || '',
        });
        setError(null);
        setLoading(false);
    }, [initialData]);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.fullName || !formData.phone || !formData.callDate) {
            const msg = "Iltimos, barcha majburiy (*) maydonlarni to'ldiring.";
            setError(msg);
            if (showToast) showToast(msg, 'error');
            return;
        }

        setLoading(true);

        let callDateISO = null;

        if (formData.callDate) {
            const datePartStr = formData.callDate; 
            const timePartStr = formData.time || "00:00"; 

            const [hours, minutes] = timePartStr.split(':').map(Number);

            const [year, month, day] = datePartStr.split('-').map(Number);
            
            const localDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

            if (!isNaN(localDateTime.getTime())) {
                 callDateISO = localDateTime.toISOString();
            } else {
                const msg = "Sana yoki vaqt formati noto'g'ri.";
                setError(msg);
                if (showToast) showToast(msg, 'error');
                setLoading(false);
                return;
            }
        }


        if (!callDateISO && formData.callDate) { 
             const msg = "Aloqa sanasini to'g'ri formatda kiriting.";
             setError(msg);
             if (showToast) showToast(msg, 'error');
             setLoading(false);
             return;
        }

        const payload = {
            fullName: formData.fullName,
            phone: formData.phone,
            callDate: callDateISO,
            about: formData.about,
            time: formData.time || null, 
        };

        try {
            let result;
            if (isEditing) {
                result = await apiRequest(`/notes/${initialData.id}`, 'PATCH', payload, token);
            } else {
                result = await apiRequest('/notes', 'POST', payload, token);
            }
            onFormSubmit(result);
            if (showToast) {
                showToast(
                    isEditing ? 'Eslatma muvaffaqiyatli yangilandi!' : 'Eslatma muvaffaqiyatli qo\'shildi!',
                    'success'
                );
            }
        } catch (err) {
            const errorMessage = err.message || (isEditing ? 'Eslatmani yangilab bo\'lmadi.' : 'Eslatma qo\'shib bo\'lmadi.');
            setError(errorMessage);
            if (showToast) showToast(errorMessage, 'error');
            console.error("Form submission error:", err.originalError || err);
        } finally {
            setLoading(false);
        }
    }, [formData, isEditing, initialData, token, onFormSubmit, showToast]);

    return (
        <form onSubmit={handleSubmit} className="space-y-5 p-1">
            {error && <ErrorMessage message={error} onClose={() => setError(null)} />}

            <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">To'liq Ism *</label>
                <input
                    type="text" name="fullName" id="fullName"
                    value={formData.fullName} onChange={handleChange} required
                    className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                    aria-required="true"
                    disabled={loading}
                />
            </div>

            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                <input
                    type="tel" name="phone" id="phone"
                    value={formData.phone} onChange={handleChange} required
                    className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                    aria-required="true"
                    disabled={loading}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="callDate" className="block text-sm font-medium text-gray-700 mb-1">Aloqa Sanasi *</label>
                    <input
                        type="date" name="callDate" id="callDate"
                        value={formData.callDate} onChange={handleChange} required
                        className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                        aria-required="true"
                        disabled={loading}
                    />
                </div>

                <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Aloqa Vaqti</label>
                    <input
                        type="time" name="time" id="time"
                        value={formData.time} onChange={handleChange}
                        className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                        disabled={loading}
                    />
                </div>
            </div>

            <div>
                <label htmlFor="about" className="block text-sm font-medium text-gray-700 mb-1">Qo'shimcha ma'lumot</label>
                <textarea
                    name="about" id="about" rows="4"
                    value={formData.about} onChange={handleChange}
                    className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                    disabled={loading}
                ></textarea>
            </div>

            <div className="flex justify-end space-x-4 pt-5 mt-6 border-t border-gray-200">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition duration-150 ease-in-out disabled:opacity-60 font-medium text-sm shadow-sm hover:shadow-md"
                >
                    Bekor qilish
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className={`px-6 py-2.5 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out flex items-center justify-center font-medium text-sm shadow-md hover:shadow-lg ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'}`}
                >
                    {loading && (
                        <svg className="animate-spin -ml-1 mr-2.5 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                    {loading ? 'Saqlanmoqda...' : (isEditing ? 'Yangilash' : 'Qo\'shish')}
                </button>
            </div>
        </form>
    );
};

export default NoteForm;