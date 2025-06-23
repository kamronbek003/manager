import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { PlusCircle, Edit3, Trash2, Search, LibraryBig } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import LoadingSpinner from '../Essential/LoadingSpinner';
import ConfirmationModal from '../Essential/ConfirmationModal';

const LazyCourseForm = lazy(() => import('./CourseForm'));

const DEBOUNCE_DELAY = 300;

const CourseList = ({ token, showToast }) => {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const searchTimeoutRef = useRef(null);

  const fetchCourses = useCallback(async (search = searchTerm) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);

      const response = await apiRequest(`/courses?${queryParams.toString()}`, 'GET', null, token);
      setCourses(response.data || []);
    } catch (err) {
      console.error("[CourseList] fetchCourses: Error:", err);
      setError(err.message || 'Kurslarni yuklashda xatolik.');
      if (showToast) showToast(err.message || 'Kurslarni yuklashda xatolik.', 'error');
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, showToast, searchTerm]);

  const debouncedFetchCourses = useCallback((newSearchTerm) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchCourses(newSearchTerm);
    }, DEBOUNCE_DELAY);
  }, [fetchCourses]);

  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedFetchCourses(value);
  }, [debouncedFetchCourses]);

  useEffect(() => {
    if (token) fetchCourses();
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [fetchCourses, token]);

  const handleAddCourse = useCallback(() => {
    setEditingCourse(null);
    setIsModalOpen(true);
  }, []);

  const handleEditCourse = useCallback((course) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  }, []);

  const confirmDeleteCourse = useCallback((course) => {
    setCourseToDelete(course);
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteCourse = useCallback(async () => {
    if (!courseToDelete) return;
    try {
      await apiRequest(`/courses/${courseToDelete.id}`, 'DELETE', null, token);
      if (showToast) showToast('Kurs muvaffaqiyatli oʻchirildi.', 'success');
      fetchCourses();
    } catch (err) {
      console.error("[CourseList] handleDeleteCourse: Error:", err);
      let deleteErrorMsg = 'Kursni oʻchirishda xatolik.';
      if (err.message?.includes('foreign key constraint')) {
        deleteErrorMsg = 'Kursni oʻchirib boʻlmadi. Unga bogʻliq boshqa yozuvlar mavjud.';
      } else if (err.statusCode === 404) {
        deleteErrorMsg = 'Kurs topilmadi.';
      } else if (err.message) {
        deleteErrorMsg = err.message;
      }
      if (showToast) showToast(deleteErrorMsg, 'error');
    } finally {
      setShowDeleteConfirm(false);
      setCourseToDelete(null);
    }
  }, [courseToDelete, token, showToast, fetchCourses]);

  const handleSaveCourse = useCallback(() => {
    setIsModalOpen(false);
    fetchCourses();
  }, [fetchCourses]);

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-100 mt-0">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200">
        <div className="p-6 sm:p-8 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl sm:text-3xl font-semibold text-gray-800 flex items-center">
              <LibraryBig size={36} className="mr-3 text-indigo-600" aria-hidden="true" />
              Kurslar Ro'yxati
            </h2>
            <button
              onClick={handleAddCourse}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out flex items-center"
            >
              <PlusCircle size={18} className="mr-2" aria-hidden="true" />
              Yangi Kurs
            </button>
          </div>
        </div>

        {error && (
          <div className="p-6 sm:p-8">
            <div className="bg-red-50 text-red-700 p-4 rounded-lg flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
                X
              </button>
            </div>
          </div>
        )}

        {isLoading && courses.length === 0 && (
          <div className="p-6 sm:p-8">
            <LoadingSpinner text="Kurslar yuklanmoqda..." />
          </div>
        )}

        {!isLoading && courses.length === 0 && !error && (
          <div className="p-6 sm:p-8 text-center text-gray-500">
            <LibraryBig size={48} className="mx-auto mb-3 opacity-50" aria-hidden="true" />
            <p className="font-semibold text-lg">
              {searchTerm ? "Qidiruv natijasi bo'yicha kurslar topilmadi." : "Hozircha kurslar mavjud emas."}
            </p>
            {!searchTerm && <p className="text-sm">Yangi kurs qo'shish uchun yuqoridagi tugmani bosing.</p>}
          </div>
        )}

        {courses.length > 0 && (
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-gradient-to-br from-white to-indigo-50 border-2 border-indigo-300 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
                >
                  <div className="p-5 flex-grow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.name}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {course.description || 'Tavsif mavjud emas'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Yaratildi: {new Date(course.createdAt).toLocaleDateString('uz-UZ')}
                    </p>
                  </div>
                  <div className="bg-indigo-100 p-4 flex justify-end items-center space-x-3 border-t-2 border-indigo-200">
                    <button
                      onClick={() => handleEditCourse(course)}
                      className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium p-2 rounded-md hover:bg-indigo-200 transition-colors"
                      title="Tahrirlash"
                    >
                      <Edit3 size={18} className="mr-1" />
                      <span className="hidden sm:inline">Tahrirlash</span>
                    </button>
                    <button
                      onClick={() => confirmDeleteCourse(course)}
                      className="flex items-center text-sm text-red-600 hover:text-red-800 font-medium p-2 rounded-md hover:bg-red-200 transition-colors"
                      title="O'chirish"
                    >
                      <Trash2 size={18} className="mr-1" />
                      <span className="hidden sm:inline">O'chirish</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isModalOpen && (
          <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60]"><LoadingSpinner size="large" /></div>}>
            <LazyCourseForm
              token={token}
              course={editingCourse}
              onClose={() => setIsModalOpen(false)}
              onSave={handleSaveCourse}
              showToast={showToast}
            />
          </Suspense>
        )}

        {showDeleteConfirm && courseToDelete && (
          <ConfirmationModal
            isOpen={showDeleteConfirm}
            onClose={() => {
              setShowDeleteConfirm(false);
              setCourseToDelete(null);
            }}
            onConfirm={handleDeleteCourse}
            title="Kursni O'chirish"
            message={`"${courseToDelete.name}" nomli kursni haqiqatan ham o'chirmoqchimisiz? Bu amalni orqaga qaytarib bo'lmaydi.`}
          />
        )}
      </div>
    </div>
  );
};

export default CourseList;