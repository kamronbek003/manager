import React, { useState, useEffect } from 'react';
// Ushbu komponentlarni o'z loyihangizdagi joylashuviga moslang
import { apiRequest } from '../../utils/api'; 
import LoadingSpinner from '../Essential/LoadingSpinner';
import ErrorMessage from '../Essential/ErrorMessage';
import { Users, ShieldCheck, Award, Loader2 } from 'lucide-react';

/**
 * Chiroyli va interaktiv Toggle Switch komponenti
 */
const ToggleSwitch = ({ checked, onChange, disabled }) => {
    return (
        <label className="relative inline-flex items-center cursor-pointer">
            <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={checked} 
                onChange={onChange}
                disabled={disabled}
            />
            <div className={`
                w-14 h-7 bg-gray-300 rounded-full 
                peer peer-focus:ring-4 peer-focus:ring-indigo-300 
                peer-checked:bg-indigo-600
                transition-all duration-300
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}>
                <div className={`
                    absolute top-1 left-8 bg-white border-gray-300 border rounded-full h-5 w-5 
                    transition-all duration-300
                    peer-checked:translate-x-full peer-checked:border-white
                    flex items-center justify-center
                `}>
                    {checked && <ShieldCheck size={12} className="text-indigo-600"/>}
                </div>
            </div>
            <span className={`ml-3 text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-900'}`}>
                {checked ? 'Lider' : 'Oddiy'}
            </span>
        </label>
    );
};


/**
 * Har bir o'qituvchi uchun qator va statusni o'zgartirish logikasi
 */
const TeacherUpdateRow = ({ teacher, onUpdate, isUpdating }) => {
    
    const isLeader = teacher.status === 'LIDER';

    const handleToggleChange = () => {
        if (isUpdating) return;
        // Statusni teskarisiga o'zgartiramiz
        const newStatus = isLeader ? 'ODDIY' : 'LIDER';
        onUpdate(teacher.id, { status: newStatus });
    };

    return (
        <div className={`
            flex items-center justify-between p-4 rounded-xl border-l-4
            transition-all duration-300
            ${isLeader ? 'bg-indigo-50 border-indigo-500 shadow-md' : 'bg-white border-gray-200'}
            ${isUpdating ? 'animate-pulse' : ''}
        `}>
            <div className="flex items-center space-x-4">
                 <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isLeader ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    <span className="font-bold text-lg">{teacher.firstName?.charAt(0)}</span>
                </div>
                <div>
                    <p className="font-bold text-gray-800">{teacher.firstName} {teacher.lastName}</p>
                    <p className="text-sm text-gray-500">{teacher.subject}</p>
                </div>
            </div>
            <div className="flex items-center">
                {isUpdating && <Loader2 size={20} className="animate-spin text-indigo-500 mr-4" />}
                <ToggleSwitch 
                    checked={isLeader}
                    onChange={handleToggleChange}
                    disabled={isUpdating}
                />
            </div>
        </div>
    );
};


/**
 * O'qituvchilar statusini yangilash uchun asosiy sahifa
 */
const TeacherStatusUpdater = ({ token }) => {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        const fetchTeachers = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await apiRequest('/teachers?limit=100', 'GET', null, token);
                setTeachers(response?.data || []);
            } catch (err) {
                setError("O'qituvchilarni yuklashda xatolik yuz berdi.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchTeachers();
    }, [token]);


    const handleUpdateTeacher = async (teacherId, updateData) => {
        setUpdatingId(teacherId);
        try {
            // Haqiqiy API so'rovi PATCH orqali yuboriladi
            const updatedTeacher = await apiRequest(`/teachers/${teacherId}`, 'PATCH', updateData, token);
            
            // State'ni serverdan kelgan javob bilan yangilaymiz
            setTeachers(currentTeachers =>
                currentTeachers.map(t => (t.id === teacherId ? updatedTeacher : t))
            );
        } catch (err) {
            console.error("Yangilashda xato:", err);
            alert("Ma'lumotni yangilashda xatolik yuz berdi.");
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) return <LoadingSpinner message="O'qituvchilar ro'yxati yuklanmoqda..." />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <div className="text-center mb-8">
                    <Award size={48} className="mx-auto text-indigo-600 mb-3" />
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Liderlarni Boshqarish</h1>
                    <p className="text-md text-gray-500 mt-2 max-w-2xl mx-auto">
                        Bu yerdan o'qituvchilarga "LIDER" maqomini berishingiz yoki olib tashlashingiz mumkin. O'zgarishlar darhol saqlanadi.
                    </p>
                </div>

                {teachers.length > 0 ? (
                    <div className="space-y-4">
                        {teachers.map(teacher => (
                            <TeacherUpdateRow
                                key={teacher.id}
                                teacher={teacher}
                                onUpdate={handleUpdateTeacher}
                                isUpdating={updatingId === teacher.id}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 px-6">
                        <Users size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-800">O'qituvchilar topilmadi</h3>
                        <p className="text-sm text-gray-500">Tizimda hali o'qituvchilar mavjud emas.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherStatusUpdater;
