import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../utils/api'; 
import LoadingSpinner from '../Essential/LoadingSpinner'; 

const CourseForm = ({ token, course, onClose, onSave, showToast }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (course) {
            setFormData({
                name: course.name || '',
                description: course.description || '',
            });
        } else {
            setFormData({ name: '', description: '' });
        }
        setErrors({});
    }, [course]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = "Kurs nomi majburiy.";
        } else if (formData.name.trim().length < 3) {
            newErrors.name = "Kurs nomi kamida 3 belgidan iborat bo'lishi kerak.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            showToast("Iltimos, formadagi xatoliklarni to'g'rilang.", "warning");
            return;
        }

        setIsLoading(true);
        const endpoint = course ? `/courses/${course.id}` : '/courses';
        const method = course ? 'PUT' : 'POST';

        try {
            await apiRequest(endpoint, method, formData, token);
            showToast(course ? 'Kurs muvaffaqiyatli yangilandi!' : 'Kurs muvaffaqiyatli qo\'shildi!', 'success');
            onSave(); 
            onClose(); 
        } catch (err) {
            console.error("Error saving course:", err);
            const errorMessage = err.response?.data?.message || err.message || (course ? 'Kursni yangilashda xatolik.' : 'Kursni saqlashda xatolik.');
            showToast(errorMessage, 'error');
            if (err.response?.data?.errors) {
                 setErrors(err.response.data.errors);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4 transition-opacity duration-300 ease-in-out" onClick={onClose}>
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 sm:p-8 transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow"
                onClick={(e) => e.stopPropagation()} 
            >
                <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-200">
                    <h2 className="text-2xl font-semibold text-gray-800">
                        {course ? "Kursni Tahrirlash" : "Yangi Kurs Qo'shish"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                        aria-label="Yopish"
                        disabled={isLoading}
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Kurs Nomi <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            value={formData.name}
                            onChange={handleChange}
                            className={`w-full p-3 border rounded-lg shadow-sm transition-colors ${errors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
                            placeholder="Masalan: Frontend Dasturlash"
                            disabled={isLoading}
                        />
                        {errors.name && <p className="mt-1.5 text-xs text-red-600 flex items-center"><AlertCircle size={14} className="mr-1"/>{errors.name}</p>}
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            Tavsifi
                        </label>
                        <textarea
                            name="description"
                            id="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="4"
                            className={`w-full p-3 border rounded-lg shadow-sm transition-colors ${errors.description ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
                            placeholder="Kurs haqida qisqacha ma'lumot..."
                            disabled={isLoading}
                        ></textarea>
                        {errors.description && <p className="mt-1.5 text-xs text-red-600 flex items-center"><AlertCircle size={14} className="mr-1"/>{errors.description}</p>}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
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
                                    {course ? "Yangilash" : "Saqlash"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
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

export default CourseForm;
