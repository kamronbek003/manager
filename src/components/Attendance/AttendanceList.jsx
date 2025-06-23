import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Users, ClipboardList, AlertCircle, Percent, UserCheck, BookOpen, Activity, GraduationCap, PlusCircle, Edit3, CalendarDays, Info } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { formatDDMMYYYY } from '../../utils/helpers';
import LoadingSpinner from '../Essential/LoadingSpinner';
import ErrorMessage from '../Essential/ErrorMessage';
import Modal from '../Essential/Modal';
import { AttendanceForm } from './AttendanceForm';

const calculateAverage = (presentCount, totalCount) => {
    if (totalCount === 0) return 0;
    return (presentCount / totalCount) * 100;
};

const GroupCard = React.memo(({ group, averageAttendance, averageLoading, averageError, onClick }) => {
    const teacherName = group.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : 'Noma\'lum O\'qituvchi';

    return (
        <div
            onClick={() => onClick(group)}
            className="bg-gradient-to-br from-white to-indigo-50 p-5 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-indigo-300 flex flex-col justify-between min-h-[200px] hover:border-indigo-500"
        >
            <div>
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center text-indigo-700">
                        <BookOpen size={22} className="mr-2.5 flex-shrink-0" />
                        <h4 className="text-lg font-bold truncate text-gray-800" title={group.groupId || group.name}>
                            {group.groupId || group.name || 'Nomsiz Guruh'}
                        </h4>
                    </div>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                        <GraduationCap size={16} className="mr-2.5 text-gray-500 flex-shrink-0" /> 
                        <span className="truncate" title={teacherName}>{teacherName}</span>
                    </div>
                    <div className="flex items-center">
                        <Activity size={16} className="mr-2.5 text-gray-500 flex-shrink-0" />
                        <span>O'rtacha Davomat: </span>
                        {averageLoading ? (
                            <span className="ml-1.5 text-xs italic text-gray-500">(yuklanmoqda...)</span>
                        ) : averageError ? (
                            <span className="ml-1.5 font-semibold text-red-500 text-xs">(xatolik)</span>
                        ) : (
                            <span className={`ml-1.5 font-semibold ${averageAttendance >= 80 ? 'text-green-600' : averageAttendance >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {averageAttendance.toFixed(1)}%
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-200 text-right">
                 <span className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Batafsil →</span>
            </div>
        </div>
    );
});

const StudentAverageRow = React.memo(({ student, averageInfo, studentDetails, onShowAllAttendancesClick, group }) => {
    const displayName = studentDetails ? `${studentDetails.firstName} ${studentDetails.lastName}` : 'Noma\'lum Talaba';
    const displayStudentId = studentDetails?.studentId || student.studentId || 'N/A';

    const handleShowAllClick = () => {
        if (studentDetails && group) {
            onShowAllAttendancesClick(student.id, group.id, displayName);
        } else {
            console.warn("Student details or group not available for showing all attendances.");
        }
    };

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3.5 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 truncate" title={displayName}>{displayName}</div>
                <div className="text-xs text-gray-500">{displayStudentId}</div>
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700 text-center">
                {averageInfo.loading ? (
                    <span className="text-xs italic text-gray-500">Yuklanmoqda...</span>
                ) : averageInfo.error ? (
                    <span className="text-xs text-red-500 italic">Xatolik</span>
                ) : (
                    <span className={`font-semibold ${averageInfo.average >= 80 ? 'text-green-600' : averageInfo.average >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {averageInfo.average.toFixed(1)}%
                    </span>
                )}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-center">
                <button
                    onClick={handleShowAllClick}
                    className="text-indigo-600 hover:text-indigo-800 font-medium text-xs py-1.5 px-2.5 rounded-md hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    title="Hamma davomatlarini ko'rish"
                >
                    Hamma davomatlari
                </button>
            </td>
        </tr>
    );
});

const GroupAttendanceModalContent = ({ token, group, studentMap: globalStudentMap, onShowStudentAllAttendances, showToast }) => {
    const [studentsInGroup, setStudentsInGroup] = useState([]);
    const [loadingStudentsInGroup, setLoadingStudentsInGroup] = useState(true);
    const [errorStudentsInGroup, setErrorStudentsInGroup] = useState(null);
    const [studentAverages, setStudentAverages] = useState({}); 

    const fetchStudentsForGroup = useCallback(async (groupId) => {
        setLoadingStudentsInGroup(true);
        setErrorStudentsInGroup(null);
        setStudentsInGroup([]);
        try {
            const queryParams = new URLSearchParams({ filterByGroupId: groupId, limit: '100' });
            const data = await apiRequest(`/students?${queryParams.toString()}`, 'GET', null, token);
            if (data && Array.isArray(data.data)) {
                setStudentsInGroup(data.data);
            } else {
                const msg = "Bu guruh uchun talabalar ro'yxatini yuklab bo'lmadi.";
                setErrorStudentsInGroup(msg);
                if(showToast) showToast(msg, "error");
            }
        } catch (err) {
            const msg = err.message || "Talabalarni yuklashda xatolik.";
            setErrorStudentsInGroup(msg);
            if(showToast) showToast(msg, "error");
        } finally {
            setLoadingStudentsInGroup(false);
        }
    }, [token, showToast]);

    const fetchStudentAverageInGroup = useCallback(async (groupId, studentId) => {
        setStudentAverages(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), loading: true, error: false } }));
        try {
            const totalParams = new URLSearchParams({ filterByGroupId: groupId, filterByStudentId: studentId, limit: '100' });
            const totalData = await apiRequest(`/attendances?${totalParams.toString()}`, 'GET', null, token);
            const totalCount = totalData.total || 0;

            let presentCount = 0;
            if (totalCount > 0) {
                const presentParams = new URLSearchParams({ filterByGroupId: groupId, filterByStudentId: studentId, filterByStatus: 'KELDI', limit: '100' });
                const presentData = await apiRequest(`/attendances?${presentParams.toString()}`, 'GET', null, token);
                presentCount = presentData.total || 0;
            }
            
            const average = calculateAverage(presentCount, totalCount);
            setStudentAverages(prev => ({ ...prev, [studentId]: { average, loading: false, error: false } }));
        } catch (err) {
            console.error(`Error fetching average for student ${studentId} in group ${groupId}:`, err);
            setStudentAverages(prev => ({ ...prev, [studentId]: { average: 0, loading: false, error: true } }));
        }
    }, [token]);

    useEffect(() => {
        if (group?.id) {
            fetchStudentsForGroup(group.id);
        }
    }, [group, fetchStudentsForGroup]);

    useEffect(() => {
        if (group?.id && studentsInGroup.length > 0) {
            studentsInGroup.forEach(student => {
                if (!studentAverages[student.id] || studentAverages[student.id]?.loading === undefined) {
                     fetchStudentAverageInGroup(group.id, student.id);
                }
            });
        }
    }, [group, studentsInGroup, fetchStudentAverageInGroup, studentAverages]);

    if (!group) return null;

    return (
        <div className="p-4 md:p-6 bg-gradient-to-br from-white to-indigo-50 rounded-xl shadow-lg">
            <h3 className="text-xl md:text-2xl font-semibold mb-4 text-gray-800 flex items-center">
                <Users size={28} className="mr-3 text-indigo-600" /> 
                {group.groupId || group.name} - Talabalar Davomati
            </h3>
            {loadingStudentsInGroup && <div className="py-5 bg-white rounded-lg shadow-sm border border-gray-200"><LoadingSpinner message="Guruh talabalari yuklanmoqda..." /></div>}
            {errorStudentsInGroup && !loadingStudentsInGroup && <ErrorMessage message={errorStudentsInGroup} onClose={() => setErrorStudentsInGroup(null)} />}
            
            {!loadingStudentsInGroup && !errorStudentsInGroup && (
                studentsInGroup.length > 0 ? (
                    <div className="overflow-y-auto max-h-[60vh] border-2  rounded-lg shadow-md bg-white">
                        <table className="min-w-full bg-white divide-y divide-gray-200">
                            <thead className="bg-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Talaba</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Guruhdagi O'rt. Davomat</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Amallar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {studentsInGroup.map(student => (
                                    <StudentAverageRow
                                        key={student.id}
                                        student={student}
                                        averageInfo={studentAverages[student.id] || { average: 0, loading: true, error: false }}
                                        studentDetails={globalStudentMap[student.id]}
                                        onShowAllAttendancesClick={onShowStudentAllAttendances}
                                        group={group} 
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow-sm border border-gray-200">
                        <ClipboardList size={48} className="mx-auto mb-3 text-gray-400" />
                        Bu guruhda talabalar topilmadi yoki hali biriktirilmagan.
                    </div>
                )
            )}
        </div>
    );
};

const StudentAllAttendancesModalContent = ({ token, studentId, groupId, studentName, showToast }) => {
    const [attendances, setAttendances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStudentAttendances = useCallback(async () => {
        if (!studentId || !groupId) {
            const msg = "Talaba yoki guruh ID si mavjud emas.";
            setError(msg);
            if(showToast) showToast(msg, "warning");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                filterByStudentId: studentId,
                filterByGroupId: groupId,
                sortBy: 'date', 
                sortOrder: 'desc', 
                limit: '100'
            });
            const data = await apiRequest(`/attendances?${params.toString()}`, 'GET', null, token);
            if (data && Array.isArray(data.data)) {
                setAttendances(data.data);
            } else {
                setAttendances([]);
            }
        } catch (err) {
            console.error(`Error fetching attendances for student ${studentId} in group ${groupId}:`, err);
            const msg = err.message || "Davomat yozuvlarini yuklashda xatolik.";
            setError(msg);
            if(showToast) showToast(msg, "error");
            setAttendances([]);
        } finally {
            setLoading(false);
        }
    }, [token, studentId, groupId, showToast]);

    useEffect(() => {
        fetchStudentAttendances();
    }, [fetchStudentAttendances]);

    const getStatusBadge = (status) => {
        status = status ? status.toUpperCase() : 'NOANIQ';
        switch (status) {
            case 'KELDI':
                return <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Keldi</span>;
            case 'KELMADI':
                return <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Kelmadi</span>;
            case 'SABABLI':
                return <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Sababli</span>;
            case 'KECHIKDI':
                return <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">Kechikdi</span>;
            default:
                return <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    return (
        <div className="p-4 md:p-6 bg-gradient-to-br from-white to-indigo-50 rounded-xl shadow-lg">
            <h3 className="text-xl md:text-2xl font-semibold mb-4 text-gray-800 flex items-center">
                <CalendarDays size={28} className="mr-3 text-teal-600" />
                {studentName ? `${studentName} - Barcha Davomatlar` : "Talaba Davomatlari"}
            </h3>
            {loading && <div className="py-5 bg-white rounded-lg shadow-sm border border-gray-200"><LoadingSpinner message="Davomatlar yuklanmoqda..." /></div>}
            {error && !loading && <ErrorMessage message={error} onClose={() => setError(null)} />}
            {!loading && !error && (
                attendances.length > 0 ? (
                    <div className="overflow-y-auto max-h-[60vh] border-2  rounded-lg shadow-md bg-white">
                        <table className="min-w-full bg-white divide-y divide-gray-200">
                            <thead className="bg-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sana</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Holat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {attendances.map(att => (
                                    <tr key={att.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">
                                            {att.date ? formatDDMMYYYY(new Date(att.date)) : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap text-sm">
                                            {getStatusBadge(att.status)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow-sm border border-gray-200">
                        <Info size={48} className="mx-auto mb-3 text-gray-400" />
                        Bu talaba uchun davomat yozuvlari topilmadi.
                    </div>
                )
            )}
        </div>
    );
};

const AttendanceList = ({ token, showToast }) => {
    const [groups, setGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [errorGroups, setErrorGroups] = useState(null);
    
    const [students, setStudents] = useState([]); 
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [errorStudents, setErrorStudents] = useState(null);

    const [groupAverages, setGroupAverages] = useState({}); 
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [isStudentAverageModalOpen, setIsStudentAverageModalOpen] = useState(false);
    
    const [isAttendanceFormModalOpen, setIsAttendanceFormModalOpen] = useState(false);
    const [attendanceFormInitialData, setAttendanceFormInitialData] = useState(null);
    const [isAttendanceFormEditMode, setIsAttendanceFormEditMode] = useState(false);

    const [isStudentAllAttendancesModalOpen, setIsStudentAllAttendancesModalOpen] = useState(false);
    const [currentStudentForDetails, setCurrentStudentForDetails] = useState({ studentId: null, groupId: null, studentName: null });

    const fetchGroupAverageAttendance = useCallback(async (groupId) => {
        setGroupAverages(prev => ({ ...prev, [groupId]: { ...(prev[groupId] || {}), loading: true, error: false } }));
        try {
            const totalAttendancesParams = new URLSearchParams({ filterByGroupId: groupId, limit: '100' });
            const totalData = await apiRequest(`/attendances?${totalAttendancesParams.toString()}`, 'GET', null, token);
            const totalCount = totalData.total || 0;

            let presentCount = 0;
            if (totalCount > 0) {
                const presentAttendancesParams = new URLSearchParams({ filterByGroupId: groupId, filterByStatus: 'KELDI', limit: '100' });
                const presentData = await apiRequest(`/attendances?${presentAttendancesParams.toString()}`, 'GET', null, token);
                presentCount = presentData.total || 0;
            }
            
            const average = calculateAverage(presentCount, totalCount);
            setGroupAverages(prev => ({ ...prev, [groupId]: { average, loading: false, error: false } }));
        } catch (error) {
            console.error(`Error fetching average attendance for group ${groupId}:`, error);
            setGroupAverages(prev => ({ ...prev, [groupId]: { average: 0, loading: false, error: true } }));
        }
    }, [token]);

    const fetchGroups = useCallback(async () => {
        setLoadingGroups(true);
        setErrorGroups(null);
        try {
            const data = await apiRequest('/groups?limit=100&sortBy=groupId&sortOrder=asc&include=teacher', 'GET', null, token);
            if (data && Array.isArray(data.data)) {
                setGroups(data.data);
                const initialAverages = {};
                data.data.forEach(g => {
                    initialAverages[g.id] = { average: 0, loading: true, error: false };
                });
                setGroupAverages(initialAverages); 
                for (const group of data.data) {
                    await fetchGroupAverageAttendance(group.id); 
                }
            } else {
                const msg = "Guruhlar ro'yxatini yuklab bo'lmadi yoki ma'lumotlar formati noto'g'ri.";
                setErrorGroups(msg);
                if(showToast) showToast(msg, "warning");
                setGroups([]);
            }
        } catch (err) {
            const msg = err.message || "Guruhlarni yuklashda xatolik.";
            setErrorGroups(msg);
            if(showToast) showToast(msg, "error");
            setGroups([]);
        } finally {
            setLoadingGroups(false); 
        }
    }, [token, fetchGroupAverageAttendance, showToast]);

    const fetchStudentsIfNeeded = useCallback(async () => {
        if (students.length > 0 || loadingStudents) return; 
        setLoadingStudents(true);
        setErrorStudents(null);
        try {
            const data = await apiRequest('/students?limit=100&sortBy=firstName&sortOrder=asc', 'GET', null, token);
            if (data && Array.isArray(data.data)) {
                setStudents(data.data);
            } else {
                const msg = "Talabalar ro'yxatini (umumiy) yuklab bo'lmadi yoki format noto'g'ri.";
                setErrorStudents(msg);
                if(showToast) showToast(msg, "warning");
            }
        } catch (err) {
            const msg = err.message || "Talabalar ro'yxatini (umumiy) yuklashda xatolik.";
            setErrorStudents(msg);
            if(showToast) showToast(msg, "error");
        } finally {
            setLoadingStudents(false);
        }
    }, [token, students.length, loadingStudents, showToast]);

    useEffect(() => {
        fetchGroups();
        fetchStudentsIfNeeded(); 
    }, [fetchGroups, fetchStudentsIfNeeded]);

    const studentMap = useMemo(() => {
        if (!students || students.length === 0) return {};
        return students.reduce((acc, student) => {
            acc[student.id] = { studentId: student.studentId, firstName: student.firstName, lastName: student.lastName };
            return acc;
        }, {});
    }, [students]);

    const handleGroupCardClick = useCallback((group) => {
        setSelectedGroup(group);
        setIsStudentAverageModalOpen(true);
        if (students.length === 0 && !loadingStudents && !errorStudents) { 
            fetchStudentsIfNeeded();
        }
    }, [students.length, loadingStudents, errorStudents, fetchStudentsIfNeeded]);

    const closeStudentAverageModal = useCallback(() => {
        setIsStudentAverageModalOpen(false);
        setSelectedGroup(null);
    }, []);

    const openStudentAllAttendancesModal = useCallback((studentId, groupId, studentName) => {
        setCurrentStudentForDetails({ studentId, groupId, studentName });
        setIsStudentAllAttendancesModalOpen(true);
    }, []);

    const closeStudentAllAttendancesModal = useCallback(() => {
        setIsStudentAllAttendancesModalOpen(false);
        setCurrentStudentForDetails({ studentId: null, groupId: null, studentName: null });
    }, []);

    const openAttendanceFormModalForAdd = useCallback(() => {
        if (groups.length === 0 && !loadingGroups && !errorGroups) fetchGroups();
        if (students.length === 0 && !loadingStudents && !errorStudents) fetchStudentsIfNeeded();
        setAttendanceFormInitialData(null);
        setIsAttendanceFormEditMode(false);
        setIsAttendanceFormModalOpen(true);
    }, [groups.length, students.length, loadingGroups, loadingStudents, errorGroups, errorStudents, fetchGroups, fetchStudentsIfNeeded]);

    const openAttendanceFormModalForEdit = useCallback(() => {
        if (groups.length === 0 && !loadingGroups && !errorGroups) fetchGroups();
        if (students.length === 0 && !loadingStudents && !errorStudents) fetchStudentsIfNeeded();
        setAttendanceFormInitialData(null);
        setIsAttendanceFormEditMode(true);
        setIsAttendanceFormModalOpen(true);
    }, [groups.length, students.length, loadingGroups, loadingStudents, errorGroups, errorStudents, fetchGroups, fetchStudentsIfNeeded]);

    const closeAttendanceFormModal = useCallback(() => {
        setIsAttendanceFormModalOpen(false);
        setAttendanceFormInitialData(null);
        setIsAttendanceFormEditMode(false);
    }, []);

    const handleAttendanceFormSubmit = useCallback(async (submitResult) => {
        closeAttendanceFormModal();
        if (showToast && submitResult?.success) {
             showToast(submitResult.message || (isAttendanceFormEditMode ? "Davomat muvaffaqiyatli tahrirlandi!" : "Davomat muvaffaqiyatli qo'shildi!"), "success");
        } else if (showToast && !submitResult?.success && submitResult?.message) {
             showToast(submitResult.message, "error");
        }
        
        const currentGroups = groups;
        setLoadingGroups(true);
        const averagePromises = currentGroups.map(group => fetchGroupAverageAttendance(group.id));
        
        try {
            await Promise.all(averagePromises);
        } catch (error) {
            console.error("Error re-fetching group averages after attendance form submit:", error);
            if(showToast) showToast("Guruh o'rtacha davomatlarini yangilashda xatolik.", "warning");
        } finally {
            setLoadingGroups(false);
        }

        if (isStudentAverageModalOpen && selectedGroup?.id && submitResult?.affectedGroupId === selectedGroup.id) {
             if (selectedGroup) {
                const tempGroup = {...selectedGroup};
                setSelectedGroup(null);
                setTimeout(() => setSelectedGroup(tempGroup), 0);
            }
        }
        if (isStudentAllAttendancesModalOpen && currentStudentForDetails.groupId && submitResult?.affectedGroupId === currentStudentForDetails.groupId) {
             const tempDetails = {...currentStudentForDetails};
             setCurrentStudentForDetails({ studentId: null, groupId: null, studentName: null });
             setTimeout(() => setCurrentStudentForDetails(tempDetails), 0);
        }
    }, [closeAttendanceFormModal, showToast, groups, fetchGroupAverageAttendance, isStudentAverageModalOpen, selectedGroup, isStudentAllAttendancesModalOpen, currentStudentForDetails, isAttendanceFormEditMode]);

    return (
        <div style={{ margin: '8px' }} className="bg-gray-50 p-4 sm:p-6 md:p-8 min-h-screen">
            <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg border-2 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-4 border-b border-gray-200">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-0 flex items-center">
            <UserCheck size={32} className="mr-3 text-indigo-600"/> Guruhlar Davomati Paneli
        </h2>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
            <button
            onClick={openAttendanceFormModalForAdd}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-5 rounded-lg inline-flex items-center justify-center transition duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 w-full sm:w-auto"
            >
            <PlusCircle size={20} className="mr-2" /> Davomat qilish
            </button>
            <button
            onClick={openAttendanceFormModalForEdit}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-lg inline-flex items-center justify-center transition duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto"
            >
            <Edit3 size={20} className="mr-2" /> Davomatni Tahrirlash
            </button>
        </div>
        </div>

                {errorGroups && <ErrorMessage message={errorGroups} onClose={() => setErrorGroups(null)} />}
                {errorStudents && !isStudentAverageModalOpen && !isAttendanceFormModalOpen && 
                    <ErrorMessage message={`Talabalar ma'lumotini yuklashda xatolik: ${errorStudents}`} onClose={() => setErrorStudents(null)} />}

                {loadingGroups && groups.length === 0 ? ( 
                    <div className="py-20 flex justify-center bg-white rounded-lg shadow-sm border border-gray-200"><LoadingSpinner message="Guruhlar yuklanmoqda..." /></div>
                ) : groups.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
                        {groups.map(group => (
                            <GroupCard
                                key={group.id}
                                group={group}
                                averageAttendance={(groupAverages[group.id]?.average) || 0}
                                averageLoading={groupAverages[group.id]?.loading || false}
                                averageError={groupAverages[group.id]?.error || false} 
                                onClick={handleGroupCardClick}
                            />
                        ))}
                    </div>
                ) : !errorGroups && !loadingGroups ? ( 
                    <div className="text-center py-16 text-gray-500 bg-white rounded-lg shadow-sm border border-gray-200">
                        <Users size={52} className="mx-auto mb-4 text-gray-400" />
                        <p className="text-xl font-semibold">Hozircha guruhlar mavjud emas.</p>
                        <p className="mt-1 text-sm">Yangi guruh qo'shilganda shu yerda paydo bo'ladi.</p>
                    </div>
                ) : null}
            </div>

            <Modal isOpen={isStudentAverageModalOpen} onClose={closeStudentAverageModal} title="" size="xlarge">
                {selectedGroup && (
                    <GroupAttendanceModalContent
                        token={token}
                        group={selectedGroup}
                        studentMap={studentMap}
                        onShowStudentAllAttendances={openStudentAllAttendancesModal} 
                        showToast={showToast}
                    />
                )}
            </Modal>

            <Modal 
                isOpen={isStudentAllAttendancesModalOpen} 
                onClose={closeStudentAllAttendancesModal} 
                title="" 
                size="large"
            >
                {currentStudentForDetails.studentId && currentStudentForDetails.groupId && (
                    <StudentAllAttendancesModalContent
                        token={token}
                        studentId={currentStudentForDetails.studentId}
                        groupId={currentStudentForDetails.groupId}
                        studentName={currentStudentForDetails.studentName}
                        showToast={showToast}
                    />
                )}
            </Modal>

            <Modal 
                isOpen={isAttendanceFormModalOpen} 
                onClose={closeAttendanceFormModal} 
                title={isAttendanceFormEditMode ? "Davomatni Tahrirlash" : "Yangi Davomat Qo'shish"} 
                size="xlarge" 
            >
                {isAttendanceFormModalOpen && (
                    <AttendanceForm
                        token={token}
                        initialData={attendanceFormInitialData} 
                        isEditMode={isAttendanceFormEditMode}
                        groups={groups} 
                        groupsLoading={loadingGroups && groups.length === 0} 
                        groupsError={errorGroups}    
                        onFormSubmit={handleAttendanceFormSubmit}
                        onCancel={closeAttendanceFormModal}
                        showToast={showToast}
                    />
                )}
            </Modal>
        </div>
    );
};

export default AttendanceList;