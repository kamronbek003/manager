import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiRequest } from '../../utils/api'; 
import ErrorMessage from '../Essential/ErrorMessage'; 
import LoadingSpinner from '../Essential/LoadingSpinner'; 
import { User } from 'lucide-react'; 

const AttendanceStatus = { KELDI: 'KELDI', KELMADI: 'KELMADI', KECHIKDI: 'KECHIKDI', SABABLI: 'SABABLI' };

const formatDateToYYYYMMDD = (dateInput) => {
    if (!dateInput) return '';
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return ''; 
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("Error formatting date to YYYY-MM-DD:", e);
        return '';
    }
};

const convertYYYYMMDDToISO = (yyyymmdd) => {
    if (!yyyymmdd || typeof yyyymmdd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(yyyymmdd)) {
        console.warn("Invalid input for convertYYYYMMDDToISO:", yyyymmdd);
        return null;
    }
    try {
        const [year, month, day] = yyyymmdd.split('-').map(Number);
        const dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)); 
        if (isNaN(dateObj.getTime()) || dateObj.getUTCFullYear() !== year || dateObj.getUTCMonth() + 1 !== month || dateObj.getUTCDate() !== day) {
            console.warn("Invalid date components after conversion for YYYY-MM-DD:", yyyymmdd);
            return null;
        }
        return dateObj.toISOString();
    } catch (e) {
        console.error("Error converting YYYY-MM-DD to ISO:", e);
        return null;
    }
};


const AttendanceForm = ({
    token,
    initialData, 
    isEditMode, 
    groups,
    groupsLoading,
    groupsError,
    onFormSubmit,
    onCancel,
    showToast 
}) => {
    const [selectedGroupId, setSelectedGroupId] = useState(initialData?.groupId || '');
    const [selectedGroupTeacher, setSelectedGroupTeacher] = useState(null);
    const [studentsInGroup, setStudentsInGroup] = useState([]);
    const [loadingStudentsInGroup, setLoadingStudentsInGroup] = useState(false);
    const [errorStudentsInGroup, setErrorStudentsInGroup] = useState(null); 
    const [attendanceDate, setAttendanceDate] = useState(
        initialData?.date ? formatDateToYYYYMMDD(initialData.date) : formatDateToYYYYMMDD(new Date())
    );
    const [studentStatuses, setStudentStatuses] = useState({});
    const [existingAttendancesMap, setExistingAttendancesMap] = useState({});
    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitError, setSubmitError] = useState(null); 
    const [submitSuccessInfo, setSubmitSuccessInfo] = useState({ count: 0, message: '' });

    const fetchStudentsByGroup = useCallback(async (groupId) => {
        if (!groupId) {
            setStudentsInGroup([]);
            setStudentStatuses({});
            setSelectedGroupTeacher(null);
            return;
        }
        setLoadingStudentsInGroup(true);
        setErrorStudentsInGroup(null); 
        setStudentStatuses({}); 
        setExistingAttendancesMap({}); 

        const groupDetails = groups.find(g => g.id === groupId);
        if (groupDetails?.teacher) {
            setSelectedGroupTeacher(`${groupDetails.teacher.firstName} ${groupDetails.teacher.lastName}`);
        } else {
            setSelectedGroupTeacher(null);
        }

        try {
            const studentsData = await apiRequest(`/students?limit=100&filterByGroupId=${groupId}&status=FAOL&sortBy=firstName`, 'GET', null, token);
            if (studentsData && Array.isArray(studentsData.data)) {
                setStudentsInGroup(studentsData.data);
                if (!isEditMode || !attendanceDate) { 
                    const initialStatuses = studentsData.data.reduce((acc, student) => {
                        acc[student.id] = AttendanceStatus.KELDI;
                        return acc;
                    }, {});
                    setStudentStatuses(initialStatuses);
                }
            } else {
                setStudentsInGroup([]);
                const msg = "Tanlangan guruh uchun talabalarni yuklab bo'lmadi yoki talabalar mavjud emas.";
                if (showToast) showToast(msg, "warning");
                else setErrorStudentsInGroup(msg);
            }
        } catch (err) {
            console.error("Error fetching students for group:", err);
            const errorMsg = err.message || "Guruh talabalarini yuklashda xatolik.";
            if (showToast) showToast(errorMsg, "error");
            else setErrorStudentsInGroup(errorMsg);
            setStudentsInGroup([]);
        } finally {
            setLoadingStudentsInGroup(false);
        }
    }, [token, groups, isEditMode, attendanceDate, showToast]); 

    const fetchExistingAttendances = useCallback(async (groupId, dateStrYYYYMMDD) => {
        if (!isEditMode || !groupId || !dateStrYYYYMMDD) {
            if(studentsInGroup.length > 0 && Object.keys(studentStatuses).length === 0 && !isEditMode){
                const initialStatuses = studentsInGroup.reduce((acc, student) => {
                    acc[student.id] = AttendanceStatus.KELDI;
                    return acc;
                }, {});
                setStudentStatuses(initialStatuses);
            }
            return;
        }
        
        setLoadingStudentsInGroup(true); 
        const isoDate = convertYYYYMMDDToISO(dateStrYYYYMMDD);
        if (!isoDate) {
            const msg = "Tahrirlash uchun sana formatida xatolik.";
            if (showToast) showToast(msg, "error");
            else setErrorStudentsInGroup(msg);
            setLoadingStudentsInGroup(false);
            return;
        }

        try {
            const limit = studentsInGroup.length > 0 ? studentsInGroup.length : 100; 
            const attendanceData = await apiRequest(`/attendances?filterByGroupId=${groupId}&filterByDate=${isoDate}&limit=${limit}`, 'GET', null, token);
            
            const newExistingAttendancesMap = {};
            const newStudentStatuses = studentsInGroup.reduce((acc, student) => {
                acc[student.id] = AttendanceStatus.KELDI; 
                return acc;
            }, {});

            if (attendanceData && Array.isArray(attendanceData.data)) {
                attendanceData.data.forEach(att => {
                    if (att.studentId) { 
                        newExistingAttendancesMap[att.studentId] = { id: att.id, status: att.status, date: att.date }; 
                        newStudentStatuses[att.studentId] = att.status; 
                    }
                });
            }
            
            setExistingAttendancesMap(newExistingAttendancesMap);
            setStudentStatuses(newStudentStatuses);

        } catch (err) {
            console.error("Error fetching existing attendances:", err);
            const errorMsg = err.message || "Mavjud davomatni yuklashda xatolik.";
            if (showToast) showToast(errorMsg, "error");
            else setErrorStudentsInGroup(errorMsg);
            const defaultStatuses = studentsInGroup.reduce((acc, student) => { 
                acc[student.id] = AttendanceStatus.KELDI;
                return acc;
            }, {});
            setStudentStatuses(defaultStatuses);
            setExistingAttendancesMap({});
        } finally {
            setLoadingStudentsInGroup(false);
        }
    }, [token, isEditMode, studentsInGroup, showToast]);

    useEffect(() => {
        if (selectedGroupId) {
            fetchStudentsByGroup(selectedGroupId);
        } else {
            setStudentsInGroup([]); 
            setSelectedGroupTeacher(null);
            setStudentStatuses({});
            setExistingAttendancesMap({});
        }
    }, [selectedGroupId, fetchStudentsByGroup]); 

    useEffect(() => {
        if (isEditMode && selectedGroupId && attendanceDate && studentsInGroup.length > 0) {
            fetchExistingAttendances(selectedGroupId, attendanceDate);
        } else if (!isEditMode && studentsInGroup.length > 0 && Object.keys(studentStatuses).length === 0) {
            const initialStatuses = studentsInGroup.reduce((acc, student) => {
                acc[student.id] = AttendanceStatus.KELDI;
                return acc;
            }, {});
            setStudentStatuses(initialStatuses);
            setExistingAttendancesMap({}); 
        }
    }, [isEditMode, selectedGroupId, attendanceDate, studentsInGroup, fetchExistingAttendances]);


    const handleGroupChange = useCallback((e) => {
        setSelectedGroupId(e.target.value);
    }, []);

    const handleDateChange = useCallback((e) => {
        setAttendanceDate(e.target.value);
    }, []);

    const handleStatusChange = useCallback((studentId, status) => {
        setStudentStatuses(prev => ({
            ...prev,
            [studentId]: status,
        }));
    }, []);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setSubmitError(null);
        setSubmitSuccessInfo({ count: 0, message: '' });

        if (!selectedGroupId) { 
            if (showToast) showToast("Iltimos, guruhni tanlang.", "error");
            else setSubmitError("Iltimos, guruhni tanlang."); 
            return; 
        }
        if (!attendanceDate) { 
            if (showToast) showToast("Iltimos, davomat sanasini tanlang.", "error");
            else setSubmitError("Iltimos, davomat sanasini tanlang."); 
            return; 
        }
        if (studentsInGroup.length === 0 && !loadingStudentsInGroup) {
            if (showToast) showToast("Tanlangan guruhda talabalar mavjud emas yoki yuklanmagan.", "warning");
            else setSubmitError("Tanlangan guruhda talabalar mavjud emas yoki yuklanmagan.");
            return;
        }

        const dateOnFormISO = convertYYYYMMDDToISO(attendanceDate); 
        if (!dateOnFormISO) { 
            if (showToast) showToast("Sana formatida xatolik.", "error");
            else setSubmitError("Sana formatida xatolik."); 
            return; 
        }

        setSubmitLoading(true);
        let successfulOperations = 0;
        let noOpOperations = 0; 
        let failedOperations = 0;
        let firstErrorMessage = "";

        const operations = studentsInGroup.map(student => {
            const currentUiStatus = studentStatuses[student.id] || AttendanceStatus.KELMADI;
            const existingRecord = existingAttendancesMap[student.id]; 

            let requestPromise;

            if (isEditMode && existingRecord) {
                const payload = {};
                let needsUpdate = false;
                if (currentUiStatus !== existingRecord.status) {
                    payload.status = currentUiStatus;
                    needsUpdate = true;
                }
                if (dateOnFormISO !== existingRecord.date) {
                    payload.date = dateOnFormISO; 
                    needsUpdate = true;
                }
                if (needsUpdate) {
                    requestPromise = apiRequest(`/attendances/${existingRecord.id}`, 'PATCH', payload, token);
                } else {
                    noOpOperations++;
                    requestPromise = Promise.resolve({ success: true, studentId: student.id, noOp: true });
                }
            } else { 
                const payload = {
                    studentId: student.id,
                    groupId: selectedGroupId,
                    date: dateOnFormISO, 
                    status: currentUiStatus,
                };
                requestPromise = apiRequest('/attendances', 'POST', payload, token);
            }

            return requestPromise
                .then(response => {
                    if (!response.noOp) successfulOperations++; 
                    return { success: true, studentId: student.id, noOp: response.noOp };
                })
                .catch(err => {
                    failedOperations++;
                    const errMsg = err.originalError?.response?.data?.message || err.message || `Talaba (${student.firstName}) uchun amal bajarilmadi.`;
                    if (!firstErrorMessage) firstErrorMessage = Array.isArray(errMsg) ? errMsg.join('; ') : errMsg;
                    console.error(`Error for student ${student.id} (${student.firstName}):`, errMsg);
                    return { success: false, studentId: student.id, error: errMsg };
                });
        });

        try {
            await Promise.allSettled(operations);
            const totalProcessed = successfulOperations + noOpOperations;

            if (failedOperations === 0 && totalProcessed > 0) {
                const message = isEditMode 
                    ? `${successfulOperations} ta yozuv muvaffaqiyatli yangilandi${noOpOperations > 0 ? ` (${noOpOperations} ta o'zgarishsiz qoldi)` : ''}.`
                    : `${successfulOperations} ta yozuv muvaffaqiyatli saqlandi.`;
                if (showToast) showToast(message, "success");
                setSubmitSuccessInfo({ count: successfulOperations, message });
                if (onFormSubmit) onFormSubmit({ success: true, count: successfulOperations, mode: isEditMode ? 'edit' : 'add' });
            } else if (totalProcessed > 0) { 
                const successMessage = isEditMode
                    ? `${successfulOperations} ta yangilandi${noOpOperations > 0 ? `, ${noOpOperations} ta o'zgarishsiz` : ''}`
                    : `${successfulOperations} ta saqlandi`;
                const finalMessage = `${successMessage}. ${failedOperations} ta xatolik.`;
                if (showToast) showToast(finalMessage, "warning");
                setSubmitSuccessInfo({ count: successfulOperations, message: finalMessage });
                setSubmitError(firstErrorMessage || `${failedOperations} ta yozuvda xatolik yuz berdi.`);
                if (onFormSubmit) onFormSubmit({ success: false, count: successfulOperations, errors: failedOperations, mode: isEditMode ? 'edit' : 'add' });
            } else if (failedOperations > 0) { 
                if (showToast) showToast(firstErrorMessage || "Barcha amallar muvaffaqiyatsiz tugadi.", "error");
                else setSubmitError(firstErrorMessage || "Barcha amallar muvaffaqiyatsiz tugadi.");
            } else { 
                const noStudentMsg = "Saqlash uchun talabalar yoki amallar topilmadi.";
                if (showToast) showToast(noStudentMsg, "info");
                else setSubmitError(noStudentMsg);
            }

            if (isEditMode && selectedGroupId && attendanceDate) { 
                fetchExistingAttendances(selectedGroupId, attendanceDate);
            }

        } catch (overallError) { 
            console.error("Unexpected error during attendance submission batch:", overallError);
            if (showToast) showToast("Davomatni saqlashda kutilmagan xatolik yuz berdi.", "error");
            else setSubmitError("Davomatni saqlashda kutilmagan xatolik yuz berdi.");
        } finally {
            setSubmitLoading(false);
        }
    }, [
        selectedGroupId, attendanceDate, studentsInGroup, studentStatuses, token, 
        onFormSubmit, isEditMode, existingAttendancesMap, loadingStudentsInGroup,
        fetchExistingAttendances, showToast 
    ]);

    const inputBaseClass = "mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-150 ease-in-out";
    const labelBaseClass = "block text-sm font-medium text-gray-700 mb-1.5";
    const disabledInputClass = "bg-gray-100 cursor-not-allowed text-gray-500";

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-1 md:p-2">
            {submitError && !showToast && <ErrorMessage message={submitError} onClose={() => setSubmitError(null)} />}
            {groupsError && <ErrorMessage message={`Guruhlarni yuklashda xatolik: ${groupsError}`} />}
            {errorStudentsInGroup && !showToast && <ErrorMessage message={errorStudentsInGroup} onClose={() => setErrorStudentsInGroup(null)} />}
            
            {submitSuccessInfo.message && !submitLoading && !submitError && !showToast && ( 
                <div className="p-3 bg-green-100 text-green-700 border border-green-200 rounded-md text-sm">
                    {submitSuccessInfo.message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="groupId" className={`${labelBaseClass} flex items-center`}>
                        Guruh *
                    </label>
                    <select
                        id="groupId" name="groupId" value={selectedGroupId} onChange={handleGroupChange} required
                        className={`${inputBaseClass} bg-white`}
                        disabled={groupsLoading || !!groupsError || submitLoading}
                    >
                        <option value="" disabled>Guruhni tanlang...</option>
                        {groupsLoading ? <option disabled>Yuklanmoqda...</option> :
                            (groups || []).map(group => ( <option key={group.id} value={group.id}>{group.groupId || group.name || group.id}</option> ))
                        }
                    </select>
                    {selectedGroupTeacher && (
                        <div className="mt-2 flex items-center text-sm text-gray-600">
                            <User size={16} className="mr-1.5 text-indigo-500" />
                            <span>O'qituvchi: <span className="font-medium">{selectedGroupTeacher}</span></span>
                        </div>
                    )}
                </div>

                <div>
                    <label htmlFor="attendanceDate" className={`${labelBaseClass} flex items-center`}>
                        Sana *
                    </label>
                    <input
                        type="date" id="attendanceDate" name="attendanceDate" value={attendanceDate} onChange={handleDateChange} required
                        className={inputBaseClass}
                        disabled={submitLoading}
                    />
                </div>
            </div>

            <div className="mt-6 border-t pt-4">
                <h4 className="text-lg font-medium text-gray-800 mb-3">Talabalar Davomati</h4>
                {loadingStudentsInGroup && <LoadingSpinner message="Talabalar va davomat yuklanmoqda..." />}
                {!loadingStudentsInGroup && !errorStudentsInGroup && studentsInGroup.length === 0 && selectedGroupId && (
                    <p className="text-sm text-gray-500 italic">Tanlangan guruhda aktiv talabalar topilmadi yoki sana uchun davomat mavjud emas.</p>
                )}
                {!loadingStudentsInGroup && !errorStudentsInGroup && studentsInGroup.length > 0 && (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                        {studentsInGroup.map(student => (
                            <div key={student.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-md hover:bg-gray-50">
                                <span className="text-sm font-medium text-gray-900 mb-2 sm:mb-0 sm:mr-2">
                                    {student.firstName} {student.lastName} ({student.studentId || 'ID yo\'q'})
                                </span>
                                <div className="flex flex-wrap gap-1 sm:gap-2">
                                    {Object.values(AttendanceStatus).map(statusKey => (
                                        <button
                                            key={statusKey} type="button" onClick={() => handleStatusChange(student.id, statusKey)}
                                            disabled={submitLoading}
                                            className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${
                                                studentStatuses[student.id] === statusKey
                                                ? (statusKey === AttendanceStatus.KELDI ? 'bg-green-500 text-white' 
                                                    : statusKey === AttendanceStatus.KELMADI ? 'bg-red-500 text-white' 
                                                    : statusKey === AttendanceStatus.KECHIKDI ? 'bg-yellow-500 text-white' 
                                                    : 'bg-blue-500 text-white') 
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            {statusKey}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end space-x-3 pt-5 mt-6 border-t border-gray-200">
                <button 
                    type="button" 
                    onClick={onCancel} 
                    disabled={submitLoading}
                    className={`px-5 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition duration-150 ease-in-out ${submitLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    Bekor qilish
                </button>
                <button
                    type="submit"
                    disabled={submitLoading || loadingStudentsInGroup || studentsInGroup.length === 0 || !selectedGroupId || !attendanceDate}
                    className={`px-5 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out min-w-[120px] flex items-center justify-center ${
                        (submitLoading || loadingStudentsInGroup || studentsInGroup.length === 0 || !selectedGroupId || !attendanceDate)
                        ? 'bg-gray-400 cursor-not-allowed'
                        : (isEditMode ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500')
                    }`}
                >
                    {submitLoading ? <LoadingSpinner size="small" color="white" /> : (isEditMode ? 'Yangilash' : 'Saqlash')}
                </button>
            </div>
        </form>
    );
};

export { AttendanceForm, AttendanceStatus }; 