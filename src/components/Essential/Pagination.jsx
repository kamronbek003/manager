import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const handlePrev = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    return (
        <div className="mt-6 flex justify-between items-center px-1" aria-label="Pagination">
            <button
                onClick={handlePrev}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center shadow-sm transition duration-150 ease-in-out"
                aria-disabled={currentPage === 1}
            >
                <ChevronLeft size={18} className="mr-1" aria-hidden="true" />
                Oldingi 
            </button>

            <span className="text-sm text-gray-600">
                Sahifa {currentPage} / {totalPages} 
            </span>

            <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center shadow-sm transition duration-150 ease-in-out"
                aria-disabled={currentPage === totalPages}
            >
                Keyingi 
                <ChevronRight size={18} className="ml-1" aria-hidden="true" />
            </button>
        </div>
    );
};

export default Pagination;
