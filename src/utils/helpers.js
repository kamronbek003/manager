export function parseDDMMYYYY(dateString) {
    if (!dateString) return null;
    const parts = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!parts) return null; 
  
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    const year = parseInt(parts[3], 10);
  
    const date = new Date(Date.UTC(year, month, day));
  
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month &&
      date.getUTCDate() === day
    ) {
      return date; 
    }
  
    return null; 
  }
  
  export function formatDDMMYYYY(date) {
      if (!date) return ''; 
  
      let d;
      if (date instanceof Date) {
          d = date;
      } else {
          d = new Date(date);
      }
  
      if (isNaN(d.getTime())) return '';
  
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0'); 
      const year = d.getUTCFullYear();
  
      return `${day}-${month}-${year}`;
  }
  
  export function formatCurrency(amount, currency = 'UZS', locale = 'uz-UZ') {
      if (typeof amount !== 'number') {
          return '';
      }
      try {
          return new Intl.NumberFormat(locale, {
              style: 'currency',
              currency: currency,
              minimumFractionDigits: 0, 
              maximumFractionDigits: 0, 
          }).format(amount);
      } catch (error) {
          console.error("Error formatting currency:", error);
          return amount.toString(); 
      }
  }
  