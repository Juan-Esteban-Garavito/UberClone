export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validatePhone = (phone) => {
  return !isNaN(phone) && phone.length >= 7 && phone.length <= 15;
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validateName = (name) => {
  return name.trim().length > 0 && name.trim().length <= 50;
};

export const validateRequired = (value) => {
  return value !== null && value !== undefined && value.toString().trim().length > 0;
};