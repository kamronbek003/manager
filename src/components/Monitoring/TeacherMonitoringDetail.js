import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // useNavigate import qilindi
import { apiRequest } from '../../utils/api';
import LoadingSpinner from '../Essential/LoadingSpinner';
import { Users, BookOpen, CheckCircle, XCircle, UserX, ChevronLeft, User } from 'lucide-react'; // ChevronLeft ikonasi qo'shildi

const TeacherMonitoringDetail = ({ token, showToast }) => {
    const { id } = useParams();
    const navigate = useNavigate(); // useNavigate hooki ishlatildi
    const [data, setData] = useState(null);
    const [students, setStudents] = useState([]); // O'qituvchining o'quvchilari ro'yxati uchun state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            setError(null);
            setData(null);
            setStudents([]); // Har safar yuklashda o'quvchilar ro'yxatini tozalash

            console.log(`[TeacherMonitoringDetail] Fetching details for ID: ${id}`);
            console.log(`[TeacherMonitoringDetail] Token provided: ${!!token}`);

            if (!id) {
                setError("O'qituvchi ID si topilmadi.");
                setLoading(false);
                return;
            }
            if (!token) {
                setError("Avtorizatsiya tokeni topilmadi.");
                setLoading(false);
                return;
            }

            try {
                const response = await apiRequest(`/monitoring/teachers/${id}`, 'GET', null, token);
                console.log("[TeacherMonitoringDetail] API Response:", response);

                if (response && response.teacher) {
                    setData(response); // teacher va stats ma'lumotlarini o'rnatish

                    // API javobida 'students' massivi mavjudligini tekshirish
                    if (response.students && Array.isArray(response.students)) {
                        const processedStudents = response.students.map(student => {
                            // Guruh nomini olish: agar groups bo'lsa, birinchi guruhning groupId yoki name
                            const groupName = student.groups && student.groups.length > 0
                                ? (student.groups[0].name || student.groups[0].groupId || 'Noma\'lum guruh')
                                : 'Guruhsiz';

                            // Holatni standartlashtirish
                            const status = student.status === 'FAOL' ? 'ACTIVE' : 'INACTIVE';

                            // Nofaollik sababini olish
                            const inactiveReason = student.status === 'NOFAOL' ? (student.whyStop || 'Sabab ko\'rsatilmagan') : null;

                            return {
                                ...student,
                                groupName,
                                status,
                                inactiveReason,
                            };
                        });
                        setStudents(processedStudents);
                        console.log("[TeacherMonitoringDetail] Processed students data set to state:", processedStudents);
                    } else {
                        console.warn("[TeacherMonitoringDetail] API response did not contain a 'students' array or it was not an array. Please ensure your backend for /monitoring/teachers/:id provides a 'students' array.");
                    }

                } else {
                    setError("Serverdan kutilmagan javob keldi yoki ma'lumotlar bo'sh.");
                    console.warn("[TeacherMonitoringDetail] Unexpected API response structure:", response);
                }
            } catch (err) {
                setError("O'qituvchi ma'lumotlarini yuklashda xatolik yuz berdi.");
                console.error("[TeacherMonitoringDetail] Fetching Teacher Details ERROR:", err.originalError || err);
                if (showToast) {
                    showToast("O'qituvchi ma'lumotlarini yuklashda xatolik yuz berdi.", 'error');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [id, token, showToast]);

    console.log("[TeacherMonitoringDetail] Component rendering. Current state: loading=", loading, "error=", error, "data=", data, "students=", students);

    if (loading) return <LoadingSpinner message="Batafsil ma'lumotlar yuklanmoqda..." />;
    if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

    if (!data || !data.teacher) {
        console.log("[TeacherMonitoringDetail] Data or data.teacher is missing after loading. Displaying 'Ma'lumotlar mavjud emas.'");
        return <div className="text-gray-500 text-center p-4">Ma'lumotlar mavjud emas.</div>;
    }

    const { teacher, stats } = data;

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
                {/* Sarlavha va Orqaga qaytish tugmasi */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center">
                        <User size={30} className="mr-3 text-indigo-600" /> O'qituvchi Ma'lumotlari
                    </h1>
                    <button
                        onClick={() => navigate(-1)} // Oldingi sahifaga qaytish
                        className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md shadow-sm hover:bg-gray-300 transition-colors duration-200"
                    >
                        <ChevronLeft size={20} className="mr-2" /> Orqaga
                    </button>
                </div>

                {/* O'qituvchi asosiy ma'lumotlari */}
                <div className="flex flex-col sm:flex-row items-center sm:space-x-6 mb-8 pb-6 border-b border-gray-200">
                    <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-4 sm:mb-0 flex-shrink-0">
                        <span className="text-4xl font-bold text-indigo-600">
                            {teacher.firstName?.charAt(0)}{teacher.lastName?.charAt(0)}
                        </span>
                    </div>
                    <div className="text-center sm:text-left">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">{teacher.firstName} {teacher.lastName}</h2>
                        <p className="text-lg text-indigo-700 font-semibold mt-1 flex items-center justify-center sm:justify-start">
                            <BookOpen size={20} className="mr-2" /> {teacher.subject}
                        </p>
                        {teacher.phone && (
                            <p className="text-md text-gray-600 mt-1">Telefon: <a href={`tel:${teacher.phone}`} className="text-blue-600 hover:underline">{teacher.phone}</a></p>
                        )}
                        {teacher.address && (
                            <p className="text-md text-gray-600 mt-1">Manzil: {teacher.address}</p>
                        )}
                        {teacher.experience && (
                            <p className="text-md text-gray-600 mt-1">Tajriba: {teacher.experience} yil</p>
                        )}
                        {teacher.startedAt && (
                            <p className="text-md text-gray-600 mt-1">Ish boshlagan sana: {new Date(teacher.startedAt).toLocaleDateString('uz-UZ')}</p>
                        )}
                    </div>
                </div>

                {/* Asosiy statistika */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="p-6 bg-blue-50 rounded-lg text-center shadow-sm">
                        <p className="text-4xl font-extrabold text-blue-600">{stats.totalStudents || 0}</p>
                        <p className="text-sm font-medium text-blue-800 mt-1">Jami O'quvchilar</p>
                    </div>
                    <div className="p-6 bg-green-50 rounded-lg text-center shadow-sm">
                        <p className="text-4xl font-extrabold text-green-600">{stats.activeStudentCount || 0}</p>
                        <p className="text-sm font-medium text-green-800 mt-1">Faol O'quvchilar</p>
                    </div>
                    <div className="p-6 bg-red-50 rounded-lg text-center shadow-sm">
                        <p className="text-4xl font-extrabold text-red-600">{stats.inactiveStudentCount || 0}</p>
                        <p className="text-sm font-medium text-red-800 mt-1">Nofaol O'quvchilar</p>
                    </div>
                </div>

                {/* Nofaol o'quvchilar va sabablari */}
                {stats.inactiveStudentCount > 0 && stats.inactiveReasons && stats.inactiveReasons.length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                            <UserX size={24} className="mr-2 text-red-600" /> Nofaollik Sabablari
                        </h3>
                        <div className="bg-gray-50 p-4 rounded-lg shadow-inner border border-gray-200">
                            <ul className="divide-y divide-gray-200">
                                {stats.inactiveReasons.map((item, index) => (
                                    <li key={index} className="py-3 border-b border-gray-200 last:border-b-0">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-gray-700 font-medium">{item.reason}</span>
                                            <span className="px-3 py-1 text-sm font-semibold text-red-800 bg-red-100 rounded-full">
                                                {item.count} ta o'quvchi
                                            </span>
                                        </div>
                                        {item.students && item.students.length > 0 && (
                                            <ul className="ml-4 list-disc list-inside text-sm text-gray-600">
                                                {item.students.map(student => (
                                                    <li key={student.id} className="mb-1">
                                                        {student.firstName} {student.lastName} ({student.phone})
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* O'qituvchining barcha o'quvchilari ro'yxati */}
                <div className="mt-10">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                        <Users size={24} className="mr-2 text-indigo-600" /> O'quvchilar Ro'yxati ({students.length})
                    </h3>
                    {students.length === 0 ? (
                        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
                            <p>Bu o'qituvchida hozircha o'quvchilar mavjud emas.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Ism Familiya
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Guruh
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Telefon
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Holat
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Sabab (Nofaol bo'lsa)
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {students.map((student) => (
                                        <tr key={student.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {student.firstName} {student.lastName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {student.groupName || 'Mavjud emas'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {student.phone ? <a href={`tel:${student.phone}`} className="text-blue-600 hover:underline">{student.phone}</a> : 'Mavjud emas'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {student.status === 'ACTIVE' ? (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 items-center">
                                                        <CheckCircle size={14} className="mr-1" /> Faol
                                                    </span>
                                                ) : (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 items-center">
                                                        <XCircle size={14} className="mr-1" /> Nofaol
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {student.status === 'INACTIVE' ? (student.inactiveReason || 'Sabab ko\'rsatilmagan') : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeacherMonitoringDetail;
