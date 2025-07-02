import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../utils/api'; 
import LoadingSpinner from '../Essential/LoadingSpinner';
import ErrorMessage from '../Essential/ErrorMessage';
import { Users, Filter, X, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

// Debounce uchun maxsus hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

const TeacherCard = ({ teacher }) => (
    <Link to={`/monitoring/teacher/${teacher.id}`} className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out">
        <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-gray-500">{teacher.firstName?.charAt(0)}{teacher.lastName?.charAt(0)}</span>
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-900">{teacher.firstName} {teacher.lastName}</h3>
                <p className="text-sm text-indigo-600 font-semibold flex items-center"><BookOpen size={14} className="mr-1.5" />{teacher.subject}</p>
            </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-center">
            <div>
                <p className="text-2xl font-bold text-green-600">{teacher.activeStudentsCount}</p>
                <p className="text-xs text-gray-500">Faol o'quvchilar</p>
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-700">{teacher.totalStudents}</p>
                <p className="text-xs text-gray-500">Jami o'quvchilar</p>
            </div>
        </div>
    </Link>
);

const TeacherMonitoringList = ({ token }) => {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalTeachers, setTotalTeachers] = useState(0);
    const limit = 12;

    const [filters, setFilters] = useState({ name: '', subject: '' });
    const debouncedName = useDebounce(filters.name, 500);
    const debouncedSubject = useDebounce(filters.subject, 500);

    // Filtr o'zgarganda sahifani birinchisiga qaytarish
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedName, debouncedSubject]);

    // Ma'lumotlarni yuklash
    useEffect(() => {
        const fetchTeachers = async () => {
            setLoading(true);
            try {
                const queryParams = new URLSearchParams({ 
                    page: currentPage.toString(), 
                    limit: limit.toString() 
                });
                if (debouncedName) queryParams.append('name', debouncedName);
                if (debouncedSubject) queryParams.append('subject', debouncedSubject);

                const response = await apiRequest(`/monitoring/teachers?${queryParams.toString()}`, 'GET', null, token);
                setTeachers(response?.data || []);
                setTotalTeachers(response?.total || 0);
            } catch (err) {
                setError("O'qituvchilar ro'yxatini yuklashda xatolik yuz berdi.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchTeachers();
    }, [token, currentPage, limit, debouncedName, debouncedSubject]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleClearFilters = () => {
        setFilters({ name: '', subject: '' });
    };

    const totalPages = Math.ceil(totalTeachers / limit);

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen m-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 pb-4 border-b border-gray-300">
                    <h1 className="text-xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                        <Users size={36} className="mr-3 text-indigo-600" /> Nazorat Bo'limi: O'qituvchilar
                    </h1>
                     <div className="text-lg font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-md mt-2 sm:mt-0">
                        Jami topildi: {totalTeachers} ta
                    </div>
                </div>

                <div className="p-4 bg-white rounded-lg shadow-sm mb-6 border">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center"><Filter size={20} className="mr-2" /> Filtrlash</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <input type="text" name="name" placeholder="Ism yoki familiya..." value={filters.name} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                        <input type="text" name="subject" placeholder="Fan nomi bo'yicha..." value={filters.subject} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                        <button onClick={handleClearFilters} className="w-full px-4 py-2 bg-gray-500 text-white font-semibold rounded-md shadow-md hover:bg-gray-600 flex items-center justify-center">
                            <X size={20} className="mr-2" /> Tozalash
                        </button>
                    </div>
                </div>

                {loading ? <LoadingSpinner message="Ma'lumotlar yuklanmoqda..." />
                    : error ? <ErrorMessage message={error} />
                    : totalTeachers === 0 ? (
                        <div className="py-12 text-center text-gray-500 bg-white rounded-lg shadow">
                            <Users size={48} className="mx-auto mb-3 text-gray-400" />
                            <p className="text-lg font-medium">Filtr bo'yicha o'qituvchilar topilmadi.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {teachers.map(teacher => (
                                    <TeacherCard key={teacher.id} teacher={teacher} />
                                ))}
                            </div>
                            {totalPages > 1 && (
                                <div className="mt-8 flex justify-between items-center">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm disabled:opacity-50 flex items-center">
                                        <ChevronLeft size={20} className="mr-2" /> Oldingisi
                                    </button>
                                    <span className="text-sm font-medium text-gray-700">Sahifa {currentPage} / {totalPages}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm disabled:opacity-50 flex items-center">
                                        Keyingisi <ChevronRight size={20} className="ml-2" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
            </div>
        </div>
    );
};

export default TeacherMonitoringList;