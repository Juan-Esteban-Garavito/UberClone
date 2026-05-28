export const formatCurrency = (amount, currency = 'COP') => {
  return `$${amount.toLocaleString('es-CO')} ${currency}`;
};

export const formatDate = (date) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatTime = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
};

export const formatDistance = (meters) => {
  if (meters < 1000) return `${meters}m`;
  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
};