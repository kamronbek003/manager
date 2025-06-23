import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../utils/api';
import LoadingSpinner from '../Essential/LoadingSpinner';
import ErrorMessage from '../Essential/ErrorMessage';
import {
  User,
  DollarSign,
  Calendar,
  Users,
  CheckSquare,
  List,
  AlertTriangle,
  Percent,
  Search, // Import Search icon
  Tag, // Import Tag icon for Student ID
} from 'lucide-react';

const DebtorStudentsList = ({ token }) => {
  const [debtorStudentsData, setDebtorStudentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);
  const [filterName, setFilterName] = useState('');
  const [filterStudentId, setFilterStudentId] = useState('');
  // Yangi holatlar: Qidiruvni boshlash uchun "trigger" holatlari
  const [activeFilterName, setActiveFilterName] = useState('');
  const [activeFilterStudentId, setActiveFilterStudentId] = useState('');

  const monthStatusMap = {
    YANVAR: 1,
    FEVRAL: 2,
    MART: 3,
    APREL: 4,
    MAY: 5,
    IYUN: 6,
    IYUL: 7,
    AVGUST: 8,
    SENTABR: 9,
    OKTABR: 10,
    NOYABR: 11,
    DEKABR: 12,
  };

  const calculateMonthsActive = (startDateString) => {
    const startDate = new Date(startDateString);
    const currentDate = new Date();

    if (isNaN(startDate.getTime())) {
      console.warn('calculateMonthsActive uchun yaroqsiz sana:', startDateString);
      return 0;
    }

    let yearsDifference = currentDate.getFullYear() - startDate.getFullYear();
    let monthsDifference = currentDate.getMonth() - startDate.getMonth();
    let totalMonths = yearsDifference * 12 + monthsDifference;

    if (currentDate.getDate() >= startDate.getDate() || monthsDifference > 0 || yearsDifference > 0) {
      totalMonths += 1;
    }

    return totalMonths <= 0 ? 1 : totalMonths;
  };

  const getMonthYearList = (startDateString, totalMonths) => {
    const startDate = new Date(startDateString);
    const months = [];

    if (isNaN(startDate.getTime())) {
      return [];
    }

    for (let i = 0; i < totalMonths; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      months.push({
        month: date.getMonth() + 1, // 1-12
        year: date.getFullYear(),
        monthName: Object.keys(monthStatusMap).find(
          (key) => monthStatusMap[key] === date.getMonth() + 1
        ),
      });
    }

    return months;
  };

  // `fetchDebtorData` funksiyasi endi `activeFilterName` va `activeFilterStudentId` ga bog'liq bo'ladi
  const fetchDebtorData = useCallback(async () => {
    console.log('fetchDebtorData: Qarzdorlar ma\'lumotlarini olish boshlandi...');
    setLoading(true);
    setError(null);
    setDebtorStudentsData([]);
    const currentDebugInfo = [];

    try {
      currentDebugInfo.push(
        "Barcha aktiv talabalarni olish (javobda 'groups', 'whenCome', 'discount' va 'createdAt' bo'lishi kerak)..."
      );

      const queryParams = new URLSearchParams({
        limit: 100,
        status: 'FAOL',
        include: 'groups',
      });

      if (activeFilterName) { // Endi bu yerda `activeFilterName` ishlatiladi
        queryParams.append('filterByName', activeFilterName);
      }
      if (activeFilterStudentId) { // Endi bu yerda `activeFilterStudentId` ishlatiladi
        queryParams.append('filterByStudentId', activeFilterStudentId);
      }

      const studentsResponse = await apiRequest(
        `/students?${queryParams.toString()}`,
        'GET',
        null,
        token
      );

      if (!studentsResponse || !Array.isArray(studentsResponse.data)) {
        currentDebugInfo.push(
          `Xatolik: Talabalarni yuklab bo'lmadi yoki ma'lumotlar massiv emas. Javob: ${JSON.stringify(
            studentsResponse
          )}`
        );
        throw new Error("Talabalar ma'lumotini yuklab bo'lmadi.");
      }

      const allStudents = studentsResponse.data;
      currentDebugInfo.push(
        `${allStudents.length} ta aktiv talaba muvaffaqiyatli olindi.`
      );
      console.log('fetchDebtorData: Olingan talabalar:', allStudents);

      const processedDebtors = [];

      for (const student of allStudents) {
        currentDebugInfo.push(
          `Talabani qayta ishlash: ${student.firstName} ${student.lastName} (ID: ${student.id}, StudentID: ${student.studentId}, Chegirma: ${student.discount})`
        );
        console.log(
          `>>> Talabani qayta ishlash:`,
          JSON.parse(JSON.stringify(student))
        );

        const startDate = student.whenCome || student.createdAt;
        if (!startDate) {
          currentDebugInfo.push(
            `  Talaba ${student.studentId}: whenCome yoki createdAt mavjud emas, o'tkazib yuborildi.`
          );
          continue;
        }

        const monthsActive = calculateMonthsActive(startDate);
        const monthYearList = getMonthYearList(startDate, monthsActive);
        currentDebugInfo.push(
          `  Talaba ${student.studentId}: Aktiv oylar = ${monthsActive} (Boshlangan sana: ${startDate})`
        );

        let monthlyRateFromGroups = 0;
        const groupDetails = [];
        if (student.groups && Array.isArray(student.groups)) {
          student.groups.forEach((group, index) => {
            if (
              group &&
              typeof group.coursePrice === 'number' &&
              group.coursePrice > 0
            ) {
              monthlyRateFromGroups += group.coursePrice;
              groupDetails.push({
                id: group.id,
                name: group.name || group.groupId,
                coursePrice: group.coursePrice,
              });
              console.log(
                `>>> Talaba ${student.studentId}, Guruh ${group.id}: Kurs narxi ${group.coursePrice} qo'shildi.`
              );
            } else {
              currentDebugInfo.push(
                `  Ogohlantirish: Guruh ${group?.id || `index ${index}`} yaroqsiz yoki nolga teng kurs narxiga ega.`
              );
            }
          });
        }
        currentDebugInfo.push(
          `  Talaba ${student.studentId}: Guruhlardan oylik jami narx = ${monthlyRateFromGroups}`
        );

        const discountPercentage =
          typeof student.discount === 'number' &&
          student.discount > 0 &&
          student.discount <= 100
            ? student.discount
            : 0;
        let monthlyExpectedPayment = monthlyRateFromGroups;
        let monthlyDiscountAmount = 0;

        if (discountPercentage > 0) {
          monthlyDiscountAmount = monthlyRateFromGroups * (discountPercentage / 100);
          monthlyExpectedPayment = monthlyRateFromGroups - monthlyDiscountAmount;
          currentDebugInfo.push(
            `  Talaba ${student.studentId}: ${discountPercentage}% chegirma qo'llanildi. Chegirma miqdori = ${monthlyDiscountAmount.toFixed(2)}. Kutilgan to'lov = ${monthlyExpectedPayment.toFixed(2)}`
          );
        } else {
          currentDebugInfo.push(
            `  Talaba ${student.studentId}: Chegirma qo'llanilmadi (discount: ${student.discount}).`
          );
        }

        currentDebugInfo.push(
          `  Talaba ${student.studentId} uchun to'lovlarni olish...`
        );
        const paymentsResponse = await apiRequest(
          `/payments?filterByStudentId=${student.id}&limit=100`,
          'GET',
          null,
          token
        );
        const studentPayments = (paymentsResponse?.data || []).filter(
          (p) =>
            typeof p.summa === 'number' &&
            p.summa > 0 &&
            p.whichMonth &&
            p.whichYear
        );
        const totalPaid = studentPayments.reduce(
          (sum, payment) => sum + payment.summa,
          0
        );
        currentDebugInfo.push(
          `  Talaba ${student.studentId}: Jami to'langan = ${totalPaid}`
        );

        const paymentsByMonthYear = studentPayments.reduce((acc, payment) => {
          const key = `${payment.whichYear}-${monthStatusMap[payment.whichMonth]}`;
          acc[key] = (acc[key] || 0) + payment.summa;
          return acc;
        }, {});

        const debtorMonths = [];
        let totalDebt = 0;

        for (const { month, year, monthName } of monthYearList) {
          const key = `${year}-${month}`;
          const paidAmount = paymentsByMonthYear[key] || 0;
          const expectedPayment = monthlyExpectedPayment;

          if (paidAmount < expectedPayment) {
            const debtForMonth = expectedPayment - paidAmount;
            totalDebt += debtForMonth;
            debtorMonths.push({
              month: monthName,
              year,
              expectedPayment: expectedPayment.toFixed(2),
              paidAmount: paidAmount.toFixed(2),
              debtAmount: debtForMonth.toFixed(2),
            });
            currentDebugInfo.push(
              `  Talaba ${student.studentId}: ${monthName} ${year} uchun qarz = ${debtForMonth.toFixed(2)} (Kutilgan: ${expectedPayment}, To'langan: ${paidAmount})`
            );
          }
        }

        if (debtorMonths.length > 0) {
          const groupAttendanceDetails = [];
          if (student.groups && Array.isArray(student.groups)) {
            for (const group of student.groups) {
              if (!group || !group.id) continue;
              const groupName = group.name || group.groupId || `ID: ${group.id}`;
              const attendanceResponse = await apiRequest(
                `/attendances?filterByStudentId=${student.id}&filterByGroupId=${group.id}&limit=100`,
                'GET',
                null,
                token
              );
              const attendanceCount = attendanceResponse?.total || 0;
              groupAttendanceDetails.push({
                id: group.id,
                name: groupName,
                attendanceCount,
                coursePrice: group.coursePrice || 0,
              });
              currentDebugInfo.push(
                `  Talaba ${student.studentId}, Guruh ${groupName}: Davomat = ${attendanceCount}`
              );
            }
          }

          processedDebtors.push({
            ...student,
            debtAmount: parseFloat(totalDebt.toFixed(2)),
            monthlyRateBeforeDiscount: parseFloat(monthlyRateFromGroups.toFixed(2)),
            monthlyExpectedPayment: parseFloat(monthlyExpectedPayment.toFixed(2)),
            monthlyDiscountAmount: parseFloat(monthlyDiscountAmount.toFixed(2)),
            totalPaid,
            monthsActive,
            groupAttendanceDetails,
            debtorMonths,
            groupDetails,
          });
        }
      }

      currentDebugInfo.push(
        `Qayta ishlash tugallandi. ${processedDebtors.length} ta qarzdor topildi.`
      );
      console.log('fetchDebtorData: Qayta ishlangan qarzdorlar:', processedDebtors);
      setDebtorStudentsData(
        processedDebtors.sort((a, b) => b.debtAmount - a.debtAmount)
      );
    } catch (err) {
      console.error('Qarzdor talabalar ro\'yxatini yuklashda xatolik:', err);
      currentDebugInfo.push(`KRITIK XATOLIK: ${err.message}`);
      setError(err.message || 'Ma\'lumotlarni yuklashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
      setDebugInfo(currentDebugInfo);
      console.log('fetchDebtorData: Ma\'lumotlarni olish tugadi.');
    }
  }, [token, activeFilterName, activeFilterStudentId]); // Bog'liqliklar `active` holatlarga o'zgartirildi

  useEffect(() => {
    fetchDebtorData();
  }, [fetchDebtorData]);

  // Input qiymatlarini yangilash funksiyalari
  const handleFilterNameChange = (e) => {
    setFilterName(e.target.value);
  };

  const handleFilterStudentIdChange = (e) => {
    setFilterStudentId(e.target.value);
  };

  // Enter tugmasi bosilganda qidiruvni ishga tushirish
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setActiveFilterName(filterName);
      setActiveFilterStudentId(filterStudentId);
    }
  };

  // Qidiruv tugmasini bosganda qidiruvni ishga tushirish
  const handleSearchClick = () => {
    setActiveFilterName(filterName);
    setActiveFilterStudentId(filterStudentId);
  };

  const renderDebugInfo = () => (
    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-md text-xs text-yellow-700 max-h-60 overflow-y-auto">
      <h3 className="font-semibold mb-2 text-sm flex items-center">
        <AlertTriangle size={16} className="mr-2" />
        Debug Ma'lumotlari:
      </h3>
      <ul>
        {debugInfo.map((info, index) => (
          <li key={index} className="py-0.5">{info}</li>
        ))}
      </ul>
    </div>
  );

  if (loading) {
    return (
      <div className="p-8 text-center">
        <LoadingSpinner message="Qarzdorlar ro'yxati yuklanmoqda..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorMessage message={error} onClose={() => setError(null)} />
        {renderDebugInfo()}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen m-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-300">
          <h2 className="text-xl sm:text-3xl font-semibold text-gray-800 flex items-center">
            <DollarSign size={36} className="mr-3 text-red-600" />
            Qarzdor Talabalar Ro'yxati
          </h2>
          {debtorStudentsData.length > 0 && !loading && (
            <div className="text-lg font-semibold text-red-600 bg-red-100 px-3 py-1 rounded-md">
              Jami qarzdorlar: {debtorStudentsData.length} ta
            </div>
          )}
        </div>

        {/* Search Inputs and Button */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-end"> {/* Tugma uchun bo'sh joy qoldirildi */}
          <div className="relative">
            <label htmlFor="filterName" className="sr-only">Ism yoki familiya bo'yicha qidirish</label>
            <input
              id="filterName"
              type="text"
              placeholder="Ism yoki familiya bo'yicha qidirish..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={filterName}
              onChange={handleFilterNameChange}
              onKeyDown={handleKeyDown}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={20} className="text-gray-400" />
            </div>
          </div>
          <div className="relative">
            <label htmlFor="filterStudentId" className="sr-only">Talaba IDsi bo'yicha qidirish</label>
            <input
              id="filterStudentId"
              type="text"
              placeholder="Talaba IDsi bo'yicha qidirish..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={filterStudentId}
              onChange={handleFilterStudentIdChange}
              onKeyDown={handleKeyDown} 
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Tag size={20} className="text-gray-400" />
            </div>
          </div>
          <button
            onClick={handleSearchClick}
            className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
          >
            <Search size={20} className="inline mr-2" /> Qidirish
          </button>
        </div>

        {/* {renderDebugInfo()} */}

        {!loading && debtorStudentsData.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-md">
            <CheckSquare size={52} className="mx-auto mb-4 text-green-500" />
            <p className="text-xl font-semibold">
              Hozircha qarzdor talabalar mavjud emas.
            </p>
            <p className="mt-1 text-sm">
              Barcha talabalar o'z vaqtida to'lov qilgan.
            </p>
          </div>
        ) : (
          !loading &&
          debtorStudentsData.length > 0 && (
            <div className="space-y-6">
              {debtorStudentsData.map((student) => (
                <div
                  key={student.id}
                  className="bg-white shadow-lg rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-indigo-700 flex items-center">
                        <User size={24} className="mr-2" />
                        {student.firstName} {student.lastName}
                      </h2>
                      <p className="text-sm text-gray-500">
                        ID: {student.studentId} |{' '}
                        {typeof student.discount === 'number' &&
                          student.discount > 0 && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                              <Percent size={10} className="inline mr-0.5" />{' '}
                              {student.discount}% chegirma
                            </span>
                          )}
                      </p>
                    </div>
                    <div className="mt-3 sm:mt-0 text-left sm:text-right">
                      <p className="text-2xl font-bold text-red-600">
                        {student.debtAmount.toLocaleString()} so'm
                      </p>
                      <p className="text-xs text-gray-500">umumiy qarz</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4 border-t border-b border-gray-200 py-4">
                    <div className="flex items-center text-gray-700">
                      <Calendar size={16} className="mr-2 text-gray-500" />
                      Aktiv oylar:{' '}
                      <span className="font-medium ml-1">
                        {student.monthsActive} oy
                      </span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <DollarSign size={16} className="mr-2 text-green-500" />
                      Jami to'langan:{' '}
                      <span className="font-medium ml-1">
                        {student.totalPaid.toLocaleString()} so'm
                      </span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <DollarSign size={16} className="mr-2 text-orange-500" />
                      Oylik kutilgan to'lov:{' '}
                      <span className="font-medium ml-1">
                        {student.monthlyExpectedPayment?.toLocaleString()} so'm
                      </span>
                      {student.monthlyDiscountAmount > 0 && (
                        <span className="text-xs text-gray-500 ml-1">
                          (asli:{' '}
                          {student.monthlyRateBeforeDiscount?.toLocaleString()}{' '}
                          so'm)
                        </span>
                      )}
                    </div>
                  </div>

                  {student.debtorMonths && student.debtorMonths.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-md font-semibold text-gray-700 mb-2 flex items-center">
                        <AlertTriangle size={18} className="mr-2 text-red-500" />
                        Qarzdor Oylar:
                      </h4>
                      <ul className="space-y-1.5">
                        {student.debtorMonths.map((month, index) => (
                          <li
                            key={index}
                            className="text-sm text-gray-600 p-2 bg-red-50 rounded-md border border-red-100"
                          >
                            <span className="font-medium">
                              {month.month} {month.year}
                            </span>
                            : Qarz = {month.debtAmount} so'm (Kutilgan:{' '}
                            {month.expectedPayment} so'm, To'langan:{' '}
                            {month.paidAmount} so'm)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {student.groupDetails && student.groupDetails.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-700 mb-2 flex items-center">
                        <List size={18} className="mr-2 text-gray-500" />
                        Guruhlar Ma'lumotlari:
                      </h4>
                      <ul className="space-y-1.5">
                        {student.groupDetails.map((detail) => (
                          <li
                            key={detail.id}
                            className="text-sm text-gray-600 p-2 bg-gray-50 rounded-md border border-gray-100"
                          >
                            <span className="font-medium">{detail.name}</span>
                            <span className="block text-xs text-gray-500 mt-0.5">
                              Guruh narxi:{' '}
                              {detail.coursePrice.toLocaleString()} so'm/oy
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {student.groupAttendanceDetails &&
                    student.groupAttendanceDetails.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-md font-semibold text-gray-700 mb-2 flex items-center">
                          <Users size={18} className="mr-2 text-gray-500" />
                          Guruhdagi Davomat:
                        </h4>
                        <ul className="space-y-1.5">
                          {student.groupAttendanceDetails.map((detail) => (
                            <li
                              key={detail.id}
                              className="text-sm text-gray-600 p-2 bg-gray-50 rounded-md border border-gray-100"
                            >
                              <span className="font-medium">{detail.name}</span>:{' '}
                              {detail.attendanceCount} ta darsga kelgan.
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {(!student.groupDetails || student.groupDetails.length === 0) &&
                    (!student.groupAttendanceDetails ||
                      student.groupAttendanceDetails.length === 0) && (
                      <p className="text-sm text-gray-500 italic">
                        Bu talaba uchun guruh ma'lumotlari topilmadi yoki
                        guruhlarga biriktirilmagan.
                      </p>
                    )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default DebtorStudentsList;