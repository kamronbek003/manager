import React, { useEffect } from 'react';
import { Bell, X, Phone, Info, FileText, LibraryBig, CalendarClock } from 'lucide-react'; 

const InAppNotification = ({ note, onClose }) => {

    useEffect(() => {
        if (note) {
        }
    }, [note]);

    if (!note || !note.id) {
        return null;
    }

    const isApplication = note._internal_type === 'application';
    const isNote = note._internal_type === 'note';

    let titleText = '';
    if (isNote) {
        titleText = `Eslatma: ${note.fullName || 'Noma\'lum'}`;
    } else if (isApplication) {
        titleText = `Yangi Ariza: ${note.applicantFullName || 'Noma\'lum Arizachi'}`;
    } else {
        titleText = note.title || 'Bildirishnoma'; 
    }

    const MainIcon = isApplication ? FileText : Bell;
    const iconColor = isApplication ? 'text-green-500' : 'text-blue-500';

    return (
        <div
            className="fixed top-5 right-5 z-[100] w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-slide-in-right"
            role="alert"
            aria-live="assertive"
        >
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                        <MainIcon className={`h-7 w-7 ${iconColor} animate-pulse`} aria-hidden="true" />
                    </div>
                    <div className="ml-3.5 w-0 flex-1">
                        <p className="text-md font-semibold text-gray-800">
                            {titleText}
                        </p>
                        <div className="mt-2 text-sm text-gray-700 space-y-1.5">
                            {isNote && (
                                <>
                                    {note.phone && (
                                        <p className="flex items-center">
                                            <Phone size={15} className="mr-2 text-gray-400 flex-shrink-0" />
                                            <span>{note.phone}</span>
                                        </p>
                                    )}
                                    {note.time && (
                                        <p className="flex items-center font-medium">
                                            <Bell size={15} className="mr-2 text-blue-500 flex-shrink-0" />
                                            <span className="text-blue-600">Vaqt: {note.time}</span>
                                        </p>
                                    )}
                                    {note.about && (
                                        <p className="flex items-start">
                                            <Info size={15} className="mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                                            <span className="break-words">{note.about}</span>
                                        </p>
                                    )}
                                </>
                            )}

                            {isApplication && (
                                <div className="space-y-2">
                                    {note.phoneNumber && (
                                        <div className="flex items-center">
                                            <Phone size={15} className="mr-2.5 text-gray-500 flex-shrink-0" />
                                            <div>
                                                <span className="text-xs text-gray-500">Telefon:</span>
                                                <p className="font-medium text-gray-800">{note.phoneNumber}</p>
                                            </div>
                                        </div>
                                    )}
                                    {note.courseName && (
                                        <div className="flex items-center">
                                            <LibraryBig size={15} className="mr-2.5 text-gray-500 flex-shrink-0" />
                                            <div>
                                                <span className="text-xs text-gray-500">Kurs:</span>
                                                <p className="font-medium text-gray-800">{note.courseName}</p>
                                            </div>
                                        </div>
                                    )}
                                    {note.createdAt && (
                                <div className="flex items-center">
                                    <CalendarClock size={15} className="mr-2.5 text-gray-500 flex-shrink-0" />
                                    <div>
                                        <span className="text-xs text-gray-500">Qabul qilindi:</span>
                                        <p className="font-medium text-gray-800">
                                            {(() => {
                                                const date = new Date(note.createdAt);

                                                if (isNaN(date.getTime())) {
                                                    console.error("Invalid date value for note.createdAt:", note.createdAt);
                                                    return "Noto'g'ri sana";
                                                }

                                                const day = date.getDate();

                                                const uzbekMonths = [
                                                    "yanvar", "fevral", "mart", "aprel", "may", "iyun",
                                                    "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr"
                                                ];
                                                const monthIndex = date.getMonth(); 
                                                const monthName = uzbekMonths[monthIndex];

                                                const hours = date.getHours().toString().padStart(2, '0'); 
                                                const minutes = date.getMinutes().toString().padStart(2, '0'); 
                                                const timeString = `${hours}:${minutes}`;

                                                return `${day}-${monthName}, ${timeString}`;
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            )}
                            </div>
                            )}
                        </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                        <button
                            type="button"
                            className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 p-1.5"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                        >
                            <span className="sr-only">Yopish</span>
                            <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
            <style>
                {`
                    @keyframes slide-in-right {
                        from { transform: translateX(110%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    .animate-slide-in-right { animation: slide-in-right 0.4s ease-out forwards; }
                    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
                    .animate-pulse { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                `}
            </style>
        </div>
    );
};

export default InAppNotification;