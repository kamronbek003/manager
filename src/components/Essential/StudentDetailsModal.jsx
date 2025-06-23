import React, { useMemo } from 'react';
import { Edit } from 'lucide-react';
import { formatDDMMYYYY } from '../../utils/helpers';

const StudentDetailsModal = ({ student, groups, onClose, onEdit }) => {
  const groupMap = useMemo(() => {
    if (!groups || groups.length === 0) return {};
    return groups.reduce((acc, group) => {
      acc[group.id] = group.name || group.groupId || `ID: ${group.id}`;
      return acc;
    }, {});
  }, [groups]);

  const formatDateTime = (date) => {
    if (!date) return 'Ma\'lumot yo\'q';
    try {
      return new Date(date).toLocaleString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Noto\'g\'ri sana formati';
    }
  };

  const groupDisplayNames = student?.groups?.length > 0
    ? student.groups.map(group => groupMap[group.id] || 'Noma\'lum guruh').join(', ')
    : 'Guruh yo\'q';

  return (
    <div className="p-6 sm:p-8 space-y-8 max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Talaba ma'lumotlari</h2>
        <button
          onClick={onEdit}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
        >
          <Edit size={16} className="mr-2" />
          Tahrirlash
        </button>
      </div>

      {/* Shaxsiy ma'lumotlar */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Shaxsiy ma'lumotlar</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-600">Talaba ID</span>
            <p className="mt-1 text-sm text-gray-900 font-semibold">{student?.studentId || 'Yo\'q'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Ism</span>
            <p className="mt-1 text-sm text-gray-900 font-semibold">{student?.firstName || 'Yo\'q'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Familiya</span>
            <p className="mt-1 text-sm text-gray-900 font-semibold">{student?.lastName || 'Yo\'q'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Telefon</span>
            <p className="mt-1 text-sm text-gray-900">{student?.phone || 'Yo\'q'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Tug'ilgan sana</span>
            <p className="mt-1 text-sm text-gray-900">{formatDDMMYYYY(student?.dateBirth) || 'Yo\'q'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Ota-ona telefoni</span>
            <p className="mt-1 text-sm text-gray-900">{student?.parentPhone || 'Yo\'q'}</p>
          </div>
          <div className="sm:col-span-2">
            <span className="text-sm font-medium text-gray-600">Manzil</span>
            <p className="mt-1 text-sm text-gray-900">{student?.address || 'Yo\'q'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Status</span>
            <p className="mt-1">
              <span
                className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
                  student?.status === 'FAOL' ? 'bg-green-100 text-green-800'
                  : student?.status === 'NOFAOL' ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
                }`}
              >
                {student?.status?.toLowerCase() || 'Noma\'lum'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Guruhlar va qo'shimcha ma'lumotlar */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Guruhlar va qo'shimcha ma'lumotlar</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-600">Guruhlar</span>
            <p className="mt-1 text-sm text-gray-900">{groupDisplayNames}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Chegirma foizi (%)</span>
            <p className="mt-1 text-sm text-gray-900">{student?.discountPercentage || student?.discount || 0}%</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Qachon kelgan</span>
            <p className="mt-1 text-sm text-gray-900">{formatDateTime(student?.whenCome)}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Oilada boshqa o'quvchilar</span>
            <p className="mt-1 text-sm text-gray-900">{student?.hasFamilyMembers ? 'Ha' : 'Yo\'q'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Qaysi maktab</span>
            <p className="mt-1 text-sm text-gray-900">{student?.whichSchool || 'Yo\'q'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Qanday topdi</span>
            <p className="mt-1 text-sm text-gray-900">
              {student?.howFind ? {
                SOCIAL_MEDIA: 'Ijtimoiy tarmoqlar',
                FRIEND_REFERRAL: 'Do\'st tavsiyasi',
                ADVERTISEMENT: 'Reklama',
                OTHER: 'Boshqa',
              }[student.howFind] || 'Noma\'lum' : 'Yo\'q'}
            </p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Ball</span>
            <p className="mt-1 text-sm text-gray-900">{student?.ball || 0}</p>
          </div>
        </div>
      </div>

      {/* To'lov ma'lumotlari */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">To'lov ma'lumotlari</h3>
        <div className="space-y-6">
          <div>
            <span className="text-sm font-medium text-gray-600">Birinchi to'lov izohi</span>
            <p className="mt-1 text-sm text-gray-900">{student?.firstPaymentNote || 'Izoh yo\'q'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">To'lov tarixi</span>
            {student?.paymentHistory && student.paymentHistory.length > 0 ? (
              <div className="mt-4 overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sana</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Summa</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Izoh</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {student.paymentHistory.map((payment, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{formatDateTime(payment.date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {payment.amount ? Number(payment.amount).toLocaleString('uz-UZ') : '0'} so'm
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{payment.note || 'Izoh yo\'q'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">To'lov tarixi mavjud emas.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailsModal;