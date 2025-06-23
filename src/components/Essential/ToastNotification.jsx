import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X as CloseIcon } from 'lucide-react';

const ToastNotification = ({ 
    id, 
    message, 
    type = "info", 
    duration = 4000, 
    onClose,
    position = "top-right" 
}) => {
    const [isExiting, setIsExiting] = useState(false);

    const handleClose = useCallback(() => {
        setIsExiting(true); 
        setTimeout(() => {
            if (onClose && typeof onClose === 'function') {
                onClose(id); 
            }
        }, 300); 
    }, [onClose, id]);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, handleClose, id]);

    const notificationStyles = useMemo(() => {
        switch (type) {
            case "success":
                return {
                    icon: <CheckCircle size={24} className="text-green-500" />,
                    bgColor: "bg-green-50",
                    borderColor: "border-green-400",
                    textColor: "text-green-700",
                    progressBarColor: "bg-green-500",
                };
            case "error":
                return {
                    icon: <XCircle size={24} className="text-red-500" />,
                    bgColor: "bg-red-50",
                    borderColor: "border-red-400",
                    textColor: "text-red-700",
                    progressBarColor: "bg-red-500",
                };
            case "warning":
                return {
                    icon: <AlertTriangle size={24} className="text-yellow-500" />,
                    bgColor: "bg-yellow-50",
                    borderColor: "border-yellow-400",
                    textColor: "text-yellow-700",
                    progressBarColor: "bg-yellow-500",
                };
            case "info":
            default:
                return {
                    icon: <Info size={24} className="text-blue-500" />,
                    bgColor: "bg-blue-50",
                    borderColor: "border-blue-400",
                    textColor: "text-blue-700",
                    progressBarColor: "bg-blue-500",
                };
        }
    }, [type]);

    const positionClasses = useMemo(() => {
        switch (position) {
            case "top-left": return "top-5 left-5";
            case "bottom-right": return "bottom-5 right-5";
            case "bottom-left": return "bottom-5 left-5";
            case "top-center": return "top-5 left-1/2 transform -translate-x-1/2";
            case "bottom-center": return "bottom-5 left-1/2 transform -translate-x-1/2";
            case "top-right":
            default: return "top-5 right-5";
        }
    }, [position]);
    
    const animationClass = isExiting ? 'animate-toast-exit' : 'animate-toast-enter';

    return (
        <div 
            className={`fixed ${positionClasses} w-full max-w-sm p-4 rounded-xl shadow-2xl border ${notificationStyles.bgColor} ${notificationStyles.borderColor} 
                        z-[100] ${animationClass}
                      `}
            role="alert"
            aria-live="assertive" 
            aria-atomic="true"     
        >
            <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5"> 
                    {notificationStyles.icon}
                </div>
                <div className="ml-3 w-0 flex-1">
                    <p className={`text-sm font-semibold ${notificationStyles.textColor}`}>
                        {message}
                    </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button
                        onClick={handleClose}
                        className={`inline-flex rounded-md p-1 ${notificationStyles.bgColor} text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-${type === 'info' ? 'blue' : type}-100 focus:ring-${type === 'info' ? 'blue' : type}-500 transition-colors`}
                    >
                        <span className="sr-only">Yopish</span>
                        <CloseIcon size={20} aria-hidden="true" />
                    </button>
                </div>
            </div>
            {!isExiting && (
                 <div className={`absolute bottom-0 left-0 h-1 rounded-bl-xl ${notificationStyles.progressBarColor} animate-toast-progress`} style={{ animationDuration: `${duration}ms` }}></div>
            )}
            
            <style jsx global>{`
                @keyframes toast-progress-animation {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                .animate-toast-progress {
                    animation: toast-progress-animation linear forwards;
                }

                @keyframes toast-enter-animation {
                    from { 
                        opacity: 0; 
                        transform: ${
                            position.includes('right') ? 'translateX(20px)' : 
                            position.includes('left') ? 'translateX(-20px)' : 
                            position.includes('bottom') ? 'translateY(20px)' : 
                            'translateY(-20px)'
                        };
                    }
                    to { 
                        opacity: 1; 
                        transform: translateX(0) translateY(0);
                    }
                }
                .animate-toast-enter {
                    animation: toast-enter-animation 0.3s ease-out forwards;
                }

                @keyframes toast-exit-animation {
                    from { 
                        opacity: 1; 
                        transform: translateX(0) translateY(0);
                    }
                    to { 
                        opacity: 0; 
                        transform: ${
                            position.includes('right') ? 'translateX(20px)' : 
                            position.includes('left') ? 'translateX(-20px)' : 
                            position.includes('bottom') ? 'translateY(20px)' : 
                            'translateY(-20px)'
                        };
                    }
                }
                .animate-toast-exit {
                    animation: toast-exit-animation 0.3s ease-in forwards;
                }
            `}</style>
        </div>
    );
};

export default ToastNotification;
