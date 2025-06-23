import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '../../utils/api';
import LoadingSpinner from '../Essential/LoadingSpinner';
import ConfirmationModal from '../Essential/ConfirmationModal';
import { ApplicationStatus, ApplicationStatusUz, ApplicationStatusColors, statusOptions } from '../constants/applicationEnums';
import { Search, RefreshCw, ChevronLeft, ChevronRight, Edit3, BellDot, CheckCircle, Clock, Trash2, AlertCircle, ArrowUpDown } from 'lucide-react';
import ErrorMessage from '../Essential/ErrorMessage';
import Pagination from '../Essential/Pagination';

const ITEMS_PER_PAGE = 10;

const ApplicationList = ({ token, showToast }) => {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(ApplicationStatus.KUTILYABDI);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');

  const [notifiedApplicationIds, setNotifiedApplicationIds] = useState(new Set());
  const initialFetchDone = useRef(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState(null);

  const fetchApplications = useCallback(async (page = currentPage, search = searchTerm, status = activeTab, currentSortBy = sortBy, currentSortOrder = sortOrder) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        sortBy: currentSortBy,
        sortOrder: currentSortOrder,
      });
      if (status === ApplicationStatus.BOGLANILDI && search) {
        queryParams.append('searchFirstName', search);
        queryParams.append('searchLastName', search);
        queryParams.append('searchPhoneNumber', search);
      }
      if (status) queryParams.append('filterByStatus', status);

      const response = await apiRequest(`/applications?${queryParams.toString()}`, 'GET', null, token);
      
      setApplications(response.data || []);
      setTotalItems(response.meta?.total || 0);
      setTotalPages(response.meta?.lastPage || 1);
      setCurrentPage(response.meta?.page || 1);

      if (initialFetchDone.current && Array.isArray(response.data) && status === ApplicationStatus.KUTILYABDI) {
        const newPendingApplications = response.data.filter(
          app => app.status === ApplicationStatus.KUTILYABDI && !notifiedApplicationIds.has(app.id)
        );
        if (newPendingApplications.length > 0) {
          showToast(`Sizda ${newPendingApplications.length} ta yangi ariza mavjud!`, 'info', 5000);
          setNotifiedApplicationIds(prevIds => {
            const newSet = new Set(prevIds);
            newPendingApplications.forEach(app => newSet.add(app.id));
            return newSet;
          });
        }
      } else if (Array.isArray(response.data) && status === ApplicationStatus.KUTILYABDI) {
        const initialPendingIds = new Set();
        response.data.forEach(app => {
          if (app.status === ApplicationStatus.KUTILYABDI) {
            initialPendingIds.add(app.id);
          }
        });
        setNotifiedApplicationIds(initialPendingIds);
        initialFetchDone.current = true;
      }
    } catch (err) {
      console.error("Error fetching applications:", err);
      setError(err.message || 'Arizalarni yuklashda xatolik.');
      showToast(err.message || 'Arizalarni yuklashda xatolik.', 'error');
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, showToast, currentPage, searchTerm, activeTab, sortBy, sortOrder, notifiedApplicationIds]);

  useEffect(() => {
    if (token) {
      const currentSearchTerm = activeTab === ApplicationStatus.KUTILYABDI ? '' : searchTerm;
      if (activeTab === ApplicationStatus.KUTILYABDI && searchTerm !== '') {
        setSearchTerm('');
      }
      fetchApplications(1, currentSearchTerm, activeTab, sortBy, sortOrder);
    }
  }, [token, sortBy, sortOrder, activeTab, fetchApplications]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchApplications(1, searchTerm, activeTab, sortBy, sortOrder);
  };

  const handleRefresh = () => {
    if (activeTab === ApplicationStatus.KUTILYABDI) {
      initialFetchDone.current = false;
    }
    fetchApplications(currentPage, searchTerm, activeTab, sortBy, sortOrder);
  };

  const handleTabChange = (tabStatus) => {
    setActiveTab(tabStatus);
    setCurrentPage(1);
    if (tabStatus === ApplicationStatus.KUTILYABDI) {
      setSearchTerm('');
    }
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      await apiRequest(`/applications/${applicationId}`, 'PATCH', { status: newStatus }, token);
      showToast("Ariza holati muvaffaqiyatli yangilandi.", 'success');
      
      if (newStatus !== activeTab && activeTab !== '') {
        setApplications(prevApps => prevApps.filter(app => app.id !== applicationId));
        setTotalItems(prevTotal => prevTotal > 0 ? prevTotal - 1 : 0);
      } else {
        setApplications(prevApps =>
          prevApps.map(app =>
            app.id === applicationId ? { ...app, status: newStatus } : app
          )
        );
      }
    } catch (err) {
      console.error("Error updating application status:", err);
      showToast(err.message || 'Holatni yangilashda xatolik.', 'error');
    }
  };

  const confirmDeleteApplication = (application) => {
    setApplicationToDelete(application);
    setShowDeleteConfirm(true);
  };

  const handleDeleteApplication = async () => {
    if (!applicationToDelete) return;
    try {
      await apiRequest(`/applications/${applicationToDelete.id}`, 'DELETE', null, token);
      showToast('Ariza muvaffaqiyatli oʻchirildi.', 'success');
      fetchApplications(currentPage, searchTerm, activeTab, sortBy, sortOrder);
    } catch (err) {
      console.error("Error deleting application:", err);
      showToast(err.message || 'Arizani oʻchirishda xatolik.', 'error');
    } finally {
      setShowDeleteConfirm(false);
      setApplicationToDelete(null);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchApplications(newPage, searchTerm, activeTab, sortBy, sortOrder);
    }
  };

  const getStatusBadge = (status) => {
    return (
      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${ApplicationStatusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {ApplicationStatusUz[status] || status}
      </span>
    );
  };

  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(prevOrder => prevOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(newSortBy);
      setSortOrder('ASC');
    }
  };

  if (!token) {
    return (
      <div className="p-4 sm:p-6 md:p-8 bg-gray-100 mt-0">
        <p className="text-red-500 text-center bg-red-50 p-4 rounded-md">Autentifikatsiya tokeni topilmadi.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-100 mt-0">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200">
        <div className="p-6 sm:p-8 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl sm:text-3xl font-semibold text-gray-800 flex items-center">
              <BellDot size={36} className="mr-3 text-indigo-600" aria-hidden="true" />
              Arizalar Ro'yxati
            </h2>
            <div className="flex space-x-2 sm:space-x-4">
              <button
                onClick={() => handleTabChange(ApplicationStatus.KUTILYABDI)}
                className={`flex items-center px-3 py-2.5 sm:px-5 font-medium text-sm sm:text-base rounded-lg transition-colors duration-150
                  ${activeTab === ApplicationStatus.KUTILYABDI
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-600'}`}
              >
                <Clock size={18} className="mr-2" />
                Yangi Arizalar
              </button>
              <button
                onClick={() => handleTabChange(ApplicationStatus.BOGLANILDI)}
                className={`flex items-center px-3 py-2.5 sm:px-5 font-medium text-sm sm:text-base rounded-lg transition-colors duration-150
                  ${activeTab === ApplicationStatus.BOGLANILDI
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-600'}`}
              >
                <CheckCircle size={18} className="mr-2" />
                Bog'langan Arizalar
              </button>
            </div>
          </div>
        </div>

        {activeTab === ApplicationStatus.BOGLANILDI && (
          <div className="p-6 sm:p-8 border-b border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4">
                <input
                  type="text"
                  name="search"
                  id="search"
                  className="px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 block w-full"
                  placeholder="Ism, Familiya, Telefon..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={handleApplyFilters}
                  disabled={isLoading && applications.length > 0}
                  className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 w-full"
                >
                  <Search size={18} className="mr-2" />
                  Qidirish
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading && applications.length === 0 && (
          <div className="p-6 sm:p-8">
            <LoadingSpinner text="Arizalar yuklanmoqda..." />
          </div>
        )}
        {error && (
          <div className="p-6 sm:p-8">
            <ErrorMessage message={error} onClose={() => setError(null)} />
          </div>
        )}

        {!isLoading && applications.length === 0 && !error && (
          <div className="p-6 sm:p-8 text-center text-gray-500">
            <BellDot size={48} className="mx-auto mb-3 opacity-50" aria-hidden="true" />
            <p className="font-semibold text-lg">
              Hozircha <span className="font-bold">{ApplicationStatusUz[activeTab] || 'bu bo\'limda'}</span> arizalar mavjud emas.
            </p>
          </div>
        )}

        {applications.length > 0 && (
          <div className="p-6 sm:p-8">
            <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-md">
              <table className="min-w-full bg-white divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('firstName')}
                    >
                      Mijoz <SortIcon column="firstName" currentSort={{ sortBy, sortOrder }} />
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Kurs
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('phoneNumber')}
                    >
                      Telefon <SortIcon column="phoneNumber" currentSort={{ sortBy, sortOrder }} />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('createdAt')}
                    >
                      Ariza Vaqti <SortIcon column="createdAt" currentSort={{ sortBy, sortOrder }} />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider group cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      Holati <SortIcon column="status" currentSort={{ sortBy, sortOrder }} />
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Amallar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="font-medium">{app.firstName || '-'} {app.lastName || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{app.course?.name || 'Noma\'lum'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{app.phoneNumber || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(app.createdAt).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(app.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                        <div className="inline-block relative">
                          <select
                            value={app.status}
                            onChange={(e) => handleStatusChange(app.id, e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:opacity-70"
                          >
                            {statusOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => confirmDeleteApplication(app)}
                          title="O'chirish"
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={totalItems}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              </div>
            )}
          </div>
        )}

        {showDeleteConfirm && applicationToDelete && (
          <ConfirmationModal
            isOpen={showDeleteConfirm}
            onClose={() => {
              setShowDeleteConfirm(false);
              setApplicationToDelete(null);
            }}
            onConfirm={handleDeleteApplication}
            title="O'chirishni tasdiqlash"
            message={`"${applicationToDelete.firstName || ''} ${applicationToDelete.lastName || ''}" (ID: ${applicationToDelete.id}) nomli arizani haqiqatan ham o'chirmoqchimisiz? Bu amalni orqaga qaytarib bo'lmaydi.`}
          />
        )}
      </div>
    </div>
  );
};

const SortIcon = React.memo(({ column, currentSort }) => (
  <ArrowUpDown
    size={14}
    className={`ml-1 inline-block transition-opacity ${currentSort.sortBy === column ? 'opacity-100 text-indigo-600' : 'opacity-30 group-hover:opacity-70'}`}
    aria-hidden="true"
  />
));

export default ApplicationList;