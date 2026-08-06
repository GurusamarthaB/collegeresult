import { createContext, useContext, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const container = document.querySelector(".toast-container");
    if (!container) return;
    const icons: Record<ToastType, string> = {
      success: "fa-check-circle",
      error: "fa-times-circle",
      info: "fa-info-circle",
      warning: "fa-exclamation-triangle",
    };
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type]}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = "toastOut 0.3s ease-in forwards";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" />
    </ToastContext.Provider>
  );
}
