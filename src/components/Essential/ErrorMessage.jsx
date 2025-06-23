import React from 'react';

const ErrorMessage = ({ message }) => {
    if (!message) return null;

    return (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-md relative mb-4 shadow" role="alert">
            <strong className="font-bold block">Xatolik!</strong> 
            <span className="block sm:inline">{message || 'Noma\'lum xatolik yuz berdi.'}</span> 
        </div>
    );
};

export default ErrorMessage;
