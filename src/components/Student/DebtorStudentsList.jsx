import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api';
import LoadingSpinner from '../Essential/LoadingSpinner';
import ErrorMessage from '../Essential/ErrorMessage';
import { User, DollarSign, Calendar, CheckSquare, AlertTriangle, Percent, X, ChevronLeft, ChevronRight, List } from 'lucide-react';

// Debounce uchun maxsus hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

// O'zgarmas ma'lumotlar
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
const MONTHS = [
    { value: 1, label: 'Yanvar' }, { value: 2, label: 'Fevral' }, { value: 3, label: 'Mart' },
    { value: 4, label: 'Aprel' }, { value: 5, label: 'May' }, { value: 6, label: 'Iyun' },
    { value: 7, label: 'Iyul' }, { value: 8, label: 'Avgust' }, { value: 9, label: 'Sentabr' },
    { value: 10, label: 'Oktabr' }, { value: 11, label: 'Noyabr' }, { value: 12, label: 'Dekabr' },
];

// Joriy oy va yilni aniqlash
const now = new Date();
const currentMonth = now.getMonth() + 1; // getMonth() 0 dan boshlanadi
const currentYear = now.getFullYear();

const DebtorStudentsList = ({ token }) => {
    const [debtorStudents, setDebtorStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalDebtors, setTotalDebtors] = useState(0);
    const limit = 10;
    
    const [groups, setGroups] = useState([]);
    const [teachers, setTeachers] = useState([]);
    
    // Filtr holatini standart qiymatlar bilan boshlash
    const [filters, setFilters] = useState({ 
        name: '', 
        studentId: '', 
        groupId: '', 
        teacherId: '', 
        month: currentMonth.toString(), 
        year: currentYear.toString() 
    });
    
    const [filterError, setFilterError] = useState('');
    const [filterLoading, setFilterLoading] = useState(true);
    const [filterLoadError, setFilterLoadError] = useState(null);

    const debouncedName = useDebounce(filters.name, 500);
    const debouncedStudentId = useDebounce(filters.studentId, 500);

    // Guruhlar va ustozlar ro'yxatini yuklash
    useEffect(() => {
        const fetchDropdownData = async () => {
            setFilterLoading(true);
            setFilterLoadError(null);
            try {
                const [groupsRes, teachersRes] = await Promise.all([
                    apiRequest('/groups?limit=200', 'GET', null, token),
                    apiRequest('/teachers?limit=100', 'GET', null, token),
                ]);
                setGroups(groupsRes.data || []);
                setTeachers(teachersRes.data || []);
            } catch (err) {
                console.error("Filtr ma'lumotlarini yuklashda xato:", err);
                setFilterLoadError("Guruh/ustoz ma'lumotlarini yuklab bo'lmadi. Tarmoq yoki serverni tekshiring.");
            } finally {
                setFilterLoading(false);
            }
        };

        if (token) {
            fetchDropdownData();
        } else {
             setFilterLoading(false);
             setFilterLoadError("Autentifikatsiya tokeni topilmadi.");
        }
    }, [token]);

    // Filtrlar o'zgarganda sahifani 1-ga qaytarish
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedName, debouncedStudentId, filters.groupId, filters.teacherId, filters.month, filters.year]);

    // Qarzdorlar ro'yxatini yuklash
    useEffect(() => {
        if ((filters.month && !filters.year) || (!filters.month && filters.year)) {
            setFilterError("Qidiruv uchun Oy va Yilni birgalikda tanlashingiz kerak.");
            setDebtorStudents([]);
            setTotalDebtors(0);
            setLoading(false);
            return;
        }
        setFilterError('');
        setLoading(true);

        const fetchDebtors = async () => {
            try {
                const queryParams = new URLSearchParams({ page: currentPage.toString(), limit: limit.toString() });
                if (debouncedName) queryParams.append('filterByName', debouncedName);
                if (debouncedStudentId) queryParams.append('filterByStudentId', debouncedStudentId);
                if (filters.groupId) queryParams.append('filterByGroupId', filters.groupId);
                if (filters.teacherId) queryParams.append('filterByTeacherId', filters.teacherId);
                if (filters.month && filters.year) {
                    queryParams.append('filterByMonth', filters.month);
                    queryParams.append('filterByYear', filters.year);
                }

                const response = await apiRequest(`/debtors?${queryParams.toString()}`, 'GET', null, token);
                setDebtorStudents(response.data || []);
                setTotalDebtors(response.total || 0);
            } catch (err) {
                setError(err.message || 'Ma\'lumotlarni yuklashda xatolik yuz berdi.');
            } finally {
                setLoading(false);
            }
        };

        if (token) {
             fetchDebtors();
        } else {
             setLoading(false);
             setError("Qarzdorlarni yuklash uchun autentifikatsiya tokeni topilmadi.");
        }
    }, [token, currentPage, limit, debouncedName, debouncedStudentId, filters.groupId, filters.teacherId, filters.month, filters.year]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleClearFilters = () => {
        setFilters({ name: '', studentId: '', groupId: '', teacherId: '', month: '', year: '' });
    };

    const totalPages = Math.ceil(totalDebtors / limit);

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen m-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 pb-4 border-b border-gray-300">
                    <h2 className="text-xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                        <DollarSign size={36} className="mr-3 text-red-600" />
                        Qarzdor Talabalar Ro'yxati
                    </h2>
                    <div className="text-lg font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-md mt-2 sm:mt-0">
                        Jami topildi: {totalDebtors} ta
                    </div>
                </div>

                {/* --- FILTERS UI --- */}
                <div className="p-4 bg-white rounded-lg shadow-sm mb-6 border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <input type="text" name="name" placeholder="Ism yoki familiya..." value={filters.name} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                        <input type="text" name="studentId" placeholder="Talaba IDsi..." value={filters.studentId} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                        
                        <select name="groupId" value={filters.groupId} onChange={handleFilterChange} disabled={filterLoading || !!filterLoadError} className="w-full p-2 border border-gray-300 rounded-md shadow-sm disabled:bg-gray-200 disabled:cursor-not-allowed">
                            <option value="">
                                {filterLoading ? "Guruhlar yuklanmoqda..." : filterLoadError ? "Xatolik" : "Guruhni tanlang..."}
                            </option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name || g.groupId}</option>)}
                        </select>
                        
                        <select name="teacherId" value={filters.teacherId} onChange={handleFilterChange} disabled={filterLoading || !!filterLoadError} className="w-full p-2 border border-gray-300 rounded-md shadow-sm disabled:bg-gray-200 disabled:cursor-not-allowed">
                             <option value="">
                                {filterLoading ? "Ustozlar yuklanmoqda..." : filterLoadError ? "Xatolik" : "O'qituvchini tanlang..."}
                            </option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                        </select>

                        <select name="month" value={filters.month} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                            <option value="">Oyni tanlang...</option>
                            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <select name="year" value={filters.year} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                            <option value="">Yilni tanlang...</option>
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <button onClick={handleClearFilters} className="w-full px-4 py-2 bg-gray-500 text-white font-semibold rounded-md shadow-md hover:bg-gray-600 flex items-center justify-center">
                            <X size={20} className="mr-2" /> Filtrlarni Tozalash
                        </button>
                    </div>
                    {filterError && <p className="text-red-500 text-sm mt-3 flex items-center"><AlertTriangle size={16} className="mr-2" />{filterError}</p>}
                    {filterLoadError && <p className="text-red-500 text-sm mt-3 flex items-center"><AlertTriangle size={16} className="mr-2" />{filterLoadError}</p>}
                </div>

                {/* --- DEBTORS LIST & PAGINATION --- */}
                {loading ? (<div className="text-center py-10"><LoadingSpinner /></div>)
                    : error ? (<ErrorMessage message={error} />)
                        : totalDebtors === 0 ? (
                            <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-md">
                                <CheckSquare size={52} className="mx-auto mb-4 text-green-500" />
                                <p className="text-xl font-semibold">Filtr bo'yicha qarzdor talabalar topilmadi.</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-6">
                                    {debtorStudents.map((student) => (
                                        <div key={student.id} className="bg-white shadow-lg rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                                            {/* Student Info */}
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                                                <div>
                                                    <h2 className="text-xl font-bold text-indigo-700 flex items-center">
                                                        <User size={24} className="mr-2" />{student.firstName} {student.lastName}
                                                    </h2>
                                                    <p className="text-sm text-gray-500 ml-8">
                                                        ID: {student.studentId}
                                                        {student.discount > 0 && (
                                                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                                                                <Percent size={10} className="inline mr-0.5" /> {student.discount}% chegirma
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="mt-3 sm:mt-0 text-left sm:text-right">
                                                    <p className="text-2xl font-bold text-red-600">{student.debtAmount?.toLocaleString()} so'm</p>
                                                    <p className="text-xs text-gray-500">umumiy qarz</p>
                                                </div>
                                            </div>

                                            {/* Payment Summary */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4 border-t border-b border-gray-200 py-4">
                                                <div className="flex items-center text-gray-700"><Calendar size={16} className="mr-2 text-gray-500" />Aktiv oylar: <span className="font-medium ml-1">{student.monthsActive} oy</span></div>
                                                <div className="flex items-center text-gray-700"><DollarSign size={16} className="mr-2 text-green-500" />Jami to'langan: <span className="font-medium ml-1">{student.totalPaid?.toLocaleString()} so'm</span></div>
                                                <div className="flex items-center text-gray-700">
                                                    <DollarSign size={16} className="mr-2 text-orange-500" />Oylik to'lov: <span className="font-medium ml-1">{student.monthlyExpectedPayment?.toLocaleString()} so'm</span>
                                                    {student.monthlyDiscountAmount > 0 && (<span className="text-xs text-gray-500 ml-1">(asli: {student.monthlyRateBeforeDiscount?.toLocaleString()} so'm)</span>)}
                                                </div>
                                            </div>

                                            {/* Debtor Months Breakdown */}
                                            {student.debtorMonths && student.debtorMonths.length > 0 && (
                                                <div className="mb-4">
                                                    <h4 className="text-md font-semibold text-gray-700 mb-2 flex items-center">
                                                        <AlertTriangle size={18} className="mr-2 text-red-500" /> Qarzdor Oylar:
                                                    </h4>
                                                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                                        {student.debtorMonths.map((month, index) => {
                                                            const groupDebtDetails = (month.groupBreakdown || []).map(groupInMonth => {
                                                                const groupInfo = student.groupDetails.find(g => g.name === groupInMonth.groupName);
                                                                if (!groupInfo) return null;
                                                                const expectedGroupPayment = groupInMonth.coursePrice * (1 - (student.discount || 0) / 100);
                                                                const paidForGroupInMonth = student.payments
                                                                    .filter(p => p.whichYear === month.year && p.whichMonth.toUpperCase() === month.month.toUpperCase() && p.groupId === groupInfo.id)
                                                                    .reduce((sum, p) => sum + p.summa, 0);
                                                                const debtForGroup = expectedGroupPayment - paidForGroupInMonth;
                                                                return {
                                                                    name: groupInMonth.groupName,
                                                                    debt: debtForGroup,
                                                                };
                                                            }).filter(details => details && details.debt > 0);

                                                            return (
                                                                <li key={index} className="text-sm text-gray-700 p-3 bg-red-50 rounded-lg border border-red-200">
                                                                    <div className="flex justify-between items-center font-medium">
                                                                        <span>{month.month} {month.year}</span>
                                                                        <span className="text-red-600">{parseFloat(month.debtAmount).toLocaleString()} so'm</span>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 flex justify-between items-center mt-1">
                                                                        <span>(Kutilgan: {parseFloat(month.expectedPayment).toLocaleString()})</span>
                                                                        <span>(To'langan: {parseFloat(month.paidAmount).toLocaleString()})</span>
                                                                    </div>
                                                                    {groupDebtDetails.length > 0 && (
                                                                        <div className="mt-2 pt-2 border-t border-red-200/60">
                                                                            <ul className="space-y-1 text-xs">
                                                                                {groupDebtDetails.map((gDebt, gIndex) => (
                                                                                    <li key={gIndex} className="flex justify-between items-center">
                                                                                        <span className="text-gray-500">Guruh ({gDebt.name}):</span>
                                                                                        <span className="font-semibold text-red-700">{Math.round(gDebt.debt).toLocaleString()} so'm</span>
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    )}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            )}
                                            
                                            {/* Group Details */}
                                            {student.groupDetails && student.groupDetails.length > 0 && (
                                                <div>
                                                    <h4 className="text-md font-semibold text-gray-700 mb-2 flex items-center"><List size={18} className="mr-2 text-gray-500" /> Guruhlar:</h4>
                                                    <ul className="space-y-1.5">
                                                        {student.groupDetails.map((detail) => (
                                                            <li key={detail.id} className="text-sm text-gray-600 p-2 bg-gray-50 rounded-md border border-gray-100 flex justify-between items-center">
                                                                <span className="font-medium">{detail.name}</span>
                                                                <span className="text-xs text-gray-500">Guruh narxi: {detail.coursePrice.toLocaleString()} so'm/oy</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="mt-8 flex justify-between items-center">
                                        <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm disabled:opacity-50 flex items-center">
                                            <ChevronLeft size={20} className="mr-2" /> Oldingisi
                                        </button>
                                        <span className="text-sm font-medium text-gray-700">Sahifa {currentPage} / {totalPages}</span>
                                        <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm disabled:opacity-50 flex items-center">
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

export default DebtorStudentsList;